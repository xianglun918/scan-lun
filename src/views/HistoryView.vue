<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { save } from "@tauri-apps/plugin-dialog";
import {
  exportData,
  getSettings,
  listRecords,
  type Record,
  type Settings,
} from "../services/api";
import { useDisplayTemplate } from "../i18n";

const { t, locale } = useI18n();

const records = ref<Record[]>([]);
const settings = ref<Settings | null>(null);
const expanded = ref<string | null>(null);
const error = ref("");
const exporting = ref(false);

/* 跟随语言的 template 翻译（如果 template_i18n === true） */
const displayTemplate = useDisplayTemplate(
  computed(() => settings.value?.template),
  computed(() => settings.value?.template_i18n),
);

onMounted(async () => {
  [settings.value, records.value] = await Promise.all([
    getSettings(),
    listRecords(),
  ]);
});

function toggle(date: string) {
  expanded.value = expanded.value === date ? null : date;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const dt = new Date(y, m - 1, d);
  try {
    const fmt = new Intl.DateTimeFormat(locale.value, {
      month: "short",
      day: "numeric",
      weekday: "short",
    });
    return fmt.format(dt);
  } catch {
    return dateStr;
  }
}

async function exportTo(format: "markdown" | "csv") {
  if (exporting.value) return;
  exporting.value = true;
  error.value = "";
  try {
    const ext = format === "markdown" ? "md" : "csv";
    const path = await save({
      title: t("history.action.exportTitle"),
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
      <h1>{{ t("history.title") }}</h1>
      <div class="actions">
        <button class="ghost" @click="exportTo('markdown')" :disabled="exporting">
          {{ t("history.action.exportMd") }}
        </button>
        <button class="ghost" @click="exportTo('csv')" :disabled="exporting">
          {{ t("history.action.exportCsv") }}
        </button>
      </div>
    </header>

    <p v-if="error" class="error">{{ error }}</p>

    <p v-if="!records.length" class="empty">{{ t("history.empty") }}</p>

    <div v-else class="list">
      <div v-for="r in records" :key="r.date" class="entry">
        <button
          class="date-row"
          :class="{ open: expanded === r.date }"
          :aria-expanded="expanded === r.date"
          @click="toggle(r.date)"
        >
          <span>{{ formatDate(r.date) }}</span>
          <span class="caret" aria-hidden="true"></span>
        </button>
        <Transition name="answers">
          <div v-if="expanded === r.date" class="answers">
            <div
              v-for="(q, i) in displayTemplate"
              :key="i"
              class="answer"
            >
              <p class="q">{{ q }}</p>
              <p class="a">{{ r.answers[i] || t("history.answer.empty") }}</p>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </main>
</template>

<style scoped>
.history {
  padding: var(--sp-6);
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-4);
}

h1 {
  font-size: var(--fs-h1);
  line-height: var(--lh-h1);
  font-weight: var(--fw-h1);
  margin: 0;
}

.actions {
  display: flex;
  gap: var(--sp-2);
}

.actions button {
  padding: 6px 12px;
  font-size: var(--fs-meta);
  border-radius: var(--r-sm);
}

.error {
  color: var(--danger);
  font-size: var(--fs-meta);
  margin: 0 0 var(--sp-3);
}

.empty {
  color: var(--text-soft);
  text-align: center;
  padding: var(--sp-12) 0;
  font-size: var(--fs-meta);
}

.entry {
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  margin-bottom: var(--sp-2);
  overflow: hidden;
  background: var(--surface);
  transition: border-color 160ms ease, box-shadow 160ms ease;
}
.entry:hover {
  border-color: var(--text-meta);
}

.date-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  border: none;
  border-radius: 0;
  background: transparent;
  padding: var(--sp-3) var(--sp-4);
  font-size: var(--fs-body);
  color: var(--text);
  text-align: left;
}
.date-row:hover {
  background: var(--line-soft);
}
.date-row:active {
  transform: none;
}

/* CSS 绘制的箭头，跨平台一致 */
.caret {
  width: 8px;
  height: 8px;
  border-right: 1.5px solid var(--text-meta);
  border-bottom: 1.5px solid var(--text-meta);
  transform: rotate(-45deg);
  transition: transform 180ms ease;
  display: inline-block;
}
.date-row.open .caret {
  transform: rotate(45deg);
}

.answers {
  padding: var(--sp-2) var(--sp-4) var(--sp-4);
  border-top: 1px solid var(--line);
}

.answer {
  margin-top: var(--sp-3);
}
.answer:first-child {
  margin-top: var(--sp-3);
}

.q {
  font-weight: var(--fw-h2);
  margin: 0 0 var(--sp-1);
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  color: var(--text-soft);
  letter-spacing: 0.01em;
}

.a {
  margin: 0;
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  white-space: pre-wrap;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

/* 展开/收起过渡 */
.answers-enter-active,
.answers-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
  overflow: hidden;
}
.answers-enter-from,
.answers-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
