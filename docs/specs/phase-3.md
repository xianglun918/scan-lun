# Phase 3 — 端到端集成（增量 spec）

> SDD 前向基线：本文件定义 Phase 3 的行为需求与 ticket 拆分，实现后按此验收。
> 追认基线见 [CONTEXT.md](../CONTEXT.md) 与 [ADR-0003/0004](../adr/)。

## 行为需求

- R1. **prompt 打开即校验已答**：无论经何路径打开（提醒事件 / 托盘「立即填写」/ snooze 重发），若今日已有保存记录，prompt 显示「今日已完成」只读提示而非空白表单，避免重复覆盖。
  - 现状：提醒事件路径由后端 `should_remind` 守卫；但托盘「立即填写」与 snooze 重发两条路径会直接 `emit`/`show`，前端无已答校验，会弹出空白表单。
  - 验收：今日已答时，三条路径下 prompt 均不出现可填写表单。
- R2. **保存链路**：填写 → 保存 → 落库 → 历史页出现当日记录；当次提醒不再弹。
- R3. **导出链路**：历史页导出 → dialog 选路径 → 文件含全部历史（MD 按日期分节 / CSV 表头 `date,q1,q2,q3`）。
- R4. **提醒链路**：到点 emit → prompt 显示并抢焦点。

## Ticket 拆分（blocking edges）

| Ticket | 内容 | Blocked by |
|---|---|---|
| T-1 | PromptView 已答提示态：onMounted 查 `today_status`，已答渲染只读提示 | —（依赖已存在的 `today_status` command） |
| T-2 | 端到端联动验证：R1–R4 逐条实测 | T-1 |
