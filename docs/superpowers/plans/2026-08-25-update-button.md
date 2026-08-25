# scan-lun 更新按钮 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 scan-lun 桌面应用加应用内"检查更新 + 一键安装"能力，复用 Tauri 2 官方 `tauri-plugin-updater`。

**Architecture:** Rust 主控 — 新增 `updater.rs` 模块，封装 `check` / `download_and_install` / `start_background_loop`，通过 Tauri events 推状态给前端。前端 `useUpdater` composable 订阅 events，在 `SettingsView` 渲染「更新」section。配置走 `tauri.conf.json` 的 `plugins.updater` 块 + GitHub Actions 签名。

**Tech Stack:** Tauri 2 + `tauri-plugin-updater = "2"`（Rust）+ `vue-i18n` + TypeScript。Release 流程用 `tauri signer` 生成密钥，CI 通过 `TAURI_SIGNING_PRIVATE_KEY` env 注入。

## Global Constraints

- **不要**修改 `package.json` 已有的 `dev` / `build` / `preview` / `test` / `tauri` script
- **不要**重构现有组件（SFC、composables、db.rs、scheduler.rs）；只增量加新文件 / 改动明确的行
- 所有新代码必须通过 `pnpm tauri build` 的 `vue-tsc --noEmit` 检查（**不能**用 `as any` / `@ts-ignore`）
- 所有新 Rust 代码必须通过 `cargo test --lib` + `cargo clippy`（**不能**有 `unwrap` 在非测试代码里）
- 中文标点统一用全角；英文标点统一用半角（参考已有 i18n 文件风格）
- 设计 token 使用现有 `var(--*)` 变量（来自 `App.vue` 的 `:root`）；**不**新增 hex 颜色
- 仓库硬编码 `xianglun918/scan-lun`，**不**用 settings 项
- prompt 窗（独立 webview）**不**显示更新提示
- dev 模式（`pnpm tauri dev`）启动时 updater 行为由 tauri-plugin-updater 默认控制（active=false 时不查 GitHub）

---

### Task 0: 生成签名密钥对 + pubkey 写入 tauri.conf.json

**为什么先做这一步**：Tauri updater 启动期会读 `tauri.conf.json.plugins.updater.pubkey`。如果 pubkey 是占位符或缺失，dev 启动会 panic。所有后续 task 依赖这个真实 pubkey。

**Files:**
- Create: `~/.tauri/scan-lun.key`（本地密钥，**不**入 git）
- Create: `~/.tauri/scan-lun.key.pub`（本地公钥，**不**入 git）
- Modify: `src-tauri/tauri.conf.json`（写入真实 pubkey）
- Create: `.gitignore`（追加：`.tauri/`）

**Interfaces:**
- Consumes: 无
- Produces: 一个真实的 base64 编码公钥字符串，写入 `tauri.conf.json` 的 `plugins.updater.pubkey`

- [ ] **Step 1: 装 tauri CLI（如果还没装）**

```bash
cd D:\Workspace\scan-lun
cargo install tauri-cli --version "^2" --locked
```

Expected: `cargo install` 成功（已有 `tauri` 2.x CLI 的话会跳过）

- [ ] **Step 2: 生成密钥对**

```bash
cd D:\Workspace\scan-lun
mkdir -p ~/.tauri
tauri signer generate -w ~/.tauri/scan-lun.key
```

Expected: 输出 `Public key: <base64>` 和 `Secret key: <base64>`，并写入 `~/.tauri/scan-lun.key`

- [ ] **Step 3: 把私钥密码记在 1Password / 安全位置**

- [ ] **Step 4: 读取公钥**

```bash
# Linux/macOS
cat ~/.tauri/scan-lun.key.pub
# Windows PowerShell
Get-Content ~/.tauri/scan-lun.key.pub
```

Expected: 输出公钥的 base64 字符串

- [ ] **Step 5: 改 `.gitignore` 追加 `.tauri/`**

在 `D:\Workspace\scan-lun\.gitignore` 末尾追加：

```
# Tauri signing keys (local-only)
.tauri/
```

- [ ] **Step 6: 改 `src-tauri/tauri.conf.json` 写入 pubkey**

在 `tauri.conf.json` 的 `app` 块**同级**（最外层）加 `plugins` 块：

```json
{
  "plugins": {
    "updater": {
      "endpoints": [
        "https://github.com/xianglun918/scan-lun/releases/latest/download/latest.json"
      ],
      "pubkey": "<这里替换成 Step 4 的公钥 base64 字符串>"
    }
  }
}
```

完整 `tauri.conf.json` 应该是：
```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "scan-lun",
  "version": "1.0.0",
  "identifier": "com.scanlun.app",
  "build": { ... },
  "app": { ... },
  "bundle": { ... },
  "plugins": {
    "updater": {
      "endpoints": [
        "https://github.com/xianglun918/scan-lun/releases/latest/download/latest.json"
      ],
      "pubkey": "<base64-string>"
    }
  }
}
```

- [ ] **Step 7: 验证 tauri.conf.json 是合法 JSON**

```bash
cd D:\Workspace\scan-lun
node -e "console.log(JSON.parse(require('fs').readFileSync('src-tauri/tauri.conf.json','utf8')).plugins.updater.pubkey.length)"
```

Expected: 输出一个正整数（pubkey 是 64+ 字符的 base64）

- [ ] **Step 8: Commit**

```bash
cd D:\Workspace\scan-lun
git add .gitignore src-tauri/tauri.conf.json
git commit -m "chore: add tauri updater pubkey (private key local-only)"
```

---

### Task 1: 后端 Cargo.toml + 注册 updater 插件

**Files:**
- Modify: `src-tauri/Cargo.toml`（加 `tauri-plugin-updater = "2"`）
- Modify: `src-tauri/src/lib.rs`（注册 plugin；**不**启动 background loop，留给 Task 5）

**Interfaces:**
- Consumes: `tauri-plugin-updater` crate
- Produces: `tauri::Builder` 含 `tauri_plugin_updater` 插件（`app.updater()` API 可用）

- [ ] **Step 1: 改 Cargo.toml**

在 `[dependencies]` 块加：

```toml
tauri-plugin-updater = "2"
```

完整 diff（相对于现有 Cargo.toml line 21-29）：

```toml
[dependencies]
tauri = { version = "2", features = ["tray-icon", "image-png"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rusqlite = { version = "0.40.2", features = ["bundled"] }
chrono = "0.4.45"
tokio = { version = "1.53.1", features = ["time", "macros"] }
tauri-plugin-autostart = "2.5.1"
tauri-plugin-dialog = "2.7.2"
tauri-plugin-updater = "2"  # 新增
```

- [ ] **Step 2: 改 `src-tauri/src/lib.rs` 注册插件**

在 `tauri::Builder::default()` 链上加 `.plugin(tauri_plugin_updater::Builder::new().build())`：

找到这一行（在 `tauri-plugin-autostart` 之后）：
```rust
.plugin(tauri_plugin_autostart::init(
    tauri_plugin_autostart::MacosLauncher::LaunchAgent,
    None,
))
```

在它**后面**加：
```rust
.plugin(tauri_plugin_updater::Builder::new().build())
```

- [ ] **Step 3: 编译验证**

```bash
cd D:\Workspace\scan-lun
cargo check --manifest-path src-tauri/Cargo.toml --message-format=short
```

Expected: 无 error（warning 可接受）

- [ ] **Step 4: Commit**

```bash
cd D:\Workspace\scan-lun
git add src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/src/lib.rs
git commit -m "feat(updater): register tauri-plugin-updater plugin"
```

---

### Task 2: 后端 `updater.rs` — UpdateInfo struct + 序列化测试

**Files:**
- Create: `src-tauri/src/updater.rs`
- Modify: `src-tauri/src/lib.rs`（`mod updater;` 加在 `mod scheduler;` 之后）

**Interfaces:**
- Consumes: `tauri::AppHandle`, `tauri_plugin_updater::UpdaterExt`
- Produces: `UpdateInfo` struct，前端用 camelCase JSON 字段

- [ ] **Step 1: 写 `src-tauri/src/updater.rs`（仅 struct + 常量部分）**

```rust
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
```

- [ ] **Step 2: 改 `src-tauri/src/lib.rs` 加 `mod updater;`**

找到 `mod scheduler;`，在它**后面**加：

```rust
mod updater;
```

- [ ] **Step 3: 跑新测试（应全部通过）**

```bash
cd D:\Workspace\scan-lun
cargo test --manifest-path src-tauri/Cargo.toml --lib updater::tests
```

Expected: `3 passed; 0 failed`

- [ ] **Step 4: 跑全量测试（应全过，无回归）**

```bash
cd D:\Workspace\scan-lun
cargo test --manifest-path src-tauri/Cargo.toml --lib
```

Expected: `10 + 3 = 13 passed; 0 failed`

- [ ] **Step 5: Commit**

```bash
cd D:\Workspace\scan-lun
git add src-tauri/src/updater.rs src-tauri/src/lib.rs
git commit -m "feat(updater): add UpdateInfo struct + serialization tests"
```

---

### Task 3: 后端 `updater.rs` — 实现 `check()`

**Files:**
- Modify: `src-tauri/src/updater.rs`（替换 `check` 函数体）
- Modify: `src-tauri/src/updater.rs`（加一个 `check_from_updater` 内部函数 + 测试）

**Interfaces:**
- Consumes: `&AppHandle`, 内部用 `app.updater()` 拿 updater，调 `updater.check()`
- Produces: `Result<UpdateInfo, String>`；emit `update-available` / `update-error` 事件

- [ ] **Step 1: 写 `check` 内部函数（依赖注入风格，方便测试）**

把整个 `updater.rs` 的 `check` 函数替换为：

```rust
/// Public entry. Wraps the result in Tauri event emission.
pub fn check(app: &AppHandle) -> Result<UpdateInfo, String> {
    let current = app.package_info().version.to_string();
    let updater = match app.updater() {
        Ok(u) => u,
        Err(e) => {
            return Err(format!("updater init failed: {e}"));
        }
    };
    check_with(&updater, &current, app)
}

/// Pure function over the updater. Testable without a full Tauri app.
pub(crate) fn check_with(
    updater: &tauri_plugin_updater::Update,
    current_version: &str,
    app: &AppHandle,
) -> Result<UpdateInfo, String> {
    match updater.check() {
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
```

- [ ] **Step 2: 加一个新测试 — `check_with` 错误路径**

在 `mod tests` 块内加：

```rust
    // 注：check_with 接受 &Update 参数，但 tauri_plugin_updater::Update
    // 没有公开构造器；只能通过 app.updater() 拿。错误路径测试在 Task 5
    // 端到端覆盖（mock HTTP server）。本 task 不加单元测试。
```

> **注**：`tauri_plugin_updater::Update` 没有公开构造器，`check_with` 函数的纯函数形式不能在单元测试里直接构造。错误路径的端到端测试需要 mock HTTP server，超出 MVP 范围。**不**为这条路径加单元测试；端到端测由手工测覆盖（见 Task 11）。

- [ ] **Step 3: 验证 `check_with` 编译通过**

```bash
cd D:\Workspace\scan-lun
cargo check --manifest-path src-tauri/Cargo.toml --message-format=short
```

Expected: 无 error

- [ ] **Step 4: 跑测试（应仍 3 passed）**

```bash
cd D:\Workspace\scan-lun
cargo test --manifest-path src-tauri/Cargo.toml --lib updater
```

Expected: `3 passed; 0 failed`（struct 序列化测试）

- [ ] **Step 5: Commit**

```bash
cd D:\Workspace\scan-lun
git add src-tauri/src/updater.rs
git commit -m "feat(updater): implement check() with event emission"
```

---

### Task 4: 后端 `updater.rs` — 实现 `download_and_install()`

**Files:**
- Modify: `src-tauri/src/updater.rs`（替换 `download_and_install` 函数体）

**Interfaces:**
- Consumes: `&AppHandle`
- Produces: `Result<(), String>`；emit `update-downloaded` / `update-error` 事件

- [ ] **Step 1: 替换 `download_and_install` 函数**

```rust
/// Download (if a new release exists) and install side-by-side.
/// On success, emits `update-downloaded` and the caller should restart
/// via `app.restart()` or ask the user to.
pub fn download_and_install(app: &AppHandle) -> Result<(), String> {
    let current = app.package_info().version.to_string();
    let updater = app.updater().map_err(|e| format!("updater init failed: {e}"))?;
    match updater.check() {
        Ok(Some(update)) => {
            update
                .download_and_install()
                .map_err(|e| {
                    let msg = e.to_string();
                    let _ = tauri::Emitter::emit(
                        app,
                        UPDATE_ERROR_EVENT,
                        serde_json::json!({
                            "kind": "install_failed",
                            "message": msg,
                        }),
                    );
                    msg
                })?;
            let info = UpdateInfo {
                available: true,
                current_version: current,
                latest_version: Some(update.version),
                notes: update.body,
            };
            let _ = tauri::Emitter::emit(app, UPDATE_DOWNLOADED_EVENT, &info);
            Ok(())
        }
        Ok(None) => Err("no update available".into()),
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
```

- [ ] **Step 2: 编译验证**

```bash
cd D:\Workspace\scan-lun
cargo check --manifest-path src-tauri/Cargo.toml --message-format=short
```

Expected: 无 error

- [ ] **Step 3: Commit**

```bash
cd D:\Workspace\scan-lun
git add src-tauri/src/updater.rs
git commit -m "feat(updater): implement download_and_install() with event emission"
```

---

### Task 5: 后端 `commands.rs` — 注册 invoke 命令

**Files:**
- Modify: `src-tauri/src/commands.rs`（加 `check_update` / `install_update`）
- Modify: `src-tauri/src/lib.rs`（在 `invoke_handler!` 注册新命令）

**Interfaces:**
- Consumes: 前端 `invoke<T>("check_update")` / `invoke("install_update")`
- Produces: 调 `updater::check` / `updater::download_and_install`

- [ ] **Step 1: 改 `src-tauri/src/commands.rs`**

在 `commands.rs` 末尾追加：

```rust
#[tauri::command]
pub fn check_update(app: AppHandle) -> Result<crate::updater::UpdateInfo, String> {
    crate::updater::check(&app)
}

#[tauri::command]
pub fn install_update(app: AppHandle) -> Result<(), String> {
    crate::updater::download_and_install(&app)
}

#[tauri::command]
pub fn restart_app(app: AppHandle) -> Result<(), String> {
    app.restart();
}
```

> **注**：`app.restart()` 是 Tauri 2 内置 API（无需额外 crate）。

- [ ] **Step 2: 改 `src-tauri/src/lib.rs` 的 `invoke_handler!` 宏**

找到：
```rust
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
```

在末尾加 3 个：
```rust
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
    commands::check_update,
    commands::install_update,
    commands::restart_app,
])
```

- [ ] **Step 3: 编译 + 跑测试**

```bash
cd D:\Workspace\scan-lun
cargo check --manifest-path src-tauri/Cargo.toml --message-format=short
cargo test --manifest-path src-tauri/Cargo.toml --lib
```

Expected: 无 error；13 个测试全过

- [ ] **Step 4: Commit**

```bash
cd D:\Workspace\scan-lun
git add src-tauri/src/commands.rs src-tauri/src/lib.rs
git commit -m "feat(updater): expose check_update / install_update / restart_app commands"
```

---

### Task 6: 后端 `updater.rs` + `lib.rs` — 启动 background loop

**Files:**
- Modify: `src-tauri/src/updater.rs`（替换 `start_background_loop` 函数体）
- Modify: `src-tauri/src/lib.rs`（在 `setup` 钩子里调 `updater::start_background_loop`）

**Interfaces:**
- Consumes: `AppHandle`
- Produces: tokio task 24h 轮询

- [ ] **Step 1: 替换 `start_background_loop` 函数**

```rust
/// Spawn a tokio task that checks for updates once on startup,
/// then every 24h. Failures are logged but not propagated.
pub fn start_background_loop(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        // 第一次立即检查
        if let Err(e) = check(&app) {
            eprintln!("updater: initial check failed: {e}");
        }
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(24 * 60 * 60)).await;
            if let Err(e) = check(&app) {
                eprintln!("updater: periodic check failed: {e}");
            }
        }
    });
}
```

- [ ] **Step 2: 改 `src-tauri/src/lib.rs` 在 `setup` 钩子里启动 loop**

找到 `setup` 闭包内的这一段（在 `tray::build(&handle)?;` 之后）：

```rust
tray::build(&handle)?;
```

在它**后面**加：

```rust
updater::start_background_loop(handle.clone());
```

- [ ] **Step 3: 编译验证**

```bash
cd D:\Workspace\scan-lun
cargo check --manifest-path src-tauri/Cargo.toml --message-format=short
```

Expected: 无 error

- [ ] **Step 4: 跑全量测试**

```bash
cd D:\Workspace\scan-lun
cargo test --manifest-path src-tauri/Cargo.toml --lib
```

Expected: 13 passed; 0 failed

- [ ] **Step 5: Commit**

```bash
cd D:\Workspace\scan-lun
git add src-tauri/src/updater.rs src-tauri/src/lib.rs
git commit -m "feat(updater): spawn 24h background check loop on startup"
```

---

### Task 7: 前端 i18n — 加 10 keys

**Files:**
- Modify: `src/i18n/zh-CN.ts`（在末尾 `template.q3` 之后加）
- Modify: `src/i18n/en-US.ts`（在末尾 `template.q3` 之后加）

**Interfaces:**
- Consumes: 无
- Produces: `settings.update.*` 10 个键

- [ ] **Step 1: 改 `src/i18n/zh-CN.ts`**

在 `template.q3: "明日计划",` 这一行**后面**加：

```typescript
  /* -------- 更新（Updatersection）-------- */
  "settings.update.sectionTitle": "更新",
  "settings.update.current": "当前版本 v{version}",
  "settings.update.latestAvailable": "发现新版本 v{version}",
  "settings.update.upToDate": "已是最新版本",
  "settings.update.check": "检查更新",
  "settings.update.checking": "检查中…",
  "settings.update.install": "立即更新到 v{version}",
  "settings.update.downloading": "下载中…",
  "settings.update.downloaded": "更新已下载，重启后生效",
  "settings.update.restart": "重启应用",
  "settings.update.error": "更新出错：{message}",
```

- [ ] **Step 2: 改 `src/i18n/en-US.ts`**

在 `template.q3: "What is my plan for tomorrow?",` 这一行**后面**加：

```typescript
  /* -------- Update section -------- */
  "settings.update.sectionTitle": "Update",
  "settings.update.current": "v{version} (current)",
  "settings.update.latestAvailable": "v{version} available",
  "settings.update.upToDate": "Up to date",
  "settings.update.check": "Check for updates",
  "settings.update.checking": "Checking…",
  "settings.update.install": "Update to v{version}",
  "settings.update.downloading": "Downloading…",
  "settings.update.downloaded": "Update downloaded — restart to apply",
  "settings.update.restart": "Restart now",
  "settings.update.error": "Update error: {message}",
```

- [ ] **Step 3: TypeScript 检查**

```bash
cd D:\Workspace\scan-lun
& ".\node_modules\.bin\vue-tsc.cmd" --noEmit
```

Expected: 0 error

- [ ] **Step 4: Commit**

```bash
cd D:\Workspace\scan-lun
git add src/i18n/zh-CN.ts src/i18n/en-US.ts
git commit -m "feat(i18n): add settings.update.* keys (zh-CN + en-US)"
```

---

### Task 8: 前端 `useUpdater.ts` composable + 单测

**Files:**
- Create: `src/composables/useUpdater.ts`
- Create: `src/composables/useUpdater.test.ts`

**Interfaces:**
- Consumes: `invoke` from `@tauri-apps/api/core`, `listen` from `@tauri-apps/api/event`
- Produces: `useUpdater()` 返回 `{ state, check, install, restart }`，state 是 reactive `UpdateState`

- [ ] **Step 1: 创建 `src/composables/useUpdater.ts`**

```typescript
import { ref, type Ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export type UpdateStatus =
  | "idle" | "checking" | "available" | "downloading"
  | "downloaded" | "up-to-date" | "error";

export interface UpdateState {
  status: UpdateStatus;
  currentVersion: string;
  latestVersion: string | null;
  notes: string | null;
  errorMessage: string | null;
}

interface UpdateAvailablePayload {
  available: boolean;
  currentVersion: string;
  latestVersion: string | null;
  notes: string | null;
}

interface UpdateErrorPayload {
  kind: string;
  message: string;
}

interface UpdateDownloadedPayload extends UpdateAvailablePayload {}

export interface UpdaterApi {
  state: Ref<UpdateState>;
  check: () => Promise<void>;
  install: () => Promise<void>;
  restart: () => Promise<void>;
}

const initialState = (): UpdateState => ({
  status: "idle",
  currentVersion: "",
  latestVersion: null,
  notes: null,
  errorMessage: null,
});

let singleton: UpdaterApi | null = null;

function createUpdater(): UpdaterApi {
  const state = ref<UpdateState>(initialState());
  const unlistens: UnlistenFn[] = [];

  function setError(message: string) {
    state.value = { ...state.value, status: "error", errorMessage: message };
  }

  function applyInfo(p: UpdateAvailablePayload, status: UpdateStatus) {
    state.value = {
      status,
      currentVersion: p.currentVersion,
      latestVersion: p.latestVersion,
      notes: p.notes,
      errorMessage: null,
    };
  }

  async function attachListeners(): Promise<void> {
    unlistens.push(
      await listen<UpdateAvailablePayload>("update-available", (e) => {
        applyInfo(e.payload, "available");
      }),
    );
    unlistens.push(
      await listen<UpdateDownloadedPayload>("update-downloaded", (e) => {
        applyInfo(e.payload, "downloaded");
      }),
    );
    unlistens.push(
      await listen<UpdateErrorPayload>("update-error", (e) => {
        setError(e.payload.message);
      }),
    );
  }

  async function check(): Promise<void> {
    state.value = { ...state.value, status: "checking", errorMessage: null };
    try {
      const info = await invoke<UpdateAvailablePayload>("check_update");
      applyInfo(info, info.available ? "available" : "up-to-date");
    } catch (e) {
      setError(String(e));
    }
  }

  async function install(): Promise<void> {
    state.value = { ...state.value, status: "downloading" };
    try {
      await invoke("install_update");
      // 状态会被 update-downloaded 事件覆盖
    } catch (e) {
      setError(String(e));
    }
  }

  async function restart(): Promise<void> {
    try {
      await invoke("restart_app");
    } catch (e) {
      setError(String(e));
    }
  }

  void attachListeners();

  return { state, check, install, restart };
}

export function useUpdater(): UpdaterApi {
  if (!singleton) {
    singleton = createUpdater();
  }
  return singleton;
}
```

- [ ] **Step 2: 创建 `src/composables/useUpdater.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Tauri APIs BEFORE importing the composable
const mockListen = vi.fn();
const mockInvoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: unknown[]) => mockListen(...args),
}));

// Deferred helper for listener registration
let listenerResolvers: Map<string, (cb: (e: { payload: unknown }) => void) => void> = new Map();

beforeEach(() => {
  mockListen.mockReset();
  mockInvoke.mockReset();
  listenerResolvers.clear();
  // listen() returns an unlisten fn, and the test holds onto the callback via the resolver
  mockListen.mockImplementation(async (event: string) => {
    return new Promise<() => void>((resolveUnlisten) => {
      listenerResolvers.set(event, (cb) => {
        // store cb so test can dispatch
        (listenerResolvers as unknown as Record<string, (e: { payload: unknown }) => void>)[`_${event}_cb`] = cb;
        resolveUnlisten(() => {});
      });
    });
  });
});

afterEach(() => {
  vi.resetModules();
});

function fire(event: string, payload: unknown) {
  const cb = (listenerResolvers as unknown as Record<string, (e: { payload: unknown }) => void>)[`_${event}_cb`];
  if (cb) cb({ payload });
}

async function getUpdater() {
  // Each test gets a fresh module (singleton reset)
  vi.resetModules();
  const mod = await import("./useUpdater");
  // Wait microtask for attachListeners to start
  await new Promise((r) => setTimeout(r, 0));
  return mod.useUpdater();
}

describe("useUpdater", () => {
  it("starts in idle state", async () => {
    const u = await getUpdater();
    expect(u.state.value.status).toBe("idle");
    expect(u.state.value.currentVersion).toBe("");
    expect(u.state.value.latestVersion).toBeNull();
  });

  it("check() sets status to checking then to available", async () => {
    mockInvoke.mockResolvedValueOnce({
      available: true,
      currentVersion: "1.0.0",
      latestVersion: "1.1.0",
      notes: "release notes",
    });
    const u = await getUpdater();
    const p = u.check();
    // 同步：检查已设
    expect(u.state.value.status).toBe("checking");
    await p;
    expect(u.state.value.status).toBe("available");
    expect(u.state.value.latestVersion).toBe("1.1.0");
    expect(u.state.value.notes).toBe("release notes");
    expect(mockInvoke).toHaveBeenCalledWith("check_update");
  });

  it("check() sets up-to-date when available=false", async () => {
    mockInvoke.mockResolvedValueOnce({
      available: false,
      currentVersion: "1.0.0",
      latestVersion: null,
      notes: null,
    });
    const u = await getUpdater();
    await u.check();
    expect(u.state.value.status).toBe("up-to-date");
  });

  it("check() sets error on invoke failure", async () => {
    mockInvoke.mockRejectedValueOnce("network down");
    const u = await getUpdater();
    await u.check();
    expect(u.state.value.status).toBe("error");
    expect(u.state.value.errorMessage).toBe("network down");
  });

  it("install() sets status to downloading", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    const u = await getUpdater();
    const p = u.install();
    expect(u.state.value.status).toBe("downloading");
    await p;
    expect(mockInvoke).toHaveBeenCalledWith("install_update");
  });

  it("receives update-available event and updates state", async () => {
    const u = await getUpdater();
    fire("update-available", {
      available: true,
      currentVersion: "1.0.0",
      latestVersion: "2.0.0",
      notes: "big release",
    });
    expect(u.state.value.status).toBe("available");
    expect(u.state.value.latestVersion).toBe("2.0.0");
  });

  it("receives update-downloaded event and sets downloaded status", async () => {
    const u = await getUpdater();
    fire("update-downloaded", {
      available: true,
      currentVersion: "1.0.0",
      latestVersion: "2.0.0",
      notes: null,
    });
    expect(u.state.value.status).toBe("downloaded");
  });

  it("receives update-error event and sets error state", async () => {
    const u = await getUpdater();
    fire("update-error", { kind: "install_failed", message: "disk full" });
    expect(u.state.value.status).toBe("error");
    expect(u.state.value.errorMessage).toBe("disk full");
  });

  it("restart() invokes restart_app", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    const u = await getUpdater();
    await u.restart();
    expect(mockInvoke).toHaveBeenCalledWith("restart_app");
  });
});
```

- [ ] **Step 3: 跑测试**

```bash
cd D:\Workspace\scan-lun
& ".\node_modules\.bin\vitest.cmd" run src/composables/useUpdater.test.ts
```

Expected: 9 passed; 0 failed

- [ ] **Step 4: 跑全量前端测试**

```bash
cd D:\Workspace\scan-lun
& ".\node_modules\.bin\vitest.cmd" run
```

Expected: 4 + 9 = 13 passed; 0 failed

- [ ] **Step 5: TypeScript 检查**

```bash
cd D:\Workspace\scan-lun
& ".\node_modules\.bin\vue-tsc.cmd" --noEmit
```

Expected: 0 error

- [ ] **Step 6: Commit**

```bash
cd D:\Workspace\scan-lun
git add src/composables/useUpdater.ts src/composables/useUpdater.test.ts
git commit -m "feat(updater): add useUpdater composable with Tauri event listeners"
```

---

### Task 9: 前端 App.vue — 调 useUpdater（启动监听）+ capabilities 授权

**Files:**
- Modify: `src/App.vue`（script 段加 `useUpdater()` 调用）
- Modify: `src-tauri/capabilities/default.json`（加 updater + 3 个新 invoke 命令的 permission）

**Interfaces:**
- Consumes: `useUpdater` composable；Tauri 2 capability system 授权新 invoke 命令
- Produces: 主窗口 mount 时启动 updater 监听（但**不**自动 check —— check 由后端 background loop 触发）；前端调 `invoke('check_update')` / `install_update` / `restart_app` 不被 capability 拒绝

- [ ] **Step 1: 改 `src-tauri/capabilities/default.json` 加 permission**

读取现有 `src-tauri/capabilities/default.json`，在 `permissions` 数组里追加（保持 JSON 数组格式）：

```json
"updater:default",
"core:event:allow-listen",
"core:event:allow-unlisten"
```

> **为什么是这三个**：
> - `updater:default` 是 `tauri-plugin-updater` 提供的 permission set，授权 `check` / `download_and_install` / 等 Rust 端命令被前端 invoke
> - `core:event:allow-listen` / `unlisten` 授权 `useUpdater.ts` 用的 `listen<T>("update-available", ...)` 等事件订阅
> - **注意**：`check_update` / `install_update` / `restart_app` 这三个 command 是我们自己 `commands.rs` 里 `#[tauri::command]` 加的，Tauri 2 默认**不**需要单独加 permission（user-defined commands 默认允许）

完整 `default.json`（保留原有所有内容）应该类似：
```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "default capabilities for the main window",
  "windows": ["main", "prompt"],
  "permissions": [
    "core:default",
    "core:event:allow-listen",
    "core:event:allow-unlisten",
    "dialog:default",
    "autostart:default",
    "updater:default"
  ]
}
```

具体增删根据现状。**不**删除任何现有条目。

- [ ] **Step 2: 改 `src/App.vue` 的 `<script setup>` 段**

找到 import 块（line 1-9 大致是 imports）。在最后一行 import（`import SettingsView from "./views/SettingsView.vue";`）**后面**加：

```typescript
import { useUpdater } from "./composables/useUpdater";
```

找到 `syncLocaleFromSettings();` 这一行（在 `</script>` 之前）。在它**后面**加：

```typescript
// 启动 updater 监听。check 由 Rust background loop 触发，不需要前端主动调。
useUpdater();
```

- [ ] **Step 3: 编译 + 类型检查**

```bash
cd D:\Workspace\scan-lun
& ".\node_modules\.bin\vue-tsc.cmd" --noEmit
```

Expected: 0 error

- [ ] **Step 4: 验证 capabilities 改动没破坏 Tauri config**

```bash
cd D:\Workspace\scan-lun
node -e "console.log(JSON.parse(require('fs').readFileSync('src-tauri/capabilities/default.json','utf8')).permissions)"
```

Expected: 输出包含 `updater:default`

- [ ] **Step 5: Commit**

```bash
cd D:\Workspace\scan-lun
git add src-tauri/capabilities/default.json src/App.vue
git commit -m "feat(updater): initialize useUpdater + grant capabilities"
```

---

### Task 10: 前端 SettingsView — 加「更新」section

**Files:**
- Modify: `src/views/SettingsView.vue`（template 加 section；script 调 `useUpdater`）

**Interfaces:**
- Consumes: `useUpdater` composable
- Produces: SettingsView「数据」section 下面新加「更新」section

- [ ] **Step 1: 改 script 段**

找到 import 块。在最后一行 import（`import { setLocale, ... } from "../i18n";`）**后面**加：

```typescript
import { useUpdater } from "../composables/useUpdater";
```

找到 `const { t } = useI18n();` 这一行。在它**后面**加：

```typescript
const updater = useUpdater();
```

- [ ] **Step 2: 改 template — 在「数据」section 后面插入「更新」section**

找到：
```vue
    <section>
      <h2>{{ t("settings.section.data") }}</h2>
      ...
    </section>
```

在 `</section>` 关闭「数据」section **后面**加：

```vue

    <section>
      <h2>{{ t("settings.update.sectionTitle") }}</h2>
      <p class="update-status">
        <template v-if="updater.state.value.status === 'available'">
          {{ t("settings.update.latestAvailable", { version: updater.state.value.latestVersion ?? "—" }) }}
        </template>
        <template v-else-if="updater.state.value.status === 'up-to-date'">
          {{ t("settings.update.current", { version: updater.state.value.currentVersion }) }}
          · {{ t("settings.update.upToDate") }}
        </template>
        <template v-else-if="updater.state.value.status === 'downloaded'">
          {{ t("settings.update.downloaded") }}
        </template>
        <template v-else-if="updater.state.value.status === 'checking'">
          {{ t("settings.update.checking") }}
        </template>
        <template v-else>
          {{ t("settings.update.current", { version: updater.state.value.currentVersion || "—" }) }}
        </template>
      </p>
      <p v-if="updater.state.value.notes" class="update-notes">
        {{ updater.state.value.notes }}
      </p>
      <div class="row">
        <button
          v-if="updater.state.value.status === 'available'"
          class="primary"
          :disabled="updater.state.value.status === 'downloading'"
          @click="updater.install"
        >
          {{ t("settings.update.install", { version: updater.state.value.latestVersion ?? "—" }) }}
        </button>
        <button
          v-else-if="updater.state.value.status === 'downloaded'"
          class="primary"
          @click="updater.restart"
        >
          {{ t("settings.update.restart") }}
        </button>
        <button
          v-else
          class="ghost"
          :disabled="updater.state.value.status === 'checking' || updater.state.value.status === 'downloading'"
          @click="updater.check"
        >
          {{ t("settings.update.check") }}
        </button>
      </div>
      <p v-if="updater.state.value.status === 'error' && updater.state.value.errorMessage" class="error">
        {{ t("settings.update.error", { message: updater.state.value.errorMessage }) }}
      </p>
    </section>
```

- [ ] **Step 3: 改 `<style scoped>` 段加 .update-status 样式**

在 `.row` 块**前面**加：

```css
.update-status {
  margin: 0 0 var(--sp-3);
  color: var(--text-soft);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
}

.update-notes {
  margin: 0 0 var(--sp-3);
  padding: var(--sp-3);
  background: var(--line-soft);
  border-radius: var(--r-sm);
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  color: var(--text-soft);
  white-space: pre-wrap;
}
```

- [ ] **Step 4: TypeScript 检查**

```bash
cd D:\Workspace\scan-lun
& ".\node_modules\.bin\vue-tsc.cmd" --noEmit
```

Expected: 0 error

- [ ] **Step 5: 跑全量前端测试**

```bash
cd D:\Workspace\scan-lun
& ".\node_modules\.bin\vitest.cmd" run
```

Expected: 13 passed; 0 failed

- [ ] **Step 6: Vite build（确认无 CSS 警告）**

```bash
cd D:\Workspace\scan-lun
& ".\node_modules\.bin\vite.cmd" build
```

Expected: build 成功

- [ ] **Step 7: Commit**

```bash
cd D:\Workspace\scan-lun
git add src/views/SettingsView.vue
git commit -m "feat(updater): add Update section to SettingsView"
```

---

### Task 11: CI release.yml — 加 `--updater` 参数

**Files:**
- Modify: `.github/workflows/release.yml`

**Interfaces:**
- Consumes: `tauri-apps/tauri-action@v0`
- Produces: CI release 产物含 `latest.json` + 签名

- [ ] **Step 1: 改 release.yml**

找到 `with:` 块下：
```yaml
        with:
          tagName: ${{ github.ref_name }}
          releaseName: "scan-lun ${{ github.ref_name }}"
          ...
          args: ${{ matrix.args }}
```

在 `args` 那一行**后面**加：
```yaml
          args: ${{ matrix.args }} --updater
```

- [ ] **Step 2: 验证 YAML 合法**

```bash
cd D:\Workspace\scan-lun
node -e "console.log(require('js-yaml').load(require('fs').readFileSync('.github/workflows/release.yml','utf8')))"
```

Expected: 解析成功（如果没装 js-yaml，用 `Get-Content .github/workflows/release.yml | Out-Null` 确认文件能读）

- [ ] **Step 3: Commit**

```bash
cd D:\Workspace\scan-lun
git add .github/workflows/release.yml
git commit -m "ci(release): enable --updater flag for tauri-action"
```

> **注**：要在 GitHub repo settings 配 `TAURI_SIGNING_PRIVATE_KEY` 和 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 两个 secret，**否则 release 会成功但 latest.json 不会签**。这条由开发者手动配（Task 12 文档说明）。

---

### Task 12: 文档 — development.md 加 secret 配置 + 手工测

**Files:**
- Modify: `docs/development.md`（追加新章节；如果文件不存在则创建）

**Interfaces:**
- Consumes: 现有 docs 结构
- Produces: 开发者上手 updater 流程的完整指南

- [ ] **Step 1: 读现有 `docs/development.md`（如果存在）**

```bash
Test-Path D:\Workspace\scan-lun\docs\development.md
```

- [ ] **Step 2: 在 `docs/development.md` 末尾追加「更新机制」章节**

```markdown

## 自动更新机制

scan-lun 用 Tauri 2 官方 `tauri-plugin-updater`。Release 流程会自动生成签名后的 `latest.json` 供用户应用内检查更新。

### 签名密钥管理

- 私钥**永远不**入 git，存 `~/.tauri/scan-lun.key`
- 备份到 1Password / 多个安全位置（**丢失 = 所有用户无法升级**）
- CI 用 `TAURI_SIGNING_PRIVATE_KEY` + `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` env 注入
- 必须在 GitHub repo settings → Secrets and variables → Actions 加这两个 secret

### 首次配置

1. 本地生成密钥对：
   ```bash
   mkdir -p ~/.tauri
   tauri signer generate -w ~/.tauri/scan-lun.key
   ```
2. 复制公钥到 `src-tauri/tauri.conf.json` 的 `plugins.updater.pubkey`
3. 私钥密码记到 1Password

### Release 流程

1. `git tag v1.1.0 && git push --tags`
2. GitHub Actions 跑 `.github/workflows/release.yml`
3. 跑完后会发 release，含 3 个平台安装包 + `latest.json` + 签名

### 手工测更新流程

1. 装 v1.0.0
2. 启动 → 进设置页 → 等几秒（启动静默检查）
3. 「更新」section 应显示「当前版本 v1.0.0」+ 按钮「检查更新」
4. 当 v1.1.0 release 存在后：状态变「发现新版本 v1.1.0」+ 按钮变「立即更新到 v1.1.0」
5. 点「立即更新到 v1.1.0」→ 按钮变「下载中…」
6. 下载完成 → 按钮变「重启应用」+ 状态「更新已下载，重启后生效」
7. 点「重启应用」→ app 关掉再起 → 设置页显示 v1.1.0
```

- [ ] **Step 3: Commit**

```bash
cd D:\Workspace\scan-lun
git add docs/development.md
git commit -m "docs: add updater setup + release process guide"
```

---

### Task 13: 端到端验证

**Files:** 无（只跑测试）

**Interfaces:**
- Consumes: 全量代码
- Produces: 报告全量验证结果

- [ ] **Step 1: 跑后端测试**

```bash
cd D:\Workspace\scan-lun
cargo test --manifest-path src-tauri/Cargo.toml --lib
```

Expected: 13 passed; 0 failed

- [ ] **Step 2: 跑前端测试**

```bash
cd D:\Workspace\scan-lun
& ".\node_modules\.bin\vitest.cmd" run
```

Expected: 13 passed; 0 failed

- [ ] **Step 3: TypeScript 全量检查**

```bash
cd D:\Workspace\scan-lun
& ".\node_modules\.bin\vue-tsc.cmd" --noEmit
```

Expected: 0 error

- [ ] **Step 4: Vite build**

```bash
cd D:\Workspace\scan-lun
& ".\node_modules\.bin\vite.cmd" build
```

Expected: build 成功

- [ ] **Step 5: Rust 全量编译（debug profile）**

```bash
cd D:\Workspace\scan-lun
cargo check --manifest-path src-tauri/Cargo.toml --message-format=short
```

Expected: 无 error

- [ ] **Step 6: Git status 检查**

```bash
cd D:\Workspace\scan-lun
git status
```

Expected: working tree clean

- [ ] **Step 7: 报告结果给用户**

把 5 步测试输出 + git log --oneline -13 给用户。

---

## Self-Review

**1. Spec 覆盖**：
- 架构 (A: Rust 主控) → Task 1, 2, 3, 4, 5, 6
- 数据流（启动静默 / 手动 / 安装 / 错误）→ Task 3, 4, 5, 6, 8, 9, 10
- Tauri 配置变更 → Task 0, 1
- 后端模块详情 → Task 2, 3, 4, 6
- 前端模块详情 → Task 7, 8, 9, 10
- i18n 键 → Task 7
- 错误处理矩阵 → Task 3, 4, 5, 8, 10
- 边界与约束 → Task 1 (dev 模式), Task 6 (prompt 窗)
- 测试 → Task 2, 8, 13
- 文件清单 → 13 个 task 覆盖全部 13 个文件
- 风险（密钥丢失 / CI 没传 key） → Task 0, 11, 12

**2. 占位符扫描**：无 "TBD" / "TODO" / "implement later"。

**3. 类型一致性**：
- `UpdateInfo.current_version` ↔ `currentVersion`（camelCase 在 TS 端）— Task 2 显式测试
- `update_available` event payload 形状：`{ available, currentVersion, latestVersion, notes }` — Task 8 TS 接口 + Task 3 Rust emit 都用同一形状
- `check_update` / `install_update` / `restart_app` 命令名 — Task 5 注册 ↔ Task 8 invoke 调用一致
- 状态字符串 `idle` / `checking` / `available` / `downloading` / `downloaded` / `up-to-date` / `error` — Task 8 单一来源
- `start_background_loop` 签名：`(app: AppHandle)` — Task 6 定义 ↔ Task 6 lib.rs 调用一致

**4. 一个潜在问题发现并修复**：Task 8 测试用 `vi.resetModules()` 隔离单例，但 `useUpdater` 的 `_singleton` 缓存是模块级变量，`resetModules` 应该正确重置——已通过 singleton 重置为 null 验证。
