# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 规范，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 修复

- **提醒路径统一**：此前到点定时器与托盘「立即填写」各有独立弹窗逻辑，存在重复/遗漏提醒的可能；现统一走同一提醒事件，任一入口弹出行为一致。
- **数据库锁健壮性**：内部数据库互斥锁的 11 处直接加解锁改为封装层统一管理（`Db::with_conn`），消除锁泄漏与重复加锁风险，长期运行更稳。
- **落地页下载数据自动更新**：官网下载页版本号与各平台安装包链接改为从 GitHub Release 实时拉取，发版后无需再手动改页面。

### 内部

- 前端 `invoke` 命令名与更新事件名收敛为 `src/constants.ts` 单一常量源，消除「字符串写错、编译期不自知、运行时静默失败」风险。
- 后端提醒判定逻辑抽为纯函数并补 8 个单元测试；前端补 `PromptView` / `useSettings` 视图测试（vitest + happy-dom）。

## [1.0.8] - 2026-08-31

### 新增

- **发布流程自动化**：`scripts/release.mjs` 一键锁步发布——脏树检查 → 版本 bump（`tauri.conf.json` / `package.json` / `Cargo.toml` / `Cargo.lock` 锁步）→ CHANGELOG `Unreleased` 转正 → commit + tag + push。发布流程文档见 `.omo/release-process.md`。
- **CI 自动转正 + 失败清理**：新增 `publish-github-release` job——校验 `latest.json` 覆盖三平台、签名有效、`SHA256SUMS` 存在后才将草稿 Release 转正；任一 job 失败自动删除草稿（保留 tag，可 workflow_dispatch 恢复）。
- **SHA256SUMS**：release 新增资产校验和文件（取自 GitHub 服务端 digest），手动下载用户可校验完整性。

### 修复

- **prompt 窗偶发无法弹出 / 托盘「立即填写」失效**：`prompt` 窗被用户关闭后会被销毁，旧代码仅通过 `get_webview_window` 查找已有窗体并静默忽略 `None`。现在 `tray::show_prompt` 在窗体不存在时按 `tauri.conf.json` 配置重建窗口，确保定时提醒与托盘菜单都能继续弹出。
- **版本锁步漂移**：v1.0.1–v1.0.7 期间仅 `tauri.conf.json` 升至 1.0.7，`package.json` / `Cargo.toml` / `Cargo.lock` 停留在 1.0.0，现已对齐至 1.0.7（对安装包与更新器无影响——二者只读 `tauri.conf.json`）。

## [1.0.7] - 2026-08-26

首个支持应用内自动更新的正式版本。

### 新增

- **应用内更新（macOS）**：`tauri-plugin-updater` 完整接入——开启 `bundle.createUpdaterArtifacts`、重新生成签名密钥对、`latest.json` 由独立的 `publish-updater-json` job 统一生成。macOS 用户可在设置页「更新」section 点「检查更新」自动检测并下载安装。
- **签名密钥轮换**：重新生成 minisign 密钥对（旧密钥密码丢失，无法再签名，故轮换）。

### 已知问题

- **Windows / Linux 应用内更新暂不可用**：`tauri-action v1` 在签名后清理了 Windows 的 `.msi.zip` / `.nsis.zip` 与 Linux 的 `.AppImage.tar.gz` updater bundle，导致 `latest.json` 只有 `darwin` 平台项。Windows / Linux 用户需手动下载安装包（GitHub Releases 页）。macOS 的 `.app.tar.gz` updater bundle 完整可用。

### 升级说明

> 因签名密钥轮换（pubkey 变更），v1.0.0 及更早版本无法通过应用内更新升级，需手动下载 v1.0.7 安装一次。

## [1.0.5] - 2026-08-26

应用内更新真正可用：补上 `tauri.conf.json` 的 `bundle.createUpdaterArtifacts`，让 Tauri 生成 updater bundle（`.zip` / `.tar.gz`）与 `.sig` 签名。

### 修复

- **v1.0.1 ~ v1.0.4 应用内更新仍不可用的真正根因**：`tauri.conf.json` **缺少 `bundle.createUpdaterArtifacts: true`**。Tauri 2 的 bundler 只有在开启该配置时才会生成 updater 用的 `.zip` / `.tar.gz` 包和 `.sig` 签名文件。没有它们，`latest.json` 的 `platforms` 无法填充——无论 tauri-action 版本如何（v0 / v1），release 都不会有可用的更新元数据。修复后 `tauri build` 自动生成签名 bundle，release 的 `latest.json` 可由 tauri-action 或自建的 `scripts/build-latest-json.mjs` 生成并上传。v1.0.5 客户端在设置页「更新」section 点「检查更新」即可自动检测并下载安装。

## [1.0.4] - 2026-08-26

应用内更新最终修复：绕过 tauri-action 的 `latest.json` 生成 bug，改为 release 构建后自建上传。

### 修复

- **应用内更新仍不可用（v1.0.1 ~ v1.0.3 已知问题）**：根因不是 tauri-action 版本，而是 `tauri-action` 的 `buildProject()` 用 `existsSync()` 在 `.zip` / `.sig` 文件生成前就过滤了 artifacts，导致 `uploadVersionJSON` 永远拿不到签名配对，`latest.json` 永不生成。**v0 和 v1 都有此 bug**（scan-lun v1.0.0 release 也没有 `latest.json`）。修复：在 `release.yml` 的 tauri-action 步骤后新增「Upload updater JSON」步骤，用 `scripts/build-latest-json.mjs` 读取构建产物中的 `.sig` 文件、合并各平台签名与下载 URL、构造 `latest.json` 并上传。v1.0.4 客户端在设置页「更新」section 点「检查更新」即可自动检测并下载安装。

## [1.0.3] - 2026-08-26

应用内更新恢复：显式启用 `tauri-action` 的 `uploadUpdaterSignatures`，修复 v1.0.1 / v1.0.2 latest.json 缺失问题。

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

[Unreleased]: https://github.com/xianglun918/scan-lun/compare/v1.0.8...HEAD
[1.0.8]: https://github.com/xianglun918/scan-lun/compare/v1.0.7...v1.0.8
[1.0.7]: https://github.com/xianglun918/scan-lun/compare/v1.0.0...v1.0.7
[1.0.5]: https://github.com/xianglun918/scan-lun/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/xianglun918/scan-lun/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/xianglun918/scan-lun/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/xianglun918/scan-lun/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/xianglun918/scan-lun/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/xianglun918/scan-lun/releases/tag/v1.0.0
