# scan-lun 领域上下文

## 产品一句话

极简「吾日三省吾身」每日自省工具：每日定时弹出固定三问表单，后台托盘常驻，本地保存，历史回看，Markdown/CSV 导出。

## 核心流程

```
每日到点（默认 18:00）
  ├─ 未填今日 → 托盘常驻应用弹出 prompt 窗口（无边框、置顶、抢焦点）
  │     ├─ 保存   → 写入 records，关窗，当次不再弹
  │     ├─ 稍后   → 关窗，1 小时后重新弹
  │     └─ 跳过   → 关窗，当次不落库、不重弹
  └─ 已填今日 → 不弹（调度器在 emit 前检查 today_answered）
```

主窗口（main）承载「历史回看 + 设置」两个视图，关闭时隐藏而非退出，常驻托盘。托盘菜单提供「打开 scan-lun / 立即填写 / 退出」。

## 术语表

| 术语 | 含义 | 备注 |
|---|---|---|
| **三省记录 (Record)** | 某日一份的三问答案，`date` 唯一 | `records` 表，answers 以 JSON 文本存列 |
| **模板 (template)** | 固定三问的文案，设置页可改 | 默认：今日完成 / 今日问题不足 / 明日计划 |
| **触发时间 (trigger_time)** | 每日提醒时刻（HH:MM） | 默认 18:00 |
| **仅工作日 (workdays_only)** | 周六日不提醒的开关 | 默认开启 |
| **提醒事件 (REMIND_EVENT)** | `scan-lun://remind`，后端 emit、`listen` 后显示 prompt | 唯一事件通道 |
| **稍后提醒 (snooze)** | 关窗并安排 N 分钟后重发提醒事件 | 前端固定 60 分钟 |
| **已答当日 (today_answered)** | 今日是否已有保存记录 | 决定调度器是否 emit / prompt 是否显示填写态 |
| **托盘 (tray)** | 系统托盘图标与菜单 | 左键单击 = 显示主窗口 |
| **prompt 窗口** | 无边框、置顶、默认隐藏的填写弹窗 | label=`prompt` |
| **main 窗口** | 历史+设置主窗口，关闭即隐藏 | label=`main` |

## 边界（范围外，不做）

移动端、云同步、AI 总结、多套模板、多时段定时、搜索过滤、主题换肤、加密存储、社交/报表。详情见 `/docs/agents/domain.md` 的 single-context 约定与本文件下方的决策索引。

## 设计决策索引

| 决策 | 出处 |
|---|---|
| Tauri 2 + Rust + Vue 3 + TypeScript + Vite | [ADR-0001](docs/adr/0001-stack-tauri2-vue3-ts.md) |
| 本地 SQLite 明文存储，records + settings 表 | [ADR-0002](docs/adr/0002-sqlite-local-storage.md) |
| 托盘常驻 + main/prompt 双窗口 | [ADR-0003](docs/adr/0003-dual-window-and-tray.md) |
| 每日单次触发、不补发、仅工作日、snooze、已答不重弹 | [ADR-0004](docs/adr/0004-daily-schedule-semantics.md) |
| 全量 Markdown/CSV 导出、autostart 持久化 | [ADR-0005](docs/adr/0005-export-and-autostart.md) |

## 增量变更 spec 索引

每个 phase 一份行为需求 + ticket 记录，实现后更新状态，作为增量变更的追溯链。

| Phase | 状态 | 出处 |
|---|---|---|
| Phase 1 — Rust 后端骨架 | 已完成 | [docs/specs/phase-1.md](docs/specs/phase-1.md) |
| Phase 2 — 前端三视图 | 已完成 | [docs/specs/phase-2.md](docs/specs/phase-2.md) |
| Phase 3 — 端到端集成 | 进行中（T-1 完成，T-2 待真机验证） | [docs/specs/phase-3.md](docs/specs/phase-3.md) |
| Phase 4 — 开源配套与打包 | 已完成 | [docs/specs/phase-4.md](docs/specs/phase-4.md) |
