# ADR-0003：托盘常驻 + main/prompt 双窗口

- 状态：已接受
- 日期：2026-08-22

## 背景

产品定位「后台托盘常驻」，提醒到点时需弹出填写表单；日常则提供历史回看与设置界面。窗口形态需同时满足「不打扰」与「可立即唤起」。

## 决策

- 双窗口：
  - **main**（800×600，带标题栏）：历史 + 设置视图。`CloseRequested` 时 `prevent_close` + `hide`，而非退出。
  - **prompt**（480×560，`resizable:false, alwaysOnTop:true, visible:false`）：填写弹窗，默认隐藏，收到提醒事件才 `show + unminimize + set_focus` 抢焦点。
- **托盘**：图标 + 菜单「打开 scan-lun / 立即填写 / 退出」；左键单击显示 main 窗口。菜单「立即填写」与提醒事件都走 `show_prompt`（直接 `show/unminimize/set_focus`，不经过事件循环，避免重复触发）。
- 真正退出只发生在托盘菜单「退出」。

## 理由

- 主窗口关闭=最小化到托盘，符合「常驻」定位；prompt 常驻内存默认隐藏，保证到点弹出足够快且能置顶抢焦点。
- prompt 由事件/托盘直接操作窗口句柄，比走 emit→前端再调 window API 少一次跨层往返，也避免事件未监听时丢事件。

## 后果

- 退出只能从托盘完成；若托盘构建失败应用仍可运行（build 返回 Result 不致命）。
- prompt 窗口存在即意味着「可填写」，需要前端自行校验「今日已填」态（ADR-0004，Phase 3 落实 UI 侧提示）。
