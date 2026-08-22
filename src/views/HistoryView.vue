<script setup lang="ts">
import { onMounted, ref } from "vue";
import { save } from "@tauri-apps/plugin-dialog";
import {
  exportData,
  getSettings,
  listRecords,
  type Record,
  type Settings,
} from "../services/api";

const records = ref<Record[]>([]);
const settings = ref<Settings | null>(null);
const expanded = ref<string | null>(null);
const error = ref("");
const exporting = ref(false);

onMounted(async () => {
  [settings.value, records.value] = await Promise.all([
    getSettings(),
    listRecords(),
  ]);
});

function toggle(date: string) {
  expanded.value = expanded.value === date ? null : date;
}

async function exportTo(format: "markdown" | "csv") {
  if (exporting.value) return;
  exporting.value = true;
  error.value = "";
  try {
    const ext = format === "markdown" ? "md" : "csv";
    const path = await save({
      title: "导出三省记录",
      defaultPath: `scan-lun-records.${ext}`,
    });
    if (path) {
      await exportData(path, format);
    }
  } catch (e) {
    error.value = String(e);
  } finally {
    exporting.value = false;
  }
}
</script>

<template>
  <main class="history">
    <header class="top">
      <h1>历史记录</h1>
      <div class="actions">
        <button class="ghost" @click="exportTo('markdown')">导出 MD</button>
        <button class="ghost" @click="exportTo('csv')">导出 CSV</button>
      </div>
    </header>

    <p v-if="error" class="error">{{ error }}</p>

    <p v-if="!records.length" class="empty">还没有任何记录，去填第一次三省吧。</p>

    <div v-else class="list">
      <div v-for="r in records" :key="r.date" class="entry">
        <button class="date-row" @click="toggle(r.date)">
          <span>{{ r.date }}</span>
          <span class="caret">{{ expanded === r.date ? "▾" : "▸" }}</span>
        </button>
        <div v-if="expanded === r.date" class="answers">
          <div
            v-for="(q, i) in settings?.template ?? []"
            :key="i"
            class="answer"
          >
            <p class="q">{{ q }}</p>
            <p class="a">{{ r.answers[i] || "—" }}</p>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.history {
  padding: 20px 24px;
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

h1 {
  font-size: 18px;
  margin: 0;
}

.actions {
  display: flex;
  gap: 8px;
}

button {
  border-radius: 8px;
  border: 1px solid #ccc;
  padding: 6px 12px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  background: transparent;
  color: #555;
}

.error {
  color: #d43;
  font-size: 13px;
}

.empty {
  color: #888;
  text-align: center;
  padding: 40px 0;
}

.entry {
  border: 1px solid #eee;
  border-radius: 8px;
  margin-bottom: 8px;
  overflow: hidden;
}

.date-row {
  display: flex;
  justify-content: space-between;
  width: 100%;
  border: none;
  background: #fafafa;
  padding: 10px 14px;
  font-size: 14px;
}

.caret {
  color: #aaa;
}

.answers {
  padding: 8px 14px 14px;
  border-top: 1px solid #f0f0f0;
}

.answer {
  margin-top: 10px;
}

.q {
  font-weight: 500;
  margin: 0 0 4px;
  font-size: 13px;
}

.a {
  margin: 0;
  font-size: 14px;
  white-space: pre-wrap;
  line-height: 1.5;
}

@media (prefers-color-scheme: dark) {
  button {
    border-color: #444;
    color: #aaa;
  }
  .entry {
    border-color: #333;
  }
  .date-row {
    background: #1d1d1d;
  }
  .answers {
    border-top-color: #2a2a2a;
  }
}
</style>
