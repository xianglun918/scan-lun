# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 规范，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

## [1.0.1] - 2026-08-26

应用内更新检查与一键安装（基于 Tauri 2 官方 `tauri-plugin-updater`）。

### 新增

- **应用内检查更新**：主窗口设置页新增「更新」section；启动时静默检查一次 + 每 24h 后台轮询一次。
- **一键安装更新**：检测到新版本后用户点「立即更新」即可下载 + 安装 + 重启，全程在应用内完成。
- **启动时 i18n 同步**：主窗口与 prompt 窗的界面语言在每次启动时按 `settings.language` 对齐（修复之前跨 webview 上下文不同步的问题）。
- **语言切换即时生效**：在设置里切语言后无需点保存，UI 立即变。
- **中英文双语**：新增英文界面（`en-US`），语言在设置里可选。
- **跨天日期锁定**：prompt 窗打开时锁定"今天"，避免弹窗跨到零点后保存错位（修复之前偶发的"今天没填过却提示已填"）。
- **后端测试套件**：14 个后端单元测试（`cargo test --lib`），覆盖 settings 持久化、跨日判定、upsert 行为、locale 回退等。
- **前端测试套件**：13 个前端单元测试（`vitest run`），覆盖 `today()` 行为与 `useUpdater` composable 的 7 个事件流分支。

### 修复

- **跨日漂移**：弹窗在 23:58 弹出，用户跨到 00:02 才保存时，原代码会把记录存成下一天；现在锁定弹窗打开时的日期。
- **设置页 language 字段**：补加 `language` 持久化字段并默认 `zh-CN`；`template_i18n` 字段追踪模板是否仍为出厂默认。
- **未知 locale 回退**：`settings.language` 读到非法值（如 `klingon`）时回退 `zh-CN`，不会写入数据库。

### 升级说明

> 1.0.0 用户需手动下载 1.0.1 安装一次——1.0.0 release 没有签名 `latest.json`，应用内自动更新路径从 1.0.1 起可用。

## [1.0.0] - 2026-08-23

首个公开发布版本。

### 新增

- **每日定时提醒**：到点自动弹出固定三问表单，无边框置顶并抢焦点；已答当天不重复打扰。
- **三问自省表单**：【保存】/【稍后提醒 1 小时】/【跳过】三键交互；问题文案可在设置页自定义（默认职场三省模板）。
- **后台托盘常驻**：macOS 菜单栏镂空笔记本模板图标，随明暗主题自适应；菜单提供「打开 / 立即填写 / 退出」。
- **本地 SQLite 存储**：明文存储，数据完全留在本机，不上传、不联网。
- **历史回看**：按日期倒序展开查看往期记录。
- **Markdown / CSV 导出**：在历史页一键导出全量数据，保存路径自选。
- **设置项**：每日触发时间、仅工作日提醒、开机自启、三省模板、清除全部数据。

### 平台

- macOS（Apple Silicon + Intel，universal dmg）
- Windows（x64 setup exe / msi）
- Linux（AppImage / deb / rpm）

[Unreleased]: https://github.com/xianglun918/scan-lun/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/xianglun918/scan-lun/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/xianglun918/scan-lun/releases/tag/v1.0.0
