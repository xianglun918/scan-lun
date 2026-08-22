use std::time::Duration;

use chrono::{Datelike, Local, TimeZone, Weekday};
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
                let conn = state.0.lock().expect("db lock poisoned");
                db::get_settings(&conn)
            };

            let delay = next_trigger_delay(&settings.trigger_time);
            let slp = sleep(delay);
            tokio::pin!(slp);

            tokio::select! {
                _ = &mut slp => {
                    if should_remind(&app) {
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

fn should_remind(app: &AppHandle) -> bool {
    let state = app.state::<db::Db>();
    let conn = state.0.lock().expect("db lock poisoned");
    let settings = db::get_settings(&conn);

    if db::today_answered(&conn).unwrap_or(false) {
        return false;
    }

    if settings.workdays_only {
        let weekday = Local::now().weekday();
        if matches!(weekday, Weekday::Sat | Weekday::Sun) {
            return false;
        }
    }

    true
}

/// Duration until the next trigger instant. If today's time already passed,
/// targets tomorrow — the app never back-fires a reminder after the fact.
fn next_trigger_delay(trigger_time: &str) -> Duration {
    let (h, m) = parse_time(trigger_time);
    let now = Local::now();
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
