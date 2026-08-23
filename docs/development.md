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
```
