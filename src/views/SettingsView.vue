<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { clearData, saveSettings } from "../services/api";
import { setLocale, SUPPORTED_LOCALES, LOCALE_LABELS, useDisplayTemplate, type SupportedLocale } from "../i18n";
import { useUpdater } from "../composables/useUpdater";
import { useSettings } from "../composables/useSettings";

const emit = defineEmits<{ (e: "settings-saved"): void }>();

const { t } = useI18n();

const updater = useUpdater();

/* install 按钮 disabled 判断抽成 computed，避免模板内 v-if 收窄后
   status === 'downloading' 比较触发 TS2367（行为与内联表达式一致） */
const downloading = computed(() => updater.state.value.status === "downloading");

const { settings, error, load } = useSettings();
const saved = ref(false);
const confirmingClear = ref(false);

const displayTemplate = useDisplayTemplate(
  computed(() => settings.value?.template),
  computed(() => settings.value?.template_i18n),
);

onMounted(async () => {
  await load();
  const s = settings.value;
  if (s && (s.language === "zh-CN" || s.language === "en-US")) {
    setLocale(s.language as SupportedLocale);
  }
});

/* 切换 select 立即生效（无需点保存）—— settings.language 同步 i18n.locale */
function onLanguageChange() {
  if (!settings.value) return;
  const lang = settings.value.language;
  if (lang === "zh-CN" || lang === "en-US") {
    setLocale(lang as SupportedLocale);
  }
}

/* 用户编辑任意 template 输入框 → 自动标记 template_i18n = false */
function onTemplateEdit(index: number, e: Event) {
  if (!settings.value) return;
  const value = (e.target as HTMLInputElement).value;
  settings.value.template[index] = value;
  settings.value.template_i18n = false;
}

async function save() {
  if (!settings.value) return;
  saved.value = false;
  error.value = "";
  try {
    await saveSettings(settings.value);
    saved.value = true;
    emit("settings-saved");
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
    <h1>{{ t("settings.title") }}</h1>

    <section>
      <h2>{{ t("settings.section.template") }}</h2>
      <div v-for="(q, i) in displayTemplate" :key="i" class="field">
        <label :for="`t${i}`">
          {{ t("settings.template.label", { n: i + 1, text: q }) }}
        </label>
        <input
          :id="`t${i}`"
          :value="settings.template[i]"
          @input="(e) => onTemplateEdit(i, e)"
          type="text"
        />
      </div>
    </section>

    <section>
      <h2>{{ t("settings.section.reminder") }}</h2>
      <div class="row">
        <label for="time">{{ t("settings.reminder.time") }}</label>
        <input
          id="time"
          v-model="settings.trigger_time"
          type="time"
          value="18:00"
        />
      </div>
      <div class="row">
        <label for="workdays">{{ t("settings.reminder.workdays") }}</label>
        <input
          id="workdays"
          v-model="settings.workdays_only"
          type="checkbox"
        />
      </div>
      <div class="row">
        <label for="autostart">{{ t("settings.reminder.autostart") }}</label>
        <input id="autostart" v-model="settings.autostart" type="checkbox" />
      </div>
    </section>

    <section>
      <h2>{{ t("settings.section.language") }}</h2>
      <div class="row">
        <label for="language">{{ t("settings.section.language") }}</label>
        <select
          id="language"
          v-model="settings.language"
          @change="onLanguageChange"
        >
          <option
            v-for="loc in SUPPORTED_LOCALES"
            :key="loc"
            :value="loc"
          >
            {{ LOCALE_LABELS[loc] }}
          </option>
        </select>
      </div>
    </section>

    <section>
      <h2>{{ t("settings.section.data") }}</h2>
      <button v-if="!confirmingClear" class="danger" @click="confirmingClear = true">
        {{ t("settings.data.clear") }}
      </button>
      <div v-else class="confirm">
        <span>{{ t("settings.data.confirm") }}</span>
        <button class="danger" @click="doClear">{{ t("settings.data.confirmAction") }}</button>
        <button class="ghost" @click="confirmingClear = false">{{ t("settings.data.cancel") }}</button>
      </div>
    </section>

    <section>
      <h2>{{ t("settings.update.sectionTitle") }}</h2>
      <p class="update-status">
        <template v-if="updater.state.value.status === 'available'">
          {{ t("settings.update.latestAvailable", { version: updater.state.value.latestVersion ?? "—" }) }}
        </template>
        <template v-else-if="updater.state.value.status === 'up-to-date'">
          {{ t("settings.update.current", { version: updater.state.value.currentVersion }) }}
          · {{ t("settings.update.upToDate") }}
        </template>
        <template v-else-if="updater.state.value.status === 'downloaded'">
          {{ t("settings.update.downloaded") }}
        </template>
        <template v-else-if="updater.state.value.status === 'checking'">
          {{ t("settings.update.checking") }}
        </template>
        <template v-else-if="updater.state.value.status === 'downloading'">
          {{ t("settings.update.downloading") }}
        </template>
        <template v-else>
          {{ t("settings.update.current", { version: updater.state.value.currentVersion || "—" }) }}
        </template>
      </p>
      <p v-if="updater.state.value.notes" class="update-notes">
        {{ updater.state.value.notes }}
      </p>
      <div class="row">
        <button
          v-if="updater.state.value.status === 'available'"
          class="primary"
          :disabled="downloading"
          @click="updater.install"
        >
          {{ t("settings.update.install", { version: updater.state.value.latestVersion ?? "—" }) }}
        </button>
        <button
          v-else-if="updater.state.value.status === 'downloaded'"
          class="primary"
          @click="updater.restart"
        >
          {{ t("settings.update.restart") }}
        </button>
        <button
          v-else
          class="ghost"
          :disabled="updater.state.value.status === 'checking' || updater.state.value.status === 'downloading'"
          @click="updater.check"
        >
          {{ t("settings.update.check") }}
        </button>
      </div>
      <p v-if="updater.state.value.status === 'error' && updater.state.value.errorMessage" class="error">
        {{ t("settings.update.error", { message: updater.state.value.errorMessage }) }}
      </p>
    </section>

    <p v-if="error" class="error">{{ error }}</p>

    <div class="footer">
      <button class="primary" @click="save">{{ t("settings.footer.save") }}</button>
      <Transition name="saved-fade">
        <span v-if="saved" class="saved" aria-live="polite">
          <span class="saved-dot" aria-hidden="true"></span>
          {{ t("settings.footer.saved") }}
        </span>
      </Transition>
    </div>
  </main>
</template>

<style scoped>
.settings {
  padding: var(--sp-6);
  max-width: 640px;
}

h1 {
  font-size: var(--fs-h1);
  line-height: var(--lh-h1);
  font-weight: var(--fw-h1);
  margin: 0 0 var(--sp-6);
}

h2 {
  font-size: var(--fs-h2);
  line-height: var(--lh-h2);
  font-weight: var(--fw-h2);
  color: var(--text-soft);
  margin: 0 0 var(--sp-3);
}

section {
  margin-bottom: var(--sp-6);
  padding-bottom: var(--sp-5);
  border-bottom: 1px solid var(--line);
}
section:last-of-type {
  border-bottom: none;
}

.field {
  margin-bottom: var(--sp-3);
}

label {
  display: block;
  font-size: var(--fs-meta);
  color: var(--text-soft);
  margin-bottom: var(--sp-1);
}

input[type="text"] {
  width: 100%;
}

input[type="time"] {
  width: 140px;
}

input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--ink);
}

select {
  font-family: inherit;
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  padding: 6px 28px 6px 10px;
  cursor: pointer;
  transition: border-color 120ms ease, box-shadow 120ms ease;
  /* 让原生 select 三角跟 token 主题一致（部分浏览器支持） */
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none' stroke='%2378716c' stroke-width='1.5' stroke-linecap='round'%3E%3Cpath d='M3 4.5l3 3 3-3'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 12px 12px;
}
select:focus {
  outline: none;
  border-color: var(--ink);
  box-shadow: 0 0 0 3px rgba(68, 64, 60, 0.1);
}

.update-status {
  margin: 0 0 var(--sp-3);
  color: var(--text-soft);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
}

.update-notes {
  margin: 0 0 var(--sp-3);
  padding: var(--sp-3);
  background: var(--line-soft);
  border-radius: var(--r-sm);
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  color: var(--text-soft);
  white-space: pre-wrap;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-3);
  min-height: 28px;
}

.row label {
  margin: 0;
  font-size: var(--fs-body);
  color: var(--text);
}

.confirm {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  font-size: var(--fs-meta);
  color: var(--danger);
  flex-wrap: wrap;
}

.error {
  color: var(--danger);
  font-size: var(--fs-meta);
  margin: 0 0 var(--sp-3);
}

.footer {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  margin-top: var(--sp-6);
}

/* "已保存" 落印 + 淡入 */
.saved {
  color: var(--success);
  font-size: var(--fs-meta);
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
}
.saved-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: ink-drop 420ms cubic-bezier(0.2, 0.9, 0.3, 1.2);
}
@keyframes ink-drop {
  0% { opacity: 0; transform: scale(1.8); }
  60% { opacity: 1; transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1); }
}
.saved-fade-enter-active,
.saved-fade-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
}
.saved-fade-enter-from,
.saved-fade-leave-to {
  opacity: 0;
  transform: translateX(-4px);
}
</style>
