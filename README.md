# scan-lun

> 极简「吾日三省吾身」每日自省工具 —— 只做提醒 + 三问填写，其他一概不做。

每日定时弹出固定三问表单，后台托盘常驻，本地保存，历史回看，Markdown/CSV 导出。
无 AI、无云同步、无社交、无报表。

> Note: scan-lun is a daily self-reflection app, **not** a file/network scanner.

## Features

- 每日定时弹出固定三问表单（默认职场三省，设置页可自定义文案）
- 【保存】/【稍后提醒 1h】/【跳过】三键交互，后台托盘常驻
- 仅工作日提醒开关，开机自启开关
- 本地 SQLite 明文存储，数据完全留在本机
- 历史回看（按日期展开），全量 Markdown / CSV 导出

## Screenshots

<!-- TODO: 补充弹窗、历史、设置三张截图 -->

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
多平台自动构建见 `.github/workflows/release.yml`（打 tag 触发）。

## Privacy

- 全部数据存于本机应用数据目录下的 `scan-lun.db`（明文 SQLite），不上传、不联网。
- 导出为 Markdown/CSV 时由你选择保存路径。

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

## License

[MIT](./LICENSE) © 2026 xianglun918
