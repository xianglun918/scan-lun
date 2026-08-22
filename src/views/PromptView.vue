<script setup lang="ts">
import { onMounted, ref } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  getSettings,
  saveRecord,
  snoozeReminder,
  today,
  todayStatus,
  type Settings,
} from "../services/api";

const SNOOZE_MINS = 60;

const settings = ref<Settings | null>(null);
const answers = ref<string[]>(["", "", ""]);
const saving = ref(false);
const error = ref("");
const answered = ref(false);

const win = getCurrentWindow();

onMounted(async () => {
  const [s, done] = await Promise.all([getSettings(), todayStatus()]);
  settings.value = s;
  answered.value = done;
  answers.value = s.template.map(() => "");
});

async function save() {
  if (saving.value) return;
  saving.value = true;
  error.value = "";
  try {
    await saveRecord(today(), answers.value);
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
    <h1>每日三省</h1>
    <p class="date">{{ today() }}</p>

    <div v-if="answered" class="done">
      <p>今日已完成三省，无需重复填写。</p>
      <button class="primary" @click="closeWin">关闭</button>
    </div>

    <form v-else-if="settings" @submit.prevent="save">
      <div v-for="(q, i) in settings.template" :key="i" class="field">
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
        <button type="button" class="ghost" @click="skip">跳过</button>
        <button type="button" class="ghost" @click="snooze">稍后提醒</button>
        <button type="submit" class="primary" :disabled="saving">
          {{ saving ? "保存中…" : "保存" }}
        </button>
      </div>
    </form>
  </main>
</template>

<style scoped>
.prompt {
  padding: 20px 24px;
  max-width: 480px;
  margin: 0 auto;
}

h1 {
  font-size: 18px;
  margin: 0 0 4px;
}

.date {
  margin: 0 0 16px;
  color: #888;
  font-size: 13px;
}

.field {
  margin-bottom: 14px;
}

label {
  display: block;
  font-weight: 500;
  margin-bottom: 6px;
  font-size: 14px;
}

textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
}

textarea:focus {
  outline: none;
  border-color: #396cd8;
}

.error {
  color: #d43;
  font-size: 13px;
  margin: 8px 0;
}

.done {
  padding: 40px 0;
  text-align: center;
  color: #555;
}

.done p {
  margin: 0 0 16px;
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 16px;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 8px 16px;
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
}

button.ghost {
  background: transparent;
  border-color: #ccc;
  color: #555;
}

button.primary {
  background: #396cd8;
  color: #fff;
}

button:disabled {
  opacity: 0.6;
  cursor: default;
}

@media (prefers-color-scheme: dark) {
  textarea {
    background: #1f1f1f;
    border-color: #444;
    color: #eee;
  }
  button.ghost {
    border-color: #444;
    color: #aaa;
  }
  button.primary {
    background: #4a7dff;
  }
}
</style>
