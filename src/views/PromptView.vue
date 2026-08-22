<script setup lang="ts">
import { onMounted, ref } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  getSettings,
  saveRecord,
  snoozeReminder,
  today,
  type Settings,
} from "../services/api";

const SNOOZE_MINS = 60;

const settings = ref<Settings | null>(null);
const answers = ref<string[]>(["", "", ""]);
const saving = ref(false);
const error = ref("");

const win = getCurrentWindow();

onMounted(async () => {
  settings.value = await getSettings();
  answers.value = settings.value.template.map(() => "");
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
</script>

<template>
  <main class="prompt">
    <h1>每日三省</h1>
    <p class="date">{{ today() }}</p>

    <form v-if="settings" @submit.prevent="save">
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
