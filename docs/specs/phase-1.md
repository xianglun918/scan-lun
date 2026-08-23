# Phase 1 — Rust 后端骨架（as-built 追认 spec）

> 已实施完成（commit `1307d4b`），本文件是事后按交付行为追认的 ticket 记录，
> 作为 SDD 增量变更的基线之一。追认基线另见 [CONTEXT.md](../CONTEXT.md) 与 [ADR-0001~0005](../adr/)。

## 行为需求

- R1. **本地 SQLite 存储**：`records` 表每日一份（`date` 唯一，同日覆盖）+ `settings` key-value 表。
- R2. **每日定时调度**：单次触发、当日已过不补发、仅工作日开关、设置变更即时重算（Reload channel）、稍后提醒（snooze）。
- R3. **托盘常驻 + 双窗口**：main 关闭即隐藏；prompt 无边框置顶默认隐藏；托盘菜单「打开/立即填写/退出」。
- R4. **command API**：get/save_settings、get/save_record、list_records、export_data、clear_data。
- R5. **开机自启**：autostart 插件 enable/disable，启动时按 settings 表重同步。

## Ticket 拆分（均已交付，状态=已完成）

| Ticket | 内容 | 交付 |
|---|---|---|
| T1 | db.rs：建表、CRUD、导出渲染（MD/CSV）、clear_all、today_answered | `1307d4b` |
| T2 | scheduler.rs：tokio 循环、Reload、snooze、should_remind / next_trigger_delay | `1307d4b` |
| T3 | tray.rs + tauri.conf.json 双窗口 + lib.rs 装配（关闭隐藏、REMIND_EVENT 监听） | `1307d4b` |
| T4 | commands.rs + autostart 插件接入与启动同步 | `1307d4b` |

## 遗留衔接（被后续 phase 承接）

- snooze 仅后端就绪，前端「稍后提醒」按钮在 Phase 2 接入。
- 已答不重弹的后端守卫（`should_remind`）在 Phase 2 就绪，前端已答提示态在 Phase 3 落实（见 [phase-3.md](phase-3.md) R1）。
