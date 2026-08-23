# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 规范，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

## [1.0.0] - 2026-08-23

首个公开发布版本。

### 新增

- **每日定时提醒**：到点自动弹出固定三问表单，无边框置顶并抢焦点；已答当天不重复打扰。
- **三问自省表单**：【保存】/【稍后提醒 1 小时】/【跳过】三键交互；问题文案可在设置页自定义（默认职场三省模板）。
- **后台托盘常驻**：macOS 菜单栏镂空笔记本模板图标，随明暗主题自适应；菜单提供「打开 / 立即填写 / 退出」。
- **本地 SQLite 存储**：明文存储，数据完全留在本机，不上传、不联网。
- **历史回看**：按日期倒序展开查看往期记录。
- **Markdown / CSV 导出**：在历史页一键导出全量数据，保存路径自选。
- **设置项**：每日触发时间、仅工作日提醒、开机自启、三省模板、清除全部数据。

### 平台

- macOS（Apple Silicon + Intel，universal dmg）
- Windows（x64 setup exe / msi）
- Linux（AppImage / deb / rpm）

[Unreleased]: https://github.com/xianglun918/scan-lun/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/xianglun918/scan-lun/releases/tag/v1.0.0
