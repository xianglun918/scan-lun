# Phase 2 — 前端三视图（as-built 追认 spec）

> 已实施完成（commit `4fde0f1`），本文件是事后按交付行为追认的 ticket 记录，
> 作为 SDD 增量变更的基线之一。追认基线另见 [CONTEXT.md](../CONTEXT.md) 与 [ADR-0001~0005](../adr/)。

## 行为需求

- R1. **弹窗视图（PromptView）**：三问多行表单（占位符=模板），【跳过】【稍后提醒(1h)】【保存】。
- R2. **历史视图（HistoryView）**：日期倒序列表，点开展示三问答案；顶部导出 MD/CSV（dialog 选路径 → `export_data`）。
- R3. **设置视图（SettingsView）**：模板三行编辑、触发时间、仅工作日、自启、清数据（二次确认）。
- R4. **路由与窗口识别**：`prompt` label 渲染弹窗，否则 main 渲染历史/设置 hash 切换；浏览器调试降级。
- R5. **类型化 invoke 封装**：`services/api.ts` 覆盖全部 command。

## Ticket 拆分（均已交付，状态=已完成）

| Ticket | 内容 | 交付 |
|---|---|---|
| T1 | api.ts：类型化封装（含 `today()` 日期函数） | `4fde0f1` |
| T2 | PromptView：表单 + 三键；后端补 `snooze_reminder` command 支撑「稍后提醒」 | `4fde0f1` |
| T3 | HistoryView：列表展开 + `save()` dialog + exportData | `4fde0f1` |
| T4 | SettingsView：模板/时间/开关/清数据 | `4fde0f1` |
| T5 | App.vue：窗口 label 路由 + hash tabs + `getCurrentWindowSafe` 降级 | `4fde0f1` |

## 遗留衔接（被后续 phase 承接）

- prompt 打开时无「今日已答」校验（托盘「立即填写」/ snooze 重发会弹空白表单）——Phase 3 T-1 修复（见 [phase-3.md](phase-3.md) R1）。
- 定时弹窗、导出文件内容的真机端到端验证——Phase 3 T-2（见 [phase-3.md](phase-3.md)）。
