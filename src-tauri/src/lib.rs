mod commands;
mod db;
mod scheduler;
mod updater;
mod tray;

use std::sync::Mutex;

use tauri::{Listener, Manager};
use tauri_plugin_autostart::ManagerExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let handle = app.handle().clone();

            let app_data_dir = handle.path().app_data_dir()?;
            let conn = db::init(&app_data_dir)?;
            handle.manage(db::Db(Mutex::new(conn)));

            let (tx, rx) = tokio::sync::mpsc::channel(8);
            handle.manage(scheduler::SchedulerTx(tx));
            scheduler::start(handle.clone(), rx);

            tray::build(&handle)?;

            // Apply the persisted autostart flag on startup.
            let settings = {
                let state = handle.state::<db::Db>();
                let conn = state.0.lock().expect("db lock poisoned");
                db::get_settings(&conn)
            };
            if settings.autostart {
                let _ = handle.autolaunch().enable();
            } else {
                let _ = handle.autolaunch().disable();
            }

            let reminder_handle = handle.clone();
            handle.listen(scheduler::REMIND_EVENT, move |_| {
                tray::show_prompt(&reminder_handle);
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == tray::MAIN_LABEL {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_settings,
            commands::save_settings,
            commands::get_record,
            commands::save_record,
            commands::list_records,
            commands::export_data,
            commands::clear_data,
            commands::today_status,
            commands::snooze_reminder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
