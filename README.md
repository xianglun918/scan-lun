<p align="center">
  <img src="src-tauri/icons/icon.png" width="96" alt="scan-lun">
</p>

<h1 align="center">scan-lun</h1>

<p align="center">
  极简「吾日三省吾身」每日自省工具：每天定时弹出固定三问表单，后台托盘常驻，本地保存，历史回看，Markdown / CSV 导出。<br>
  无 AI、无云同步、无社交、无报表。
</p>

<p align="center">
  <b><a href="./README.md">简体中文</a></b> · <a href="./README.en.md">English</a>
</p>

<p align="center">
  <a href="https://github.com/xianglun918/scan-lun/actions/workflows/release.yml"><img src="https://img.shields.io/github/actions/workflow/status/xianglun918/scan-lun/release.yml?style=flat-square&label=release" alt="Release"></a>
  <a href="https://github.com/xianglun918/scan-lun/releases/latest"><img src="https://img.shields.io/github/v/release/xianglun918/scan-lun?style=flat-square" alt="Release version"></a>
  <img src="https://img.shields.io/badge/Tauri-2-24c8d8?style=flat-square&logo=tauri&logoColor=white" alt="Tauri 2">
  <img src="https://img.shields.io/badge/Rust-stable-ce412b?style=flat-square&logo=rust&logoColor=white" alt="Rust">
  <img src="https://img.shields.io/badge/Vue-3-42b883?style=flat-square&logo=vuedotjs&logoColor=white" alt="Vue 3">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License MIT"></a>
</p>

> 注意：scan-lun 是一个每日自省应用，**不是**文件或网络扫描器。

---

## 快速开始

### 安装

从 [Releases](https://github.com/xianglun918/scan-lun/releases) 下载对应平台的安装包：

- macOS：`dmg`
- Windows：`exe` / `msi`
- Linux：`AppImage` / `deb`

### 首次使用

安装后启动 scan-lun，它会安静地驻留在系统托盘。建议先打开**设置**，把提醒时间与三问文案调成自己的节奏。

到了设定时间（默认每天 18:00），三问表单会自动弹出抢焦点；你也可以从托盘菜单点「立即填写」手动打开。

## 每日使用流程

每天到点后应用自动弹出三问表单，你只需回答三个问题：

- **保存**：提交当天记录，存入本机数据库，当天不再打扰。
- **稍后提醒**：一小时后重新弹出，适合正在忙的时候。
- **跳过**：今天不再提醒、不落库。

已答当天无论从哪条路径打开（到点 / 托盘 / 稍后重发），都只显示「今日已完成」，不会重复弹空白表单。

回看与导出从主窗口进入（托盘单击或菜单「打开 scan-lun」）：切到「历史」浏览往期记录，或在「设置」调整各项选项。

## 主要功能

- **每日定时提醒**：到点自动弹出三问表单，已答当天不重复打扰。
- **三问自定义**：默认职场三省模板，可在设置页修改问题文案。
- **本地 SQLite 存储**：明文存储，数据完全留在本机，不上传、不联网。
- **历史回看**：按日期展开查看往期记录。
- **Markdown / CSV 导出**：在历史页一键导出全量数据。
- **仅工作日提醒 + 开机自启**：两个开关都在设置页。

完整功能使用路径见 [docs/story-line.md](./docs/story-line.md)。

## 设置与隐私

### 设置项

| 设置 | 说明 |
|---|---|
| 每日触发时间 | 几点提醒（HH:MM） |
| 仅工作日提醒 | 勾选后周六日不提醒 |
| 开机自启 | 随系统启动（macOS LaunchAgent） |
| 三省模板 | 三问文案均可修改 |

### 隐私

所有数据存放在本机应用数据目录下的 `scan-lun.db`（明文 SQLite），应用不上传、不联网。导出 Markdown / CSV 时，保存路径由你自己选择。

## 常见问题

**数据存在哪里？**
保存在本机应用数据目录下的 `scan-lun.db` 中，路径随系统而异（macOS 为 `~/Library/Application Support/com.scanlun.app/scan-lun.db`）。

**能在多台设备之间同步吗？**
不能。scan-lun 刻意不做云同步，数据完全留在本机。

**如何重置或导出数据？**
导出：打开「历史」页点「导出 MD」或「导出 CSV」。重置：在设置页点「清除全部数据」，或直接删除 `scan-lun.db`。

## 开发

本仓库面向使用者；如果你想跑源码、改代码或打安装包，请看开发文档。

→ [docs/development.md](./docs/development.md) · 技术栈、环境要求、本地开发与构建。

## 许可证

[MIT](./LICENSE) © 2026 xianglun918
