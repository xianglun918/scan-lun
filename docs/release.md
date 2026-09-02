# Release Guide（已迁移）

> ⚠️ 本文档已废弃，仅作重定向。

scan-lun 的发布流程权威文档已迁移至 **[`.omo/release-process.md`](../.omo/release-process.md)**，请以该文件为准。

旧的「手工发布」流程（手改四处版本号、手动补 CHANGELOG 链接、手动 `gh release edit --draft=false`）已废弃，现由 [`scripts/release.mjs`](../scripts/release.mjs) 自动执行：锁步 bump → CHANGELOG 转正（含底部 compare-link 维护）→ commit + tag + push，CI 自动构建三平台安装包、生成 `latest.json` 与 `SHA256SUMS`，校验通过后自动转正 Release。

> 说明：`.omo/` 是 opencode 运行时状态目录，但 `release-process.md` 通过 `.gitignore` 的 `!.omo/release-process.md` 白名单保留为受追踪文档。
