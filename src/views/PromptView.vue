<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  getRecord,
  getSettings,
  saveRecord,
  snoozeReminder,
  today,
  type Settings,
} from "../services/api";
import { useDisplayTemplate } from "../i18n";

const SNOOZE_MINS = 60;
const { t, locale } = useI18n();

const settings = ref<Settings | null>(null);
const answers = ref<string[]>(["", "", ""]);
const saving = ref(false);
const error = ref("");
const answered = ref(false);

const win = getCurrentWindow();

/* 用 i18n 翻译或用户原样的 template（template_i18n === true 时跟随语言） */
const displayTemplate = useDisplayTemplate(
  computed(() => settings.value?.template),
  computed(() => settings.value?.template_i18n),
);

/* 锁定 prompt 窗打开时的"今天"。
 * 必须锁定，否则用户在窗内跨天（譬如 23:58 弹窗，00:02 才点保存）时，
 * save() 调用 new Date() 会返回新一天的日期，
 * record.date 就会跨天错位。
 * 用 onMounted 时刻的 today() 作为这条 prompt 对应的"目标日期"。 */
const todayStr = ref("");

onMounted(async () => {
  todayStr.value = today();
  const [s, existing] = await Promise.all([
    getSettings(),
    /* 直接传 todayStr 查 record，避开 todayStatus() 在后端用 Local::now() 与
     * 前端 today() 跨日时区的不一致可能 —— "今日是否已填" 与 save 用同一日期。 */
    getRecord(todayStr.value),
  ]);
  settings.value = s;
  answered.value = existing !== null;
  answers.value = s.template.map(() => "");
});

/** 把 "2026-08-25" 按当前 locale 渲染。
 *  zh-CN → "8月25日 · 周二"
 *  en-US → "Aug 25 · Tue"
 */
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

async function save() {
  if (saving.value) return;
  saving.value = true;
  error.value = "";
  try {
    /* 始终用锁定值 todayStr —— 不能用 today() 现算 */
    await saveRecord(todayStr.value, answers.value);
    await win.close();
  } catch (e) {
    error.value = String(e);
    saving.value = false;
  }
}

async function snooze() {
  try {
    await snoozeReminder(SNOOZE_MINS);
  } finally {
    await win.close();
  }
}

async function skip() {
  await win.close();
}

function closeWin() {
  void win.close();
}
</script>

<template>
  <main class="prompt">
    <p class="slogan">{{ t("prompt.slogan") }}</p>
    <h1>{{ t("prompt.title") }}</h1>
    <p class="date">{{ formatDate(todayStr) }}</p>

    <div v-if="answered" class="done">
      <p>{{ t("prompt.done.title") }}</p>
      <button class="primary" @click="closeWin">{{ t("prompt.done.close") }}</button>
    </div>

    <form v-else-if="settings" @submit.prevent="save">
      <div v-for="(q, i) in displayTemplate" :key="i" class="field">
        <label :for="`q${i}`">{{ i + 1 }}. {{ q }}</label>
        <textarea
          :id="`q${i}`"
          v-model="answers[i]"
          rows="3"
          :placeholder="q"
        ></textarea>
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <div class="actions">
        <button type="button" class="ghost" @click="skip">{{ t("prompt.action.skip") }}</button>
        <button type="button" class="ghost" @click="snooze">{{ t("prompt.action.snooze") }}</button>
        <button type="submit" class="primary" :disabled="saving">
          <span v-if="saving" class="ink-stamp" aria-hidden="true"></span>
          {{ saving ? t("prompt.action.saving") : t("prompt.action.save") }}
        </button>
      </div>
    </form>
  </main>
</template>

<style scoped>
.prompt {
  padding: var(--sp-8) var(--sp-6) var(--sp-8);
  max-width: 460px;            /* 中文 35-40 字一行 */
  margin: 0 auto;
}

.slogan {
  font-family: var(--ff-serif);
  margin: 0 0 var(--sp-3);
  color: var(--text-meta);
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  letter-spacing: 0.06em;       /* 中文字距 */
}

h1 {
  font-size: var(--fs-h1);
  line-height: var(--lh-h1);
  font-weight: var(--fw-h1);
  margin: 0 0 var(--sp-1);
  letter-spacing: -0.01em;
}

.date {
  margin: 0 0 var(--sp-6);
  color: var(--text-soft);
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  font-variant-numeric: tabular-nums;
}

.field {
  margin-bottom: var(--sp-4);
}

label {
  display: block;
  font-weight: var(--fw-h2);
  margin-bottom: var(--sp-2);
  font-size: var(--fs-body);
  color: var(--text);
}

textarea {
  width: 100%;
  min-height: 76px;
  max-height: 160px;
}

.error {
  color: var(--danger);
  font-size: var(--fs-meta);
  margin: var(--sp-2) 0;
}

.done {
  padding: var(--sp-12) 0;
  text-align: center;
  color: var(--text-soft);
}

.done p {
  margin: 0 0 var(--sp-4);
}

.actions {
  display: flex;
  gap: var(--sp-2);
  justify-content: flex-end;
  margin-top: var(--sp-6);
}

/* 落印动画：保存中按钮内的小黑点收缩扩散 */
.ink-stamp {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 6px;
  border-radius: 50%;
  background: currentColor;
  vertical-align: middle;
  animation: ink-pulse 900ms ease-in-out infinite;
}
@keyframes ink-pulse {
  0%, 100% { opacity: 0.35; transform: scale(0.7); }
  50% { opacity: 1; transform: scale(1); }
}

@media (max-height: 600px) {
  .prompt { padding: var(--sp-4); }
  .field { margin-bottom: var(--sp-3); }
  textarea { min-height: 56px; }
}
</style>
