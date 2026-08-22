# Phase 4 — 开源配套与打包（增量 spec）

> SDD 前向基线：本文件定义 Phase 4 的行为需求与 ticket 拆分，实现后按此验收。
> 追认基线见 [CONTEXT.md](../../CONTEXT.md)；前置各 phase 见 [phase-1](phase-1.md) / [phase-2](phase-2.md) / [phase-3](phase-3.md)。

## 行为需求

- R1. **LICENSE**：MIT 许可证文件（2026, xianglun918），与项目声明一致。
- R2. **README**：差异化定位一句话 + 功能清单 + 技术栈 + 开发/构建/安装说明 + 截图占位 + 数据隐私说明（本地明文）。
- R3. **CI 发布**：GitHub Actions 用 `tauri-apps/tauri-action` 打 tag 时构建多平台安装包（mac dmg / win exe / linux AppImage）并 attach 到 release。
- R4. **图标与打包配置**：生成极简应用图标（呼应「三省」），`tauri icon` 生成全套并确认引用；确认 productName / identifier / version 正确。

## Ticket 拆分（blocking edges）

| Ticket | 内容 | Blocked by |
|---|---|---|
| T1 | 写 `LICENSE`（MIT） | — |
| T2 | 重写 `README.md` | — |
| T3 | 新增 `.github/workflows/release.yml` | — |
| T4 | 生成占位图标 + `tauri icon` 全套 + 核对打包配置 | — |
