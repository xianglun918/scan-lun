# scan-lun 自动更新按钮 — 设计文档

**日期**: 2026-08-25
**状态**: Draft（待用户审阅）
**范围**: 给 scan-lun 桌面应用加"检查更新 + 安装更新"能力

---

## 1. 目标

scan-lun 当前每次 release 都靠用户手动去 GitHub Release 页下载安装包。加一个应用内"检查更新"按钮：

- 启动时静默检查一次 + 每 24h 轮询一次
- 有更新时在设置页提示
- 用户点"立即更新" → 下载 + 安装 + 提示重启
- 全程不打扰主使用流程（自省 prompt 窗不显示更新提示）

## 2. 不在范围内

- 移动端（项目目前只支持桌面，参见 `CLAUDE.md`）
- 强制自动更新（用户必须点按钮才装）
- changelog 在应用内完整展示（只显示 release 的 body 第一段；想看完整去浏览器）
- 多 repo 部署 / 自定义 endpoint（仓库地址硬编码）

## 3. 关键决策

| 维度 | 决策 | 理由 |
|---|---|---|
| 更新机制 | Tauri 官方 `tauri-plugin-updater` | 跨平台签名校验、原子安装、API 稳定 |
| 控制层 | Rust 主控 | 与 scan-lun "前端薄后端实" 哲学一致；updater 涉及 ABI / 签名不该放 JS |
| 触发方式 | 启动静默 + 24h 轮询 + 手动按钮 | 兼顾自动发现和用户控制 |
| 按钮位置 | SettingsView「数据」section 下面新加「更新」section | 符合「极简」定位；不影响主界面 / prompt 窗 / 托盘 |
| 仓库 | 硬编码 `xianglun918/scan-lun` | 单一项目，无多 repo 需求 |
| 错误展示 | 设置页底部内联红字 | 避免原生 notification 打扰 |
| 重启 | 下载完后提示用户点"重启应用"按钮 | 跟 Tauri updater 默认行为一致；不强制 |

## 4. 架构

```
┌──────────────────────────────────────────────┐
│  src-tauri/src/                              │
│                                              │
│  updater.rs (新)                             │
│   ├─ const REPO_OWNER, REPO_NAME              │
│   ├─ check(app) -> Result<UpdateInfo, String>│
│   ├─ download_and_install(app)                │
│   └─ start_background_loop(app)               │
│      ├─ sleep 0s → check → emit              │
│      └─ sleep 24h → check → emit (循环)      │
│                                              │
│  lib.rs (改)                                  │
│   ├─ .plugin(tauri_plugin_updater::Builder::new().build()) │
│   └─ setup hook: updater::start_background_loop(&handle) │
│                                              │
│  commands.rs (改)                            │
│   ├─ check_update(app) -> UpdateInfo          │
│   └─ install_update(app) -> ()                │
└──────────────────────────────────────────────┘
         ↓ Tauri commands (invoke)
         ↓ Tauri events (emit)
┌──────────────────────────────────────────────┐
│  src/                                        │
│                                              │
│  composables/useUpdater.ts (新)              │
│   ├─ state: reactive { status, currentVersion, latestVersion, notes, errorMessage } │
│   ├─ actions: check(), install(), restart()  │
│   └─ onMounted:                              │
│       ├─ listen "update-available"           │
│       ├─ listen "update-downloaded"           │
│       └─ listen "update-error"                │
│                                              │
│  views/SettingsView.vue (改)                 │
│   └─ 「更新」section 在「数据」section 下面 │
│       ├─ 状态文案（4 种状态之一）              │
│       ├─ 主按钮（4 种文案之一）                 │
│       └─ 错误内联红字（仅 error 状态）         │
│                                              │
│  App.vue (改)                                │
│   └─ onMounted: useUpdater()（启动监听 + 触发后端 check 一次） │
└──────────────────────────────────────────────┘
```

## 5. 数据流

### 5.1 启动时静默检查

1. `lib.rs` 的 `setup` 钩子调 `updater::start_background_loop(&handle)`
2. 后台 loop spawn 一个 tokio task：
   - sleep 0 → `check()` → 立即返回（不阻塞启动）
   - sleep 24h → `check()` → 重复
3. `check()` 内部用 `tauri_plugin_updater::UpdaterExt::updater()` 拿 updater，调 `.check()`（内部去 GitHub 拉 `releases/latest/download/latest.json`）
4. 根据结果 emit 事件：
   - 有更新：`emit("update-available", { version, notes })`
   - 无更新：不 emit
   - 错误：`emit("update-error", { kind, message })`
5. 前端 `useUpdater()` 监听事件 → 更新 reactive state → SettingsView「更新」section 重渲染

### 5.2 手动检查（点「检查更新」按钮）

1. SettingsView 调 `useUpdater().check()` → `invoke("check_update")`
2. Rust `commands::check_update` → `updater::check(&app)` → emit 事件
3. 前端收到事件 → 状态更新

### 5.3 安装更新

1. SettingsView 调 `useUpdater().install()` → `invoke("install_update")`
2. Rust `commands::install_update` → `updater::download_and_install(&app)`
3. 内部流程：下载 → 签名校验 → 解压 → 安装到 side-by-side path
4. emit `update-downloaded`
5. 前端状态变 `downloaded` → 按钮变「重启应用」
6. 用户点「重启应用」→ `useUpdater().restart()` → `app.restart()`（Tauri 2 API）

### 5.4 错误处理

所有路径的错误都通过 `emit("update-error", { kind, message })` 通知前端。前端 `useUpdater` 收到后：
- 状态变 `error`
- errorMessage 写到 state
- SettingsView 在 section 底部显示红字（用 `var(--danger)` 颜色）
- 按钮变回「检查更新」，用户可重试

## 6. Tauri 配置变更

### 6.1 `src-tauri/Cargo.toml`

```toml
[dependencies]
tauri = { version = "2", features = ["tray-icon", "image-png"] }
tauri-plugin-updater = "2"  # ← 新增
```

### 6.2 `src-tauri/tauri.conf.json`

在 `bundle` 旁边加 `plugins` 块：

```json
{
  "plugins": {
    "updater": {
      "endpoints": [
        "https://github.com/xianglun918/scan-lun/releases/latest/download/latest.json"
      ],
      "pubkey": "<从 `tauri signer generate -w ~/.tauri/scan-lun.key` 生成的公钥，base64 编码>",
      "windows": {
        "installMode": "passive"
      }
    }
  }
}
```

`pubkey` 是不提交到 git 的秘密——从环境变量读取。实际生成时通过 `tauri signer generate` 在本地创建密钥，CI 通过 `TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` env 注入。

### 6.3 `.github/workflows/release.yml`

`tauri-action` 步骤加 `args: ${{ matrix.args }} --updater` 以生成 `latest.json` + 签名。

需要在 repo settings 加两个 secret：
- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

## 7. 后端模块详情

### 7.1 `src-tauri/src/updater.rs`

```rust
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_updater::UpdaterExt;

pub const REPO_OWNER: &str = "xianglun918";
pub const REPO_NAME: &str = "scan-lun";

pub const UPDATE_AVAILABLE_EVENT: &str = "update-available";
pub const UPDATE_DOWNLOADED_EVENT: &str = "update-downloaded";
pub const UPDATE_ERROR_EVENT: &str = "update-error";

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub available: bool,
    pub current_version: String,
    pub latest_version: Option<String>,
    pub notes: Option<String>,
}

pub fn check(app: &AppHandle) -> Result<UpdateInfo, String> {
    let current = app.package_info().version.to_string();
    let updater = app.updater().map_err(|e| e.to_string())?;
    match updater.check() {
        Ok(Some(update)) => {
            let info = UpdateInfo {
                available: true,
                current_version: current,
                latest_version: Some(update.version.clone()),
                notes: update.body.clone(),
            };
            let _ = app.emit(UPDATE_AVAILABLE_EVENT, &info);
            Ok(info)
        }
        Ok(None) => Ok(UpdateInfo {
            available: false,
            current_version: current,
            latest_version: None,
            notes: None,
        }),
        Err(e) => {
            let msg = e.to_string();
            let _ = app.emit(UPDATE_ERROR_EVENT, serde_json::json!({
                "kind": "check_failed",
                "message": msg,
            }));
            Err(msg)
        }
    }
}

pub fn download_and_install(app: &AppHandle) -> Result<(), String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    match updater.check() {
        Ok(Some(update)) => {
            update.download_and_install().map_err(|e| {
                let msg = e.to_string();
                let _ = app.emit(UPDATE_ERROR_EVENT, serde_json::json!({
                    "kind": "install_failed",
                    "message": msg,
                }));
                msg
            })?;
            let _ = app.emit(UPDATE_DOWNLOADED_EVENT, ());
            Ok(())
        }
        Ok(None) => Err("no update available".into()),
        Err(e) => Err(e.to_string()),
    }
}

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

### 7.2 `src-tauri/src/commands.rs` 新增

```rust
#[tauri::command]
pub fn check_update(app: AppHandle) -> Result<updater::UpdateInfo, String> {
    updater::check(&app)
}

#[tauri::command]
pub fn install_update(app: AppHandle) -> Result<(), String> {
    updater::download_and_install(&app)
}
```

`invoke_handler!` 注册新增两个。

### 7.3 `src-tauri/src/lib.rs` 改动

```rust
mod updater;
// ...
.plugin(tauri_plugin_updater::Builder::new().build())
.setup(|app| {
    let handle = app.handle().clone();
    // ... 现有代码 ...
    updater::start_background_loop(handle);
    Ok(())
})
```

## 8. 前端模块详情

### 8.1 `src/composables/useUpdater.ts`

```typescript
import { ref, onMounted, onUnmounted } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

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

const initialState = (): UpdateState => ({
  status: "idle",
  currentVersion: "",
  latestVersion: null,
  notes: null,
  errorMessage: null,
});

let _singleton: ReturnType<typeof createUpdater> | null = null;

function createUpdater() {
  const state = ref<UpdateState>(initialState());
  let unlistens: UnlistenFn[] = [];

  function setError(kind: string, message: string) {
    state.value = { ...state.value, status: "error", errorMessage: message };
  }

  async function attach() {
    unlistens.push(
      await listen<{ available: boolean; currentVersion: string; latestVersion: string | null; notes: string | null }>(
        "update-available",
        (e) => {
          const p = e.payload;
          state.value = {
            status: "available",
            currentVersion: p.currentVersion,
            latestVersion: p.latestVersion,
            notes: p.notes,
            errorMessage: null,
          };
        },
      ),
    );
    unlistens.push(
      await listen("update-downloaded", () => {
        state.value = { ...state.value, status: "downloaded" };
      }),
    );
    unlistens.push(
      await listen<{ kind: string; message: string }>(
        "update-error",
        (e) => setError(e.payload.kind, e.payload.message),
      ),
    );
  }

  async function check() {
    state.value = { ...state.value, status: "checking", errorMessage: null };
    try {
      const info = await invoke<{
        available: boolean;
        currentVersion: string;
        latestVersion: string | null;
        notes: string | null;
      }>("check_update");
      state.value = {
        status: info.available ? "available" : "up-to-date",
        currentVersion: info.currentVersion,
        latestVersion: info.latestVersion,
        notes: info.notes,
        errorMessage: null,
      };
    } catch (e) {
      setError("check_failed", String(e));
    }
  }

  async function install() {
    state.value = { ...state.value, status: "downloading" };
    try {
      await invoke("install_update");
      // 状态会被 update-downloaded 事件覆盖
    } catch (e) {
      setError("install_failed", String(e));
    }
  }

  async function restart() {
    const win = getCurrentWindow();
    await win.close();
    // 真实重启需要 app.restart() API；Tauri 2 通过 invoke 调用
    const { invoke: invoke2 } = await import("@tauri-apps/api/core");
    await invoke2("plugin:updater|restart");  // 或 app.restart()
  }

  return { state, check, install, restart, attach };
}

export function useUpdater() {
  if (!_singleton) {
    _singleton = createUpdater();
    _singleton.attach();
  }
  return _singleton;
}
```

> 注：`restart` 的具体 API 调用方式在 spec 落地时再确认（Tauri 2 用 `app.restart()` 还是 plugin 命令）。spec 落地的实现 plan 阶段会跑通一遍。

### 8.2 `src/views/SettingsView.vue` 更新 section 模板

```vue
<section>
  <h2>{{ t("settings.update.sectionTitle") }}</h2>
  <p class="update-status">
    <template v-if="updater.state.value.status === 'available'">
      {{ t("settings.update.latestAvailable", { version: updater.state.value.latestVersion }) }}
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
      {{ updater.state.value.status === 'downloading'
         ? t("settings.update.downloading")
         : t("settings.update.install", { version: updater.state.value.latestVersion }) }}
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
      :disabled="updater.state.value.status === 'checking'"
      @click="updater.check"
    >
      {{ t("settings.update.check") }}
    </button>
  </div>
  <p v-if="updater.state.value.status === 'error'" class="error">
    {{ t("settings.update.error", { message: updater.state.value.errorMessage }) }}
  </p>
</section>
```

## 9. i18n 键

**zh-CN**：
```
"settings.update.sectionTitle":  "更新"
"settings.update.current":        "当前版本 v{version}"
"settings.update.latestAvailable":"发现新版本 v{version}"
"settings.update.upToDate":       "已是最新版本"
"settings.update.check":          "检查更新"
"settings.update.checking":       "检查中…"
"settings.update.install":        "立即更新到 v{version}"
"settings.update.downloading":    "下载中…"
"settings.update.downloaded":     "更新已下载，重启后生效"
"settings.update.restart":        "重启应用"
"settings.update.error":          "更新出错：{message}"
```

**en-US**：
```
"settings.update.sectionTitle":  "Update"
"settings.update.current":        "v{version} (current)"
"settings.update.latestAvailable":"v{version} available"
"settings.update.upToDate":       "Up to date"
"settings.update.check":          "Check for updates"
"settings.update.checking":       "Checking…"
"settings.update.install":        "Update to v{version}"
"settings.update.downloading":    "Downloading…"
"settings.update.downloaded":     "Update downloaded — restart to apply"
"settings.update.restart":        "Restart now"
"settings.update.error":          "Update error: {message}"
```

## 10. 错误处理矩阵

| 错误 | 来源 | UI 表现 |
|---|---|---|
| 无网络 | check() 失败 | 红字：「更新出错：xxx」+ 按钮可点 |
| 找不到 latest.json | Tauri updater 404 | 红字 |
| 签名校验失败 | latest.json 篡改 | 红字（不该有，兜底） |
| 下载中断 | 网络抖动 | 红字：「更新出错：…」，可重试 |
| 已是最新 | check() 返回 None | 显示「当前版本 vX.X.X · 已是最新版本」 |
| 不支持的平台 | updater 找不到 binary | 红字 |
| `app.restart()` 失败 | Tauri API 抛错 | 红字 |

错误都通过 `update-error` event 传 `{ kind: string, message: string }`。

## 11. 边界与约束

- **dev 模式**：`pnpm tauri dev` 时 tauri-plugin-updater 默认不调 GitHub（updater.active 默认 false）—— 不污染 release 检查
- **prompt 窗**：独立 webview，不调 useUpdater，不显示更新提示（避免污染自省体验）
- **重复点检查按钮**：Rust 端不加 60s 缓存（`tauri-plugin-updater` 内部会 cache `latest.json` 几秒；够用）
- **跨平台二进制**：Tauri updater 自动按平台匹配——macOS `*.app.tar.gz`、Windows `*.msi.zip`、Linux `*.AppImage.tar.gz`
- **首次安装 v1.0.0 之后立刻检查**：可能命中 GitHub unauthenticated 60 req/h rate limit；不属于 MVP 解决范围，记录到「未来工作」
- **TAURI_SIGNING_PRIVATE_KEY** 是 secret，**绝不**进 git——通过 `tauri signer generate -w ~/.tauri/scan-lun.key` 本地生成，CI 通过 env 注入

## 12. 测试

### 12.1 后端（`src-tauri/src/updater.rs` 测试模块）

- `update_info_serializes_to_camel_case` —— 验证 `UpdateInfo` 序列化形状跟前端约定一致
- `check_returns_up_to_date_when_no_release` —— mock 一个空 GitHub response
- `check_returns_error_on_network_failure` —— mock 网络错误

> 完整 Tauri 端到端测试（启动 updater + mock HTTP）需要复杂的 wiremock + tauri test harness，超出 MVP。**MVP 阶段用手工测 + 单元测试覆盖**。spec 落地的 plan 阶段会评估是否值得加。

### 12.2 前端（`src/composables/useUpdater.test.ts`）

- 初始 state = idle
- `check()` 设置 status = 'checking'，调 `invoke('check_update')`
- 收到 `update-available` event → state 变 available，latestVersion 正确
- 收到 `update-error` event → state 变 error，errorMessage 正确
- `install()` 设置 status = 'downloading'，调 `invoke('install_update')`

### 12.3 手工测（写进 `docs/development.md`）

```
1. 开发者本地：
   - 装 v1.0.0
   - 把 v1.0.0 的 release 上传（不带 updater artifact）作 baseline
2. 开发者本地打 v1.1.0 tag → push → CI 跑 release.yml
   - 确认 CI 输出包含 latest.json + 签名
3. 装 v1.0.0 → 启动 → 设置页「更新」section 应显示「当前 v1.0.0」
4. 等几秒（或点「检查更新」）→ 状态变「发现新版本 v1.1.0」+ 显示「立即更新到 v1.1.0」
5. 点「立即更新到 v1.1.0」→ 进度：检查中 → 下载中 → 下载完成
6. 按钮变「重启应用」→ 点 → app 关掉再起 → 设置页应显示 v1.1.0
```

## 13. 变更文件清单

| 文件 | 状态 |
|---|---|
| `src-tauri/Cargo.toml` | 改（加 dep） |
| `src-tauri/tauri.conf.json` | 改（加 plugins.updater） |
| `src-tauri/src/updater.rs` | 新 |
| `src-tauri/src/lib.rs` | 改（注册插件 + 启动 loop） |
| `src-tauri/src/commands.rs` | 改（加 2 个命令） |
| `src/composables/useUpdater.ts` | 新 |
| `src/composables/useUpdater.test.ts` | 新 |
| `src/i18n/zh-CN.ts` | 改（加 10 keys） |
| `src/i18n/en-US.ts` | 改（加 10 keys） |
| `src/views/SettingsView.vue` | 改（加「更新」section） |
| `src/App.vue` | 改（onMounted 调 useUpdater） |
| `.github/workflows/release.yml` | 改（加 --updater） |
| `docs/development.md` | 改（加 secret 说明 + 手工测步骤） |

## 14. 风险

- **GitHub API rate limit**：unauthenticated 60 req/h。MVP 不解决；未来可加 token 或换 endpoint
- **签名密钥丢失**：若 `~/.tauri/scan-lun.key` 丢失，所有用户无法再升级到任何新版本（**严重**）。spec 落地的 plan 阶段会强调：密钥要存到 1Password / 多个安全位置
- **CI 没传 signing key**：release 会成功但 latest.json 不会签，前端 updater 拒绝。**需要在 release.yml 加 `if: failure() then warn` 或文档警告**
- **Tauri 2 updater API 稳定度**：1.x → 2.x 有 breaking change。spec 落地时需固定 cargo version 范围
- **dev 模式没设 pubkey**：若 `tauri.conf.json` 里 `plugins.updater.pubkey` 是占位符，dev 启动会失败。**spec 落地时 plan 阶段要求：**先用 `tauri signer generate -w ~/.tauri/scan-lun.key` 真实生成一对密钥，dev/CI 都要用（`TAURI_SIGNING_PRIVATE_KEY` + `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` env）

## 15. 未来工作（out of MVP scope）

- changelog 完整展示（在 modal 里）
- 强制更新开关（带 `critical: true` 的 release）
- 自动下载（不询问）
- 多 channel（stable / beta / nightly）
- GitHub token 避免 rate limit
