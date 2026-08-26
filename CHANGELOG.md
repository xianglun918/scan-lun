# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 规范，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

## [1.0.3] - 2026-08-26

应用内更新真正恢复：显式启用 `tauri-action` 的 `uploadUpdaterSignatures`，修复 v1.0.1 / v1.0.2 latest.json 缺失问题。

### 修复

- **`.sig` 签名文件未上传 → latest.json 未生成**：`tauri-action@v1`（v1.0.0，2026-06 发布）的 `inputs.ts` 用 `core.getBooleanInput('uploadUpdaterSignatures')`，空 input 返回 `false`（**与 README 写的 "default: true" 不符** ——README 文档错，源码实际默认 `false`）。结果：CI build 期间 `uploadAssets` 跳过所有 `.sig` 文件，导致 `uploadVersionJSON` 找不到签名配对，**所有 release 缺 `latest.json`**，应用内更新功能完全不可用。修复：在 `release.yml` 显式设 `uploadUpdaterSignatures: 'true'`。

## [1.0.2] - 2026-08-26

应用内更新恢复：升级 `tauri-action` v0 → v1，修复 latest.json 未生成问题。

### 修复

- **应用内更新不可用（v1.0.1 已知问题）**：`tauri-action@v0`（v0.6.2）与 `tauri-plugin-updater` v2.10.1 兼容问题——CI build 期间 `uploadVersionJSON` 步骤找不到 `*.sig` 配对，跳过 `latest.json` 上传。升级到 `tauri-action@v1`（v1.0.0，2026-06 发布，明确支持 tauri 2 stable）后，签名配对正常工作，release 现已附 `latest.json`。v1.0.2 客户端可在设置页「更新」section 点「检查更新」自动检测到此版本并下载安装。

## [1.0.1] - 2026-08-26

预备版本：上传 1.0.0 → 1.0.1 升级所需的所有二进制包，为后续启用应用内更新铺路。

### 新增

- **多平台安装包**（macOS / Windows / Linux）：3 个平台的 7 个二进制包均已构建并上传，资产完整。
- **签名密钥对**：项目生成并保管了 Tauri updater 用的 minisign 私钥；公钥已写入 `src-tauri/tauri.conf.json` 的 `plugins.updater.pubkey`。
- **中英文双语**：`vue-i18n` 集成，11 个 `settings.update.*` 键已翻译；语言在设置页可即时切换。
- **后端测试套件**：14 个后端单元测试（`cargo test --lib`），覆盖 settings 持久化、跨日判定、upsert 行为、locale 回退等。
- **前端测试套件**：13 个前端单元测试（`vitest run`），覆盖 `today()` 行为与 `useUpdater` composable 的 7 个事件流分支。

### 修复

- **跨日漂移**：弹窗在 23:58 弹出，用户跨到 00:02 才保存时，原代码会把记录存成下一天；现在锁定弹窗打开时的日期。
- **设置页 language 字段**：补加 `language` 持久化字段并默认 `zh-CN`；`template_i18n` 字段追踪模板是否仍为出厂默认。
- **未知 locale 回退**：`settings.language` 读到非法值（如 `klingon`）时回退 `zh-CN`，不会写入数据库。

### 已知问题

- **应用内自动更新暂未启用**：`tauri-action v0` 与 `tauri 2.11.4` 存在兼容问题——CI build 期间会生成 `*.sig` 签名文件，但 tauri-action 的 `uploadVersionJSON` 步骤找不到匹配的 sig，**导致 `latest.json` 未上传到 release**。后果：v1.0.1 客户端**无法通过应用内检查更新功能**找到本 release 的更新元数据。临时解决：用户升级到 1.0.1 需**手动下载**（GitHub release 页下载安装）；应用内更新路径需等后续 release（届时 tauri-action 兼容问题或本项目 tauri 版本需调整）解决。

### 升级说明

> 1.0.0 → 1.0.1 需手动下载安装一次（GitHub Releases 页）。

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

[Unreleased]: https://github.com/xianglun918/scan-lun/compare/v1.0.3...HEAD
[1.0.3]: https://github.com/xianglun918/scan-lun/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/xianglun918/scan-lun/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/xianglun918/scan-lun/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/xianglun918/scan-lun/releases/tag/v1.0.0
