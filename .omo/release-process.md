# scan-lun Release 流程

> 整理自 `.github/workflows/release.yml`、`scripts/release.mjs`、`scripts/build-latest-json.mjs`、`scripts/generate-sha256sums.mjs`、`scripts/verify-release.mjs`。
> 设计参考 pi-mono 的发布流程（锁步版本、草稿先行、验证后转正、失败即清理），按桌面单应用规模裁剪。

## 0. 总览

维护者在本地冒烟并确认 CHANGELOG 后，运行 `scripts/release.mjs`（锁步 bump → CHANGELOG 转正 → 提交打 tag → 推送）。tag 推送是 CI 发布链路的唯一触发器：CI 构建三平台安装包并建**草稿** Release，生成 `latest.json` 与 `SHA256SUMS`，校验通过后**自动转正**；任一环节失败即删除草稿、阻断发布。

```
本地冒烟（惯例） ──▶ node scripts/release.mjs <patch|minor|x.y.z>
                        │ git push origin main + vX.Y.Z
                        ▼
CI (release.yml, tag v* 触发):
  build-and-release(3 平台矩阵, 草稿) ──▶ publish-release-metadata(latest.json + SHA256SUMS)
                                              │
                                              ▼
                                    publish-github-release(校验 6 项 → 转正)
  (任一 job 失败 ──▶ cleanup-draft-github-release 删除草稿, 保留 tag)
```

## 1. 基本原则

| 原则 | 说明 |
|---|---|
| 锁步版本 | 版本唯一事实源 = `src-tauri/tauri.conf.json`（安装包与更新器只读它）；`package.json` / `src-tauri/Cargo.toml` / `src-tauri/Cargo.lock` 由 release 脚本锁步同步 |
| 无本地发布 | 发布（转正 Release）只发生在 CI 且必须过校验；本地仅持有 updater 签名私钥（桌面签名密钥的天性，私钥永不入库） |
| 草稿先行 | CI 先建草稿 Release，全部资产生成并校验通过后才自动转正；用户永远看不到半成品 |
| 失败即阻断 | 校验不过 → 草稿被自动删除；**不重跑 release 脚本**，用 workflow_dispatch 恢复 |
| 幂等恢复 | `workflow_dispatch`（输入 `tagName`）可对既有 tag 重触发整条链路；脚本对已转正的 Release 幂等（跳过） |

## 2. 阶段一：CHANGELOG 审计（发布前置）

- 核对 `CHANGELOG.md` 顶部 `## [Unreleased]` 分节条目完整（新增 / 修复 / 已知问题）。
- 规则：已发布版本段落（如 `## [1.0.7]`）**不可修改**；条目写用户可感知的变化。
- 没有 `## [Unreleased]` 段 → release 脚本会直接退出，先补条目。

## 3. 阶段二：本地冒烟（惯例，阻断项）

发布前手动过一遍核心路径（几分钟）：

```bash
pnpm tauri dev
```

验证点：应用正常启动、三问表单可提交、历史可看、导出可用、设置页「更新」区块正常加载。任何失败都是发布阻断项。

## 4. 阶段三：运行发布脚本

```bash
node scripts/release.mjs patch    # 修复 + 小功能
node scripts/release.mjs minor    # 较大新功能
node scripts/release.mjs 1.1.0    # 显式版本
node scripts/release.mjs patch --dry-run   # 只打印计划不落盘
```

脚本步骤（与源码一致）：

| # | 步骤 | 实现 |
|---|------|------|
| 1 | 检查未提交变更 | `git status --porcelain`，脏则退出 |
| 2 | 计算下一版本 | 必须大于当前；远程 tag 已存在则拒绝（防同版本重发） |
| 3 | 校验 CHANGELOG | 必须含 `## [Unreleased]` |
| 4 | 锁步 bump | `tauri.conf.json` + `package.json` + `Cargo.toml` + `Cargo.lock` |
| 5 | CHANGELOG 转正 | `## [Unreleased]` → 空 `## [Unreleased]` + `## [X.Y.Z] - 日期` |
| 6 | 提交打 tag 推送 | `Release vX.Y.Z` → tag → `push origin main + tag` → 触发 CI |

**注意**：tag 已推送后**不得**对同版本重跑 release 脚本；恢复见第 6 节。

## 5. 阶段四：CI 自动发布（`release.yml`，tag `v*` 触发）

| Job | needs | 职责 |
|-----|-------|------|
| `build-and-release` | — | 3 平台矩阵（macOS universal / ubuntu / windows），`tauri-action` 构建 + minisign 签名，上传安装包 + `.sig`，建**草稿** Release |
| `publish-release-metadata` | build | `build-latest-json.mjs` 生成全平台 `latest.json`；`generate-sha256sums.mjs` 用 GitHub 服务端 digest 生成 `SHA256SUMS`（免下载） |
| `publish-github-release` | metadata | `verify-release.mjs` 校验 6 项（见下）→ 全过才 `gh release edit --draft=false` 转正；已转正则幂等跳过 |
| `cleanup-draft-github-release` | 全部（失败时） | 任一 job 失败 → 删除草稿（**保留 tag**），GitHub 页面不留半成品 |

**转正前校验（verify-release.mjs）**：

1. `latest.json` 存在且为合法 JSON
2. `version` 与 tag 一致
3. 平台覆盖 darwin / windows / linux（新式 `windows-x86_64-nsis` 或 legacy `windows-x86_64` 均可）
4. 每个 platform URL 指向本 Release 真实存在的资产
5. 每个签名 base64 解码后是 minisign 签名文件
6. `SHA256SUMS` 存在且非空

**更新器要点（v2 模式）**：`createUpdaterArtifacts: true` 下 **没有** `.msi.zip` / `.nsis.zip` / `.AppImage.tar.gz`——标准安装包（`.exe` / `.msi` / `.AppImage`）即更新包，签名是同名 `.sig`。`latest.json` 的 platform key：`windows-x86_64-nsis` / `-msi` / `linux-x86_64-appimage` / `-deb` / `-rpm`（+ legacy `windows-x86_64` / `linux-x86_64`）。注意 Linux 应用内更新仅 AppImage 生效（deb/rpm 用户手动下载）。

## 6. 失败与恢复

| 情形 | 处置 |
|------|------|
| 本地冒烟失败 | 修复后重新验证；未通过不得跑 release 脚本 |
| CI 单个 job 失败 | 草稿已被自动清理；修复后 Actions 页面重跑失败 job，或 workflow_dispatch 整链重触发 |
| 需要对既有 tag 重触发 | `gh workflow run release.yml --ref main -f tagName=vX.Y.Z`（或 Actions 页面手动触发，输入 tagName） |
| 同版本 tag 已推送 | **不要**重跑 release 脚本；用上一行 workflow_dispatch 恢复 |
| latest.json 残缺被误转正 | 事故路径：本地跑 `node scripts/build-latest-json.mjs vX.Y.Z "..."` + `generate-sha256sums.mjs` 直接修复（CI 校验已使其几乎不可能） |

## 7. 签名密钥

- updater 签名私钥：本地 `~/.tauri/scan-lun.key`（密码见密钥管理记录），**永不入库**；CI 通过 GitHub secrets `TAURI_SIGNING_PRIVATE_KEY`（base64）与 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 注入。
- 公钥在 `tauri.conf.json` 的 `plugins.updater.pubkey`。
- **密钥轮换 = 所有旧版本应用内更新失效**，用户需手动下载一次。轮换后 CHANGELOG 必须写升级说明。

## 8. 相关文件索引

| 文件 | 作用 |
|------|------|
| `scripts/release.mjs` | 本地发布脚本（第 4 节 6 步） |
| `scripts/build-latest-json.mjs` | 从 Release 资产生成全平台 `latest.json`（v2 模式） |
| `scripts/generate-sha256sums.mjs` | 用 GitHub asset digest 生成 `SHA256SUMS` |
| `scripts/verify-release.mjs` | 转正前 6 项校验 + 自动转正 |
| `.github/workflows/release.yml` | 发布 CI（第 5 节 4 个 job） |
| `CHANGELOG.md` | 变更日志（Keep a Changelog，中文分节） |
| `src-tauri/tauri.conf.json` | 版本唯一事实源 + updater 公钥与配置 |
