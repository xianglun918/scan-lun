# scan-lun

> 极简「吾日三省吾身」每日自省工具。只做提醒 + 三问填写，其他一概不做。
> A minimalist daily self-reflection tool. It only reminds you and collects your answers to three fixed questions. Nothing more.

每天定时弹出三问表单，后台托盘常驻，本地保存，历史回看，Markdown / CSV 导出。无 AI、无云同步、无社交、无报表。

A daily scheduled popup with three fixed questions. Lives in the system tray, saves everything locally, lets you review history, and exports to Markdown or CSV. No AI, no cloud sync, no social features, no analytics.

> Note: scan-lun is a daily self-reflection app, **not** a file or network scanner.

<!-- TODO: 补充截图 -->
<!-- TODO: 补充 badges（版本 / 构建状态 / License） -->

---

## 快速开始 / Quick Start

### 安装 / Install

从 [Releases](https://github.com/xianglun918/scan-lun/releases) 下载对应平台的安装包：

- macOS：`dmg`
- Windows：`exe` / `msi`
- Linux：`AppImage` / `deb`

Download the installer for your platform from [Releases](https://github.com/xianglun918/scan-lun/releases):

- macOS: `dmg`
- Windows: `exe` / `msi`
- Linux: `AppImage` / `deb`

### 启动 / Launch

安装后打开 scan-lun，它会安静地驻留在系统托盘。你可以先打开设置页，把提醒时间和三问文案调成自己的节奏。

After installing, launch scan-lun. It quietly sits in the system tray. Before anything else, open Settings and set the reminder time and the three questions to fit your own rhythm.

### 首次使用 / First Run

到了设定时间（默认每天下班后），三问表单会自动弹出。你也可以在托盘菜单里手动打开。

When the scheduled time arrives (the default is once per day), the three-question form pops up by itself. You can also open it manually from the tray menu.

---

## 每日使用流程 / Daily Workflow

每天到点后，应用自动弹出三问表单，你只需回答三个问题。

Each day at the scheduled time, the app pops up the three-question form. All you do is answer the three questions.

- **保存 / Save**：提交当天的记录，存入本机数据库。
- **稍后提醒 / Remind Later**：一小时后重新弹出，适合正在忙的时候。
- **跳过 / Skip**：今天不再提醒。

- **Save** commits today's entry to your local database.
- **Remind Later** brings the form back in one hour, handy when you are busy.
- **Skip** dismisses it for the day.

日常回看和历史导出都从托盘菜单进入：右键托盘图标，打开「历史」查看往期记录，或进入「设置」调整各项选项。

For reviewing past entries and exporting, use the tray menu: right-click the tray icon, open **History** to browse past records, or open **Settings** to adjust options.

---

## 主要功能 / Features

- **每日定时提醒**：到点自动弹出三问表单，已答当天不重复打扰。
- **三问自定义**：默认职场三省模板，可在设置页修改问题文案。
- **本地 SQLite 存储**：明文存储，数据完全留在本机，不上传、不联网。
- **历史回看**：按日期展开查看往期记录。
- **Markdown / CSV 导出**：在历史页面一键导出全量数据。
- **仅工作日提醒 + 开机自启**：两个开关都在设置页。

- **Daily scheduled reminder**: the form pops up on time, and a finished day is never nagged again.
- **Customizable questions**: ships with a workplace reflection template; edit the wording in Settings.
- **Local SQLite storage**: plain text on your machine, never uploaded, never online.
- **History view**: browse past entries, grouped by date.
- **Markdown / CSV export**: one click in the History view exports everything.
- **Workday-only reminders + launch at login**: both toggles live in Settings.

---

## 设置与隐私 / Settings & Privacy

### 设置 / Settings

- 每日触发时间（几点提醒）
- 仅工作日提醒
- 开机自启
- 三省模板文案（三问均可修改）

- Daily reminder time
- Workday-only reminders
- Launch at login
- The three-question template (all three prompts are editable)

### 隐私 / Privacy

所有数据存放在本机应用数据目录下的 `scan-lun.db`（明文 SQLite），应用不上传、不联网。导出 Markdown / CSV 时，保存路径由你自己选择。

All data lives in `scan-lun.db` (plain-text SQLite) under your local app data directory. The app uploads nothing and never touches the network. When exporting Markdown or CSV, you pick where the file goes.

---

## 常见问题 / FAQ

**数据存在哪里？**

保存在本机应用数据目录下的 `scan-lun.db` 中，路径随系统而异（macOS 为 `~/Library/Application Support/scan-lun/` 等）。

**Where is my data stored?**

In `scan-lun.db` under your local app data directory. The exact path depends on your OS (for example `~/Library/Application Support/scan-lun/` on macOS).

**能在多台设备之间同步吗？**

不能。scan-lun 刻意不做云同步，数据完全留在本机。

**Can I sync across devices?**

No. scan-lun deliberately avoids cloud sync. All data stays on the machine where it was written.

**如何重置或导出数据？**

导出：打开「历史」页面，点「导出 MD」或「导出 CSV」。重置：在设置页点「清除全部数据」，或直接删除 `scan-lun.db`。

**How do I reset or export my data?**

To export, open **History** and click **导出 MD** or **导出 CSV**. To reset, click **清除全部数据** in Settings, or simply delete `scan-lun.db`.

---

## 开发 / Development

本仓库面向使用者；如果你想跑源码、改代码或打安装包，请看开发文档。

This repo is aimed at users. If you want to run from source, modify the code, or build installers, see the developer guide.

→ [docs/development.md](./docs/development.md) · 技术栈、环境要求、本地开发与构建 / Tech stack, requirements, local dev and build.

---

## 许可证 / License

[MIT](./LICENSE) © 2026 xianglun918
