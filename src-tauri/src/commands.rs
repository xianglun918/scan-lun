use std::fs;

use tauri::{AppHandle, State};
use tauri_plugin_autostart::ManagerExt;

use crate::db::{self, Db, Record, Settings};
use crate::scheduler::{self, SchedulerTx};

#[tauri::command]
pub fn get_settings(state: State<Db>) -> Settings {
    state.with_conn(|conn| db::get_settings(conn))
}

#[tauri::command]
pub fn save_settings(
    app: AppHandle,
    state: State<Db>,
    scheduler: State<SchedulerTx>,
    settings: Settings,
) -> Result<(), String> {
    state
        .with_conn(|conn| db::save_settings(conn, &settings))
        .map_err(|e| e.to_string())?;

    if settings.autostart {
        let _ = app.autolaunch().enable();
    } else {
        let _ = app.autolaunch().disable();
    }

    scheduler::request_reload(&scheduler.0);
    Ok(())
}

#[tauri::command]
pub fn get_record(state: State<Db>, date: String) -> Result<Option<Record>, String> {
    state
        .with_conn(|conn| db::get_record(conn, &date))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_record(state: State<Db>, date: String, answers: Vec<String>) -> Result<(), String> {
    state
        .with_conn(|conn| db::upsert_record(conn, &date, &answers))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_records(state: State<Db>) -> Result<Vec<Record>, String> {
    state
        .with_conn(|conn| db::list_records(conn))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn export_data(state: State<Db>, path: String, format: String) -> Result<(), String> {
    let (records, settings) = state.with_conn(|conn| {
        let records = db::list_records(conn).map_err(|e| e.to_string())?;
        let settings = db::get_settings(conn);
        Ok::<_, String>((records, settings))
    })?;

    let content = match format.as_str() {
        "markdown" => db::export_markdown(&records, &settings),
        "csv" => db::export_csv(&records, &settings),
        other => return Err(format!("unsupported export format: {other}")),
    };

    fs::write(&path, content).map_err(|e| format!("failed to write {}: {e}", path))
}

#[tauri::command]
pub fn clear_data(state: State<Db>) -> Result<(), String> {
    state
        .with_conn(|conn| db::clear_all(conn))
        .map_err(|e| e.to_string())
}

/// Re-arms the prompt window after a snooze. The window itself closes; after
/// `mins` the backend emits the remind event again.
#[tauri::command]
pub fn snooze_reminder(app: AppHandle, mins: u64) -> Result<(), String> {
    scheduler::schedule_snooze(app, mins);
    Ok(())
}

#[tauri::command]
pub async fn check_update(app: AppHandle) -> Result<crate::updater::UpdateInfo, String> {
    crate::updater::check(&app).await
}

#[tauri::command]
pub async fn install_update(app: AppHandle) -> Result<(), String> {
    crate::updater::download_and_install(&app).await
}

#[tauri::command]
pub fn restart_app(app: AppHandle) -> Result<(), String> {
    app.restart();
}
