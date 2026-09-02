use std::time::Duration;

use chrono::{DateTime, Datelike, Local, TimeZone, Weekday};
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::mpsc;
use tokio::time::sleep;

use crate::db;

pub enum SchedulerMsg {
    Reload,
}

pub const REMIND_EVENT: &str = "scan-lun://remind";

/// Spawns the daily reminder loop. `rx` receives Reload messages whenever
/// settings change so the next trigger time is recomputed immediately.
pub fn start(app: AppHandle, mut rx: mpsc::Receiver<SchedulerMsg>) {
    tauri::async_runtime::spawn(async move {
        loop {
            let settings = {
                let state = app.state::<db::Db>();
                state.with_conn(|conn| db::get_settings(conn))
            };

            let delay = next_trigger_delay(&settings.trigger_time, Local::now());
            let slp = sleep(delay);
            tokio::pin!(slp);

            tokio::select! {
                _ = &mut slp => {
                    if should_remind(&app, Local::now()) {
                        let _ = app.emit(REMIND_EVENT, ());
                    }
                }
                msg = rx.recv() => {
                    match msg {
                        Some(SchedulerMsg::Reload) => continue,
                        None => break,
                    }
                }
            }
        }
    });
}

/// Holds the scheduler's reload channel so commands can poke it.
pub struct SchedulerTx(pub mpsc::Sender<SchedulerMsg>);

/// Sends a Reload so the scheduler picks up the new trigger time / workdays flag.
pub fn request_reload(tx: &mpsc::Sender<SchedulerMsg>) {
    let _ = tx.try_send(SchedulerMsg::Reload);
}

/// Fires the remind event again after `mins` minutes (used by snooze).
pub fn schedule_snooze(app: AppHandle, mins: u64) {
    tauri::async_runtime::spawn(async move {
        sleep(Duration::from_secs(mins * 60)).await;
        let _ = app.emit(REMIND_EVENT, ());
    });
}

fn should_remind(app: &AppHandle, now: DateTime<Local>) -> bool {
    let state = app.state::<db::Db>();
    let (answered, workdays_only) = state.with_conn(|conn| {
        let answered = db::today_answered(conn).unwrap_or(false);
        let workdays_only = db::get_settings(conn).workdays_only;
        (answered, workdays_only)
    });
    should_fire(answered, workdays_only, now)
}

/// Pure reminder decision: fire only when today is unanswered and (workdays-only
/// is off OR today is a weekday). Kept separate from the DB read so the firing
/// rule is unit-testable with an injected clock.
fn should_fire(answered_today: bool, workdays_only: bool, now: DateTime<Local>) -> bool {
    if answered_today {
        return false;
    }
    if workdays_only && matches!(now.weekday(), Weekday::Sat | Weekday::Sun) {
        return false;
    }
    true
}

/// Duration until the next trigger instant. If today's time already passed,
/// targets tomorrow — the app never back-fires a reminder after the fact.
fn next_trigger_delay(trigger_time: &str, now: DateTime<Local>) -> Duration {
    let (h, m) = parse_time(trigger_time);
    let today = now.date_naive();
    let tomorrow = today + chrono::Days::new(1);

    let today_target = Local
        .with_ymd_and_hms(today.year(), today.month(), today.day(), h, m, 0)
        .single();
    let tomorrow_target = Local
        .with_ymd_and_hms(tomorrow.year(), tomorrow.month(), tomorrow.day(), h, m, 0)
        .single();

    let next = match today_target {
        Some(t) if t > now => t,
        _ => tomorrow_target.unwrap_or(now),
    };

    let secs = (next - now).num_seconds().max(1) as u64;
    Duration::from_secs(secs)
}

fn parse_time(s: &str) -> (u32, u32) {
    let mut parts = s.split(':');
    let h = parts.next().and_then(|v| v.trim().parse().ok()).unwrap_or(18);
    let m = parts.next().and_then(|v| v.trim().parse().ok()).unwrap_or(0);
    (h.min(23), m.min(59))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn dt(y: i32, mo: u32, d: u32, h: u32, mi: u32) -> DateTime<Local> {
        Local.with_ymd_and_hms(y, mo, d, h, mi, 0).single().unwrap()
    }

    // 2026-01-02 is a Friday; 2026-01-03 Saturday; 2026-01-04 Sunday.

    #[test]
    fn should_fire_on_unanswered_weekday() {
        assert!(should_fire(false, true, dt(2026, 1, 2, 18, 0)));
    }

    #[test]
    fn should_not_fire_when_already_answered() {
        assert!(!should_fire(true, false, dt(2026, 1, 2, 18, 0)));
    }

    #[test]
    fn should_not_fire_on_weekend_when_workdays_only() {
        assert!(!should_fire(false, true, dt(2026, 1, 3, 18, 0)));
        assert!(!should_fire(false, true, dt(2026, 1, 4, 18, 0)));
    }

    #[test]
    fn should_fire_on_weekend_when_workdays_only_off() {
        assert!(should_fire(false, false, dt(2026, 1, 3, 18, 0)));
    }

    #[test]
    fn next_trigger_delay_targets_today_when_trigger_is_future() {
        let now = dt(2026, 9, 3, 17, 0);
        assert_eq!(next_trigger_delay("18:00", now), Duration::from_secs(3600));
    }

    #[test]
    fn next_trigger_delay_targets_tomorrow_when_trigger_passed() {
        let now = dt(2026, 9, 3, 18, 30);
        assert_eq!(
            next_trigger_delay("18:00", now),
            Duration::from_secs(84600)
        );
    }

    #[test]
    fn next_trigger_delay_at_exact_instant_targets_tomorrow() {
        let now = dt(2026, 9, 3, 18, 0);
        assert_eq!(
            next_trigger_delay("18:00", now),
            Duration::from_secs(86400)
        );
    }

    #[test]
    fn next_trigger_delay_defaults_to_1800_on_bad_input() {
        let now = dt(2026, 9, 3, 17, 0);
        assert_eq!(
            next_trigger_delay("not-a-time", now),
            Duration::from_secs(3600)
        );
    }
}
