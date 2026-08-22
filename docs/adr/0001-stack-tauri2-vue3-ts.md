# ADR-0001：技术栈 Tauri 2 + Rust 后端 + Vue 3 + TypeScript

- 状态：已接受
- 日期：2026-08-22

## 背景

需要为「每日定时弹窗 + 托盘常驻 + 本地存储」的跨平台桌面工具选型。候选包括 Electron 与 Tauri；前端在 Vue 3 与 React 之间权衡，脚本语言倾向 TypeScript。

## 决策

- 桌面框架：**Tauri 2**，后端逻辑用 **Rust**，且显式启用 `tray-icon` feature（Tauri 2 的托盘能力需 feature 开启）。
- 前端：**Vue 3 + TypeScript + Vite**（pnpm 管理），不引 vue-router，用原生 hash 切换视图。
- 定时任务：Rust 侧 `tokio`（time/macros），不引 cron 类 crate。

## 理由

- 对比 Electron：安装包小、内存占用低、贴近系统；「常驻托盘 + 定时」场景尤其适合。
- Vue 3 组合式 API + TS 对三视图小应用足够，避免引入重型路由/状态库。
- 定时逻辑放 Rust 侧而非前端 setInterval，避免 webview 休眠/后台时被挂起，且与窗口生命周期解耦。

## 后果

- 新增平台能力（托盘、自启）需在 Cargo.toml 显式开 feature；Tauri 2 的 trait 划分（`Listener`/`Emitter`/`Manager`）需要精确 `use`。
- 后续任何需要系统能力的功能都走 Rust command 暴露给前端。
