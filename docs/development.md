# Development Guide

本文件面向 scan-lun 的开发者，涵盖技术栈、环境要求、本地开发与构建方式，以及项目结构。用户使用说明见 [README](../README.md)。

## Tech Stack

- [Tauri 2](https://tauri.app/) + Rust（后端：托盘、定时调度、SQLite 存储、导出）
- [Vue 3](https://vuejs.org/) + TypeScript + Vite（前端）

## Requirements

- [Rust](https://rustup.rs/)（stable）+ [pnpm](https://pnpm.io/)
- Linux 需系统依赖：`webkit2gtk-4.1`、`libappindicator3`、`librsvg` 等（见 [Tauri 官方文档](https://tauri.app/start/prerequisites/)）

## Development

```bash
pnpm install
pnpm tauri dev
```

## Build

```bash
pnpm tauri build
```

产出当前平台安装包：macOS → `dmg`，Windows → `exe/msi`，Linux → `AppImage/deb`。
多平台自动构建见 `.github/workflows/release.yml`（打 tag 触发）。发布流程见 [release.md](./release.md)。

## Project Structure

```
src-tauri/src/
  db.rs         SQLite 存储（records + settings）
  scheduler.rs  每日定时调度、稍后提醒、已答不重弹守卫
  tray.rs       系统托盘与双窗口控制
  commands.rs   前端可调用的 command API
  lib.rs        装配（DB/调度/托盘/自启/事件监听）
src/
  views/        PromptView（弹窗）/ HistoryView / SettingsView
  services/     类型化 invoke 封装

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
