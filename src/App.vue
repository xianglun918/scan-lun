<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getSettings, type Settings } from "./services/api";
import { setLocale, type SupportedLocale } from "./i18n";
import PromptView from "./views/PromptView.vue";
import HistoryView from "./views/HistoryView.vue";
import SettingsView from "./views/SettingsView.vue";
import { useUpdater } from "./composables/useUpdater";

const { t } = useI18n();

const win = getCurrentWindowSafe();
const isPrompt = win?.label === "prompt";

// Tauri 运行时不可用时（纯浏览器调试/预览）降级为主窗口视图。
function getCurrentWindowSafe() {
  try {
    return getCurrentWindow();
  } catch {
    return null;
  }
}

const route = ref(readRoute());
window.addEventListener("hashchange", () => (route.value = readRoute()));

function readRoute(): "history" | "settings" {
  const h = window.location.hash;
  return h.includes("settings") ? "settings" : "history";
}

function navigate(r: "history" | "settings") {
  window.location.hash = r;
  route.value = r;
}

const isHistory = computed(() => route.value === "history");

/* 同步：settings.language 变化 → i18n locale。
 * SettingsView 写设置时 setSettings 触发此 hook；初次进入时也拉一次。
 * 注意：Tauri 2 的 prompt 窗是独立 webview，有自己独立的 i18n instance，
 * 必须在 prompt 窗的 App.vue 启动时也调一次 setLocale，否则 prompt 窗的
 * slogan / title / textarea placeholder 都会跟随默认 zh-CN。
 */
const settings = ref<Settings | null>(null);
async function syncLocaleFromSettings() {
  try {
    const s = await getSettings();
    settings.value = s;
    if (s.language === "zh-CN" || s.language === "en-US") {
      setLocale(s.language as SupportedLocale);
    }
  } catch {
    // 纯浏览器预览时 getSettings 抛错，忽略即可
  }
}
syncLocaleFromSettings();

// 启动 updater 监听。check 由 Rust background loop 触发，不需要前端主动调。
// 仅主窗口监听（spec §11：prompt 窗不调 useUpdater）。
if (!isPrompt) {
  useUpdater();
}
</script>

<template>
  <PromptView v-if="isPrompt" />

  <div v-else class="app">
    <nav class="tabs">
      <button
        :class="{ active: isHistory }"
        @click="navigate('history')"
      >
        {{ t("app.tab.history") }}
      </button>
      <button
        :class="{ active: !isHistory }"
        @click="navigate('settings')"
      >
        {{ t("app.tab.settings") }}
      </button>
    </nav>
    <HistoryView v-if="isHistory" />
    <SettingsView v-else @settings-saved="syncLocaleFromSettings" />
  </div>
</template>

<style>
:root {
  /* ---------- Typography ---------- */
  --ff-sans: Inter, Avenir, Helvetica, Arial, "PingFang SC", "Microsoft YaHei",
    sans-serif;
  --ff-serif: "Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun",
    serif;

  /* 字号：中文行高 1.7-1.75 更"书"气；h1 紧凑（标题本身 1.36），meta 1.67 */
  --fs-h1: 22px;
  --lh-h1: 30px;
  --fw-h1: 600;
  --fs-h2: 15px;
  --lh-h2: 24px;
  --fw-h2: 500;
  --fs-body: 14px;
  --lh-body: 24px;
  --fs-meta: 12px;
  --lh-meta: 20px;

  /* 4-px spacing scale */
  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-6: 24px;
  --sp-8: 32px;
  --sp-12: 48px;

  /* 圆角 */
  --r-sm: 6px;
  --r-md: 10px;
  --r-lg: 14px;

  /* 主题：暖墨 stone 系 + 暖木强调 */
  --ink: #44403c;            /* stone-700 — 暖墨主色 */
  --ink-strong: #292524;     /* stone-800 — hover 态 */
  --ink-soft: #78716c;       /* stone-500 — 弱化次要文字 */
  --accent: #8b5e34;
  --line: #e7e5e4;           /* stone-200 */
  --line-soft: #f5f5f4;      /* stone-100 */
  --surface: #ffffff;
  --bg: #fafaf9;             /* stone-50 — 比 #f6f6f6 更暖 */
  --text: #1c1917;           /* stone-900 — 正文 */
  --text-soft: #57534e;      /* stone-600 */
  --text-meta: #a8a29e;      /* stone-400 */
  --danger: #b91c1c;         /* red-700 — 沉稳 */
  --success: #15803d;        /* green-700 */

  font-family: var(--ff-sans);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: 400;
  color: var(--text);
  background-color: var(--bg);
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;

  /* 全局排版微调 */
  font-variant-numeric: tabular-nums;          /* 数字等宽，日期/时间对齐 */
  font-feature-settings: "kern" 1, "liga" 1;   /* 启用 kern/liga */
}

* {
  box-sizing: border-box;
}

/* 全局：句末标点悬挂（Chrome/Edge/Safari 支持，Firefox 不支持但无害） */
:lang(zh) h1,
:lang(zh) h2,
:lang(zh) p,
:lang(zh) .slogan,
:lang(zh) .date,
:lang(zh) label,
:lang(zh) .a {
  hanging-punctuation: allow-end;
}

/* 全局标题/正文梯度（被各 view 的 h1/h2 覆盖 scoped 局部值时让位） */
h1 {
  font-size: var(--fs-h1);
  line-height: var(--lh-h1);
  font-weight: var(--fw-h1);
  letter-spacing: -0.01em;
  margin: 0;
}
h2 {
  font-size: var(--fs-h2);
  line-height: var(--lh-h2);
  font-weight: var(--fw-h2);
  color: var(--text-soft);
  margin: 0;
}

/* ---------- 全局基线：button ---------- */
button {
  border-radius: var(--r-md);
  border: 1px solid transparent;
  padding: 8px 16px;
  font-size: var(--fs-body);
  font-family: inherit;
  cursor: pointer;
  background: transparent;
  color: var(--ink-soft);
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease,
    transform 80ms ease;
}
button:not(:disabled):hover {
  background: var(--line-soft);
}
button:not(:disabled):active {
  transform: translateY(0.5px);
}
button:disabled {
  opacity: 0.55;
  cursor: default;
}
button.primary {
  background: var(--ink);
  color: #fff;
  border-color: var(--ink);
}
button.primary:not(:disabled):hover {
  background: var(--ink-strong);
  border-color: var(--ink-strong);
}
button.ghost {
  border-color: var(--line);
  background: transparent;
}
button.danger {
  border-color: var(--danger);
  color: var(--danger);
  background: transparent;
}
button.danger:not(:disabled):hover {
  background: #fef2f2;
}

/* ---------- 全局基线：input / textarea / select ---------- */
:where(input, textarea, select) {
  font-family: inherit;
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  padding: 8px 10px;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}
:where(input, textarea, select):focus {
  outline: none;
  border-color: var(--ink);
  box-shadow: 0 0 0 3px rgba(68, 64, 60, 0.1);
}
textarea {
  resize: vertical;
}

/* ---------- 暗色 ---------- */
@media (prefers-color-scheme: dark) {
  :root {
    --ink: #e7e5e4;            /* stone-200 — 暗色下浅色端是 stone-200 */
    --ink-strong: #f5f5f4;     /* stone-100 */
    --ink-soft: #a8a29e;       /* stone-400 */
    --line: #292524;           /* stone-800 */
    --line-soft: #1c1917;      /* stone-900 */
    --surface: #1c1917;
    --bg: #0c0a09;             /* stone-950 — 真正的"夜" */
    --text: #e7e5e4;
    --text-soft: #a8a29e;
    --text-meta: #78716c;
    --danger: #f87171;
    --success: #4ade80;
  }
  button.primary {
    background: var(--ink);
    color: var(--bg);
    border-color: var(--ink);
  }
  button.danger:not(:disabled):hover {
    background: rgba(248, 113, 113, 0.08);
  }
  :where(input, textarea, select):focus {
    box-shadow: 0 0 0 3px rgba(231, 229, 228, 0.14);
  }
}

/* ---------- App shell ---------- */
.app {
  max-width: 720px;
  margin: 0 auto;
}

.tabs {
  display: flex;
  gap: var(--sp-1);
  padding: var(--sp-3) var(--sp-6) 0;
  border-bottom: 1px solid var(--line);
}
.tabs button {
  border: none;
  background: transparent;
  padding: var(--sp-2) var(--sp-4);
  font-size: var(--fs-body);
  font-family: inherit;
  cursor: pointer;
  color: var(--text-soft);
  border-bottom: 2px solid transparent;
  border-radius: 0;
}
.tabs button:hover {
  background: transparent;
  color: var(--text);
}
.tabs button.active {
  color: var(--text);
  font-weight: var(--fw-h2);
  border-bottom-color: var(--ink);
}
</style>
