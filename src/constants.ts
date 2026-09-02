/**
 * Tauri 命令名常量 —— 前端侧单一事实来源。
 *
 * 这些字符串必须与 `src-tauri/src/commands.rs` 中 `#[tauri::command]` 标注的
 * Rust 函数名一一对应：Tauri 2 会把 snake_case 函数名自动映射为同名命令字符串。
 * 任何一侧改名若不同步，运行时 invoke 才会静默失败（编译期无法发现）。
 *
 * 规则：前端所有 `invoke(...)` 调用必须引用这里的常量，禁止内联字符串字面量。
 */

export const CMD_GET_SETTINGS = "get_settings" as const;
export const CMD_SAVE_SETTINGS = "save_settings" as const;
export const CMD_GET_RECORD = "get_record" as const;
export const CMD_SAVE_RECORD = "save_record" as const;
export const CMD_LIST_RECORDS = "list_records" as const;
export const CMD_EXPORT_DATA = "export_data" as const;
export const CMD_CLEAR_DATA = "clear_data" as const;
export const CMD_SNOOZE_REMINDER = "snooze_reminder" as const;
export const CMD_CHECK_UPDATE = "check_update" as const;
export const CMD_INSTALL_UPDATE = "install_update" as const;
export const CMD_RESTART_APP = "restart_app" as const;

/**
 * Tauri 事件名常量。
 *
 * 对应 `src-tauri/src/updater.rs` 中的 UPDATE_AVAILABLE_EVENT /
 * UPDATE_DOWNLOADED_EVENT / UPDATE_ERROR_EVENT 常量。
 */
export const EVT_UPDATE_AVAILABLE = "update-available" as const;
export const EVT_UPDATE_DOWNLOADED = "update-downloaded" as const;
export const EVT_UPDATE_ERROR = "update-error" as const;
