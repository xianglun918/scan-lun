const messages = {
  /* -------- App -------- */
  "app.tab.history": "History",
  "app.tab.settings": "Settings",

  /* -------- Prompt window -------- */
  "prompt.slogan": "“I examine myself three times a day.”",
  "prompt.title": "Daily Reflection",
  "prompt.done.title": "Today’s reflection is already complete.",
  "prompt.done.close": "Close",
  "prompt.action.skip": "Skip",
  "prompt.action.snooze": "Remind later",
  "prompt.action.save": "Save",
  "prompt.action.saving": "Saving…",

  /* -------- History -------- */
  "history.title": "History",
  "history.action.exportMd": "Export MD",
  "history.action.exportCsv": "Export CSV",
  "history.action.exportTitle": "Export scan-lun records",
  "history.empty": "No records yet — start your first daily reflection.",
  "history.answer.empty": "—",

  /* -------- Settings -------- */
  "settings.title": "Settings",
  "settings.section.template": "Reflection template",
  "settings.section.reminder": "Daily reminder",
  "settings.section.data": "Data",
  "settings.section.language": "Language",
  "settings.template.label": "Question {n} · {text}",
  "settings.reminder.time": "Trigger time",
  "settings.reminder.workdays": "Weekdays only",
  "settings.reminder.autostart": "Launch at login",
  "settings.data.clear": "Clear all data",
  "settings.data.confirm": "Delete all history? This cannot be undone.",
  "settings.data.confirmAction": "Confirm delete",
  "settings.data.cancel": "Cancel",
  "settings.footer.save": "Save settings",
  "settings.footer.saved": "Saved",
  "settings.language.zh-CN": "中文",
  "settings.language.en-US": "English",

  /* -------- Default template (mirrors Rust DEFAULT_TEMPLATE intent) -------- */
  "template.q1": "What did I accomplish today?",
  "template.q2": "What went wrong, and why?",
  "template.q3": "What is my plan for tomorrow?",

  /* -------- Update section -------- */
  "settings.update.sectionTitle": "Update",
  "settings.update.current": "v{version} (current)",
  "settings.update.latestAvailable": "v{version} available",
  "settings.update.upToDate": "Up to date",
  "settings.update.check": "Check for updates",
  "settings.update.checking": "Checking…",
  "settings.update.install": "Update to v{version}",
  "settings.update.downloading": "Downloading…",
  "settings.update.downloaded": "Update downloaded — restart to apply",
  "settings.update.restart": "Restart now",
  "settings.update.error": "Update error: {message}",
} as const;

export default messages;
