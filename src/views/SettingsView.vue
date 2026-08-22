<script setup lang="ts">
import { onMounted, ref } from "vue";
import {
  clearData,
  getSettings,
  saveSettings,
  type Settings,
} from "../services/api";

const settings = ref<Settings | null>(null);
const saved = ref(false);
const error = ref("");
const confirmingClear = ref(false);

onMounted(async () => {
  settings.value = await getSettings();
});

async function save() {
  if (!settings.value) return;
  saved.value = false;
  error.value = "";
  try {
    await saveSettings(settings.value);
    saved.value = true;
    setTimeout(() => (saved.value = false), 2000);
  } catch (e) {
    error.value = String(e);
  }
}

async function doClear() {
  try {
    await clearData();
    confirmingClear.value = false;
  } catch (e) {
    error.value = String(e);
  }
}
</script>

<template>
  <main v-if="settings" class="settings">
    <h1>设置</h1>

    <section>
      <h2>三省模板</h2>
      <div v-for="(q, i) in settings.template" :key="i" class="field">
        <label :for="`t${i}`">问题 {{ i + 1 }} · {{ q }}</label>
        <input :id="`t${i}`" v-model="settings.template[i]" type="text" />
      </div>
    </section>

    <section>
      <h2>定时提醒</h2>
      <div class="row">
        <label for="time">每日触发时间</label>
        <input
          id="time"
          v-model="settings.trigger_time"
          type="time"
          value="18:00"
        />
      </div>
      <div class="row">
        <label for="workdays">仅工作日提醒</label>
        <input
          id="workdays"
          v-model="settings.workdays_only"
          type="checkbox"
        />
      </div>
      <div class="row">
        <label for="autostart">开机自启</label>
        <input id="autostart" v-model="settings.autostart" type="checkbox" />
      </div>
    </section>

    <section>
      <h2>数据</h2>
      <button v-if="!confirmingClear" class="danger" @click="confirmingClear = true">
        清除全部数据
      </button>
      <div v-else class="confirm">
        <span>确定清空所有历史记录？此操作不可撤销。</span>
        <button class="danger" @click="doClear">确认清除</button>
        <button class="ghost" @click="confirmingClear = false">取消</button>
      </div>
    </section>

    <p v-if="error" class="error">{{ error }}</p>

    <div class="footer">
      <button class="primary" @click="save">保存设置</button>
      <span v-if="saved" class="saved">已保存</span>
    </div>
  </main>
</template>

<style scoped>
.settings {
  padding: 20px 24px;
  max-width: 640px;
}

h1 {
  font-size: 18px;
  margin: 0 0 16px;
}

h2 {
  font-size: 15px;
  margin: 0 0 12px;
  color: #555;
}

section {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.field {
  margin-bottom: 10px;
}

label {
  display: block;
  font-size: 13px;
  color: #666;
  margin-bottom: 4px;
}

input[type="text"] {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 14px;
  font-family: inherit;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.row label {
  margin: 0;
  font-size: 14px;
  color: #333;
}

button {
  border-radius: 8px;
  border: 1px solid #ccc;
  padding: 8px 16px;
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  background: transparent;
}

button.danger {
  border-color: #d43;
  color: #d43;
}

button.primary {
  background: #396cd8;
  border-color: #396cd8;
  color: #fff;
}

.confirm {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #d43;
}

.confirm .danger {
  border-color: #d43;
  color: #d43;
}

.error {
  color: #d43;
  font-size: 13px;
}

.footer {
  display: flex;
  align-items: center;
  gap: 12px;
}

.saved {
  color: #3a7;
  font-size: 13px;
}

@media (prefers-color-scheme: dark) {
  h2 {
    color: #aaa;
  }
  section {
    border-bottom-color: #333;
  }
  input[type="text"] {
    background: #1f1f1f;
    border-color: #444;
    color: #eee;
  }
  .row label {
    color: #ddd;
  }
  label {
    color: #aaa;
  }
}
</style>
