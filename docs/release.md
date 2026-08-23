# Release Guide

scan-lun 的发布流程。每次发布遵循同一套步骤：对齐版本号 → 更新 CHANGELOG → 打 tag → CI 自动构建 → 公开 release。

## 前置

- 所有改动已合并进 `main` 并推送。
- 工作树干净（`git status` 无未提交变更）。

## 发布步骤

### 1. 对齐版本号

四处版本号必须一致（以 `1.1.0` 为例）：

| 文件 | 字段 |
|---|---|
| `src-tauri/Cargo.toml` | `[package] version` |
| `src-tauri/tauri.conf.json` | `version` |
| `package.json` | `version` |
| `src-tauri/Cargo.lock` | `scan-lun` 包的 `version`（`cargo check` 会自动同步，或手动改） |

改完跑一次 `cargo check` 确认编译通过、lock 同步。

### 2. 更新 CHANGELOG.md

按 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式，把 `## [Unreleased]` 下的内容归入新版本段落：

```markdown
## [1.1.0] - 2026-08-30

### 新增
- ...

### 修复
- ...
```

并更新文件底部的链接区间：新增 `[1.1.0]: .../compare/v1.0.0...v1.1.0`，把 `[Unreleased]` 改为 `compare/v1.1.0...HEAD`。

### 3. 提交 + 打 tag + 推送

```bash
git add -A
git commit -m "chore: bump version to v1.1.0"
git push origin main

git tag -a v1.1.0 -m "scan-lun v1.1.0"
git push origin v1.1.0
```

tag 必须带 `v` 前缀（`v1.1.0`）——`.github/workflows/release.yml` 由 `v*` tag 触发。

### 4. CI 自动构建

推送 tag 后，GitHub Actions 并行构建三平台并生成 **draft release**：

- macOS（universal dmg + app.tar.gz）
- Windows（x64 setup exe + msi）
- Linux（AppImage + deb + rpm）

查看进度：`gh run list --workflow release --limit 1` 或仓库 Actions 页。

### 5. 补 release notes 并公开

CI 生成的 draft 只有占位正文。写规范 notes（结构：一句话亮点 → 亮点 bullet → 各平台下载表 → CHANGELOG 链接），填入后公开：

```bash
# 写 notes 到临时文件后：
gh release edit v1.1.0 --title "scan-lun v1.1.0" --notes-file /tmp/notes.md
# 确认无误后公开：
gh release edit v1.1.0 --draft=false
```

公开前先在 GitHub 页面预览 draft 效果。

## 语义化版本

- **PATCH**（v1.0.x）：bug 修复，无行为变更。
- **MINOR**（v1.x.0）：新增功能，向后兼容。
- **MAJOR**（vx.0.0）：破坏性变更（如数据结构迁移、行为语义改变）。

预发布用 `v1.1.0-beta.1` 这类 tag，并在 release 上勾 `pre-release`。

## 故障排查

- **CI 没触发**：确认 tag 名匹配 `v*` 且已推送（`git ls-remote --tags origin`）。
- **某平台构建失败**：`gh run view <run-id> --log-failed` 看日志；Linux 缺依赖见 `.github/workflows/release.yml` 的 apt 安装段。
- **版本号不一致导致产物名错乱**：回到第 1 步核对四处版本号后重打 tag（删旧 tag：`git push origin :refs/tags/v1.1.0`，并在 GitHub 删掉对应 draft release）。
