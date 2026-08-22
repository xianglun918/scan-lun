# ADR-0005：全量 Markdown/CSV 导出 + 开机自启持久化

- 状态：已接受
- 日期：2026-08-22

## 背景

历史回看需要可带走的导出；设置里的自启开关需要真正生效并持久化。

## 决策

- **导出**：后端 `export_data(path, format)` 读取全部 records，按当前模板渲染：
  - Markdown：按日期分节，每节逐问输出答案。
  - CSV：首行为 `date,<q1>,<q2>,<q3>`，逐行记录；字段含引号/逗号时按 RFC 引号转义。
  - 保存路径由前端经 `tauri-plugin-dialog` 的 `save()` 选，`std::fs::write` 写入，失败回传错误。
- **自启**：`tauri-plugin-autostart`（macOS `MacosLauncher::LaunchAgent`）。`save_settings` 时同步 enable/disable；启动时读 `settings.autostart` 重新同步一次，保证持久化与系统状态一致。

## 理由

- 导出放后端（Rust 字符串拼接 + fs::write）比前端拼好再写更贴近文件系统，且格式与模板渲染逻辑集中在 db 层。
- autostart 状态以 `settings` 表为准、每次启动重同步，避免「表里开了但系统 LaunchAgent 没建」的漂移。

## 后果

- 导出格式跟随当前模板文案（模板改了，旧记录按新问题渲染，ADR-0002 已注明）。
- 自启依赖系统机制（macOS LaunchAgent）；Windows/Linux 由插件各自实现。
