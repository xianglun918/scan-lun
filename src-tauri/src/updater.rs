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

pub fn check(_app: &AppHandle) -> Result<UpdateInfo, String> {
    // 占位：Task 3 替换
    Err("not yet implemented".into())
}

pub fn download_and_install(_app: &AppHandle) -> Result<(), String> {
    // 占位：Task 4 替换
    Err("not yet implemented".into())
}

pub fn start_background_loop(_app: AppHandle) {
    // 占位：Task 5 替换
}

#[cfg(test)]
mod tests {
    use super::*;

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
