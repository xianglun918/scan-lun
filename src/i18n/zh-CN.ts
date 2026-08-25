const messages = {
  /* -------- App 通用 -------- */
  "app.tab.history": "历史",
  "app.tab.settings": "设置",

  /* -------- 提示窗（PromptView） -------- */
  "prompt.slogan": "「吾日三省吾身」",
  "prompt.title": "每日三省",
  "prompt.done.title": "今日已完成三省，无需重复填写。",
  "prompt.done.close": "关闭",
  "prompt.action.skip": "跳过",
  "prompt.action.snooze": "稍后提醒",
  "prompt.action.save": "保存",
  "prompt.action.saving": "保存中…",

  /* -------- 历史（HistoryView） -------- */
  "history.title": "历史记录",
  "history.action.exportMd": "导出 MD",
  "history.action.exportCsv": "导出 CSV",
  "history.action.exportTitle": "导出三省记录",
  "history.empty": "还没有任何记录，去填第一次三省吧。",
  "history.answer.empty": "—",

  /* -------- 设置（SettingsView） -------- */
  "settings.title": "设置",
  "settings.section.template": "三省模板",
  "settings.section.reminder": "定时提醒",
  "settings.section.data": "数据",
  "settings.section.language": "语言",
  "settings.template.label": "问题 {n} · {text}",
  "settings.reminder.time": "每日触发时间",
  "settings.reminder.workdays": "仅工作日提醒",
  "settings.reminder.autostart": "开机自启",
  "settings.data.clear": "清除全部数据",
  "settings.data.confirm": "确定清空所有历史记录？此操作不可撤销。",
  "settings.data.confirmAction": "确认清除",
  "settings.data.cancel": "取消",
  "settings.footer.save": "保存设置",
  "settings.footer.saved": "已保存",
  "settings.language.zh-CN": "中文",
  "settings.language.en-US": "English",

  /* -------- 默认三省模板（与 Rust DEFAULT_TEMPLATE 保持语义一致） -------- */
  "template.q1": "今日完成什么",
  "template.q2": "今日问题与不足",
  "template.q3": "明日计划",

  /* -------- 更新（Updatersection）-------- */
  "settings.update.sectionTitle": "更新",
  "settings.update.current": "当前版本 v{version}",
  "settings.update.latestAvailable": "发现新版本 v{version}",
  "settings.update.upToDate": "已是最新版本",
  "settings.update.check": "检查更新",
  "settings.update.checking": "检查中…",
  "settings.update.install": "立即更新到 v{version}",
  "settings.update.downloading": "下载中…",
  "settings.update.downloaded": "更新已下载，重启后生效",
  "settings.update.restart": "重启应用",
  "settings.update.error": "更新出错：{message}",
} as const;

export type MessageSchema = typeof messages;
export default messages;
