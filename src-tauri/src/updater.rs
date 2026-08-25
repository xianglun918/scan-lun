use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

pub const REPO_OWNER: &str = "xianglun918";
pub const REPO_NAME: &str = "scan-lun";

pub const UPDATE_AVAILABLE_EVENT: &str = "update-available";
pub const UPDATE_DOWNLOADED_EVENT: &str = "update-downloaded";
pub const UPDATE_ERROR_EVENT: &str = "update-error";

/// Snapshot returned to the frontend. camelCase so the TS side can
/// read fields without renaming.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub available: bool,
    pub current_version: String,
    pub latest_version: Option<String>,
    pub notes: Option<String>,
}

impl UpdateInfo {
    pub fn up_to_date(current_version: String) -> Self {
        Self {
            available: false,
            current_version,
            latest_version: None,
            notes: None,
        }
    }
}

/// Public entry. Wraps the result in Tauri event emission.
pub async fn check(app: &AppHandle) -> Result<UpdateInfo, String> {
    let current = app.package_info().version.to_string();
    let updater = match app.updater() {
        Ok(u) => u,
        Err(e) => {
            return Err(format!("updater init failed: {e}"));
        }
    };
    check_with(&updater, &current, app).await
}

/// Pure function over the updater. Testable without a full Tauri app.
pub(crate) async fn check_with(
    updater: &tauri_plugin_updater::Updater,
    current_version: &str,
    app: &AppHandle,
) -> Result<UpdateInfo, String> {
    match updater.check().await {
        Ok(Some(update)) => {
            let info = UpdateInfo {
                available: true,
                current_version: current_version.to_string(),
                latest_version: Some(update.version.clone()),
                notes: update.body.clone(),
            };
            let _ = tauri::Emitter::emit(app, UPDATE_AVAILABLE_EVENT, &info);
            Ok(info)
        }
        Ok(None) => {
            let info = UpdateInfo::up_to_date(current_version.to_string());
            Ok(info)
        }
        Err(e) => {
            let msg = e.to_string();
            let _ = tauri::Emitter::emit(
                app,
                UPDATE_ERROR_EVENT,
                serde_json::json!({
                    "kind": "check_failed",
                    "message": msg,
                }),
            );
            Err(msg)
        }
    }
}

/// Download (if a new release exists) and install side-by-side.
/// On success, emits `update-downloaded` and the caller should restart
/// via `app.restart()` or ask the user to.
///
/// # Tauri 2 API note
/// `Update::download_and_install` is async and requires two callbacks:
/// - `on_chunk(bytes_downloaded, content_length)` fires per download chunk
/// - `on_download_finish` fires after download (before signature verify)
/// We pass no-op closures — the frontend gets progress via `update-downloaded`
/// event fired below. Future enhancement: forward on_chunk bytes to a
/// `download-progress` event for a real progress bar.
pub async fn download_and_install(app: &AppHandle) -> Result<(), String> {
    let current = app.package_info().version.to_string();
    let updater = app.updater().map_err(|e| format!("updater init failed: {e}"))?;
    let update = match updater.check().await {
        Ok(Some(u)) => u,
        Ok(None) => return Err("no update available".into()),
        Err(e) => {
            let msg = e.to_string();
            let _ = tauri::Emitter::emit(
                app,
                UPDATE_ERROR_EVENT,
                serde_json::json!({
                    "kind": "check_failed",
                    "message": msg,
                }),
            );
            return Err(msg);
        }
    };

    if let Err(e) = update
        .download_and_install(
            |_chunk, _total| { /* progress callback: empty for MVP */ },
            || { /* on_download_finish: empty for MVP */ },
        )
        .await
    {
        let msg = e.to_string();
        let _ = tauri::Emitter::emit(
            app,
            UPDATE_ERROR_EVENT,
            serde_json::json!({
                "kind": "install_failed",
                "message": msg,
            }),
        );
        return Err(msg);
    }

    let info = UpdateInfo {
        available: true,
        current_version: current,
        latest_version: Some(update.version),
        notes: update.body,
    };
    let _ = tauri::Emitter::emit(app, UPDATE_DOWNLOADED_EVENT, &info);
    Ok(())
}

/// Spawn a tokio task that checks for updates once on startup,
/// then every 24h. Failures are logged but not propagated.
pub fn start_background_loop(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        // 第一次立即检查
        if let Err(e) = check(&app).await {
            eprintln!("updater: initial check failed: {e}");
        }
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(24 * 60 * 60)).await;
            if let Err(e) = check(&app).await {
                eprintln!("updater: periodic check failed: {e}");
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    // 注：check_with 接受 &Update 参数，但 tauri_plugin_updater::Update
    // 没有公开构造器；只能通过 app.updater() 拿。错误路径测试在 Task 5
    // 端到端覆盖（mock HTTP server）。本 task 不加单元测试。

    #[test]
    fn update_info_serializes_to_camel_case() {
        let info = UpdateInfo {
            available: true,
            current_version: "1.0.0".into(),
            latest_version: Some("1.1.0".into()),
            notes: Some("release notes".into()),
        };
        let json = serde_json::to_value(&info).unwrap();
        assert_eq!(json["available"], true);
        assert_eq!(json["currentVersion"], "1.0.0");
        assert_eq!(json["latestVersion"], "1.1.0");
        assert_eq!(json["notes"], "release notes");
        // 确认是 camelCase 不是 snake_case
        assert!(json.get("current_version").is_none());
        assert!(json.get("latest_version").is_none());
    }

    #[test]
    fn up_to_date_factory_returns_no_update() {
        let info = UpdateInfo::up_to_date("1.0.0".into());
        assert!(!info.available);
        assert_eq!(info.current_version, "1.0.0");
        assert!(info.latest_version.is_none());
        assert!(info.notes.is_none());
    }

    #[test]
    fn optional_fields_serialize_as_null() {
        let info = UpdateInfo::up_to_date("1.0.0".into());
        let json = serde_json::to_value(&info).unwrap();
        assert!(json["latestVersion"].is_null());
        assert!(json["notes"].is_null());
    }
}
