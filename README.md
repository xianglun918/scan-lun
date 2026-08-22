# scan-lun

极简「吾日三省吾身」跨平台每日自省工具。每日定时弹出固定三问表单，后台托盘常驻，本地保存，历史回看，Markdown/CSV 导出。

> Note: This is NOT a file/network scanner, it's for daily self-reflection.

## Features

- 每日定时弹出固定三问表单（默认职场三省，可自定义文案）
- 后台托盘常驻，仅工作日开关
- 本地 SQLite 存储，明文
- 历史回看、Markdown/CSV 导出
- 无 AI、无云同步、无社交、无报表

## Tech Stack

- [Tauri 2](https://tauri.app/) + Rust（后端：托盘、定时、存储）
- [Vue 3](https://vuejs.org/) + TypeScript + Vite（前端）

## Development

```bash
pnpm install
pnpm tauri dev
```

## License

MIT
