<script setup lang="ts">
import { computed, ref } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";
import PromptView from "./views/PromptView.vue";
import HistoryView from "./views/HistoryView.vue";
import SettingsView from "./views/SettingsView.vue";
import { useUpdater } from "./composables/useUpdater";

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

// 启动 updater 监听。check 由 Rust background loop 触发，不需要前端主动调。
useUpdater();
</script>

<template>
  <PromptView v-if="isPrompt" />

  <div v-else class="app">
    <nav class="tabs">
      <button
        :class="{ active: isHistory }"
        @click="navigate('history')"
      >
        历史
      </button>
      <button
        :class="{ active: !isHistory }"
        @click="navigate('settings')"
      >
        设置
      </button>
    </nav>
    <HistoryView v-if="isHistory" />
    <SettingsView v-else />
  </div>
</template>

<style>
:root {
  font-family: Inter, Avenir, Helvetica, Arial, "PingFang SC", "Microsoft YaHei",
    sans-serif;
  font-size: 15px;
  line-height: 24px;
  font-weight: 400;
  color: #0f0f0f;
  background-color: #f6f6f6;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}

* {
  box-sizing: border-box;
}

.app {
  max-width: 720px;
  margin: 0 auto;
}

.tabs {
  display: flex;
  gap: 4px;
  padding: 12px 24px 0;
  border-bottom: 1px solid #e0e0e0;
}

.tabs button {
  border: none;
  background: transparent;
  padding: 8px 16px;
  font-size: 15px;
  font-family: inherit;
  cursor: pointer;
  color: #666;
  border-bottom: 2px solid transparent;
}

.tabs button.active {
  color: #0f0f0f;
  font-weight: 500;
  border-bottom-color: #396cd8;
}

@media (prefers-color-scheme: dark) {
  :root {
    color: #f6f6f6;
    background-color: #2f2f2f;
  }
  .tabs {
    border-bottom-color: #444;
  }
  .tabs button {
    color: #aaa;
  }
  .tabs button.active {
    color: #f6f6f6;
  }
}
</style>
