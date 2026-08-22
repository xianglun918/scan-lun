# scan-lun

极简「吾日三省吾身」跨平台每日自省工具：每日定时弹出固定三问表单，后台托盘常驻，本地保存，历史回看，Markdown/CSV 导出。

- 技术栈：Tauri 2 + Rust（后端）+ Vue 3 + TypeScript（前端）
- 平台：桌面先行（macOS / Windows / Linux），移动端二期
- 极简定位：仅提醒 + 三问填写 + 本地存储 + 历史 + 导出，无 AI / 云同步 / 社交 / 报表
- 默认职场三省模板：今日完成什么 / 今日问题与不足 / 明日计划
- License：MIT

## Agent skills

### Issue tracker

Issues are tracked in this repo's GitHub Issues via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — one CONTEXT.md + docs/adr/ at the repo root. See `docs/agents/domain.md`.
