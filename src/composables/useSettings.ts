import { ref, type Ref } from "vue";
import { getSettings, type Settings } from "../services/api";

export interface UseSettings {
  settings: Ref<Settings | null>;
  error: Ref<string>;
  loading: Ref<boolean>;
  load: () => Promise<void>;
}

/**
 * 读取设置的通用三态（settings / error / loading）。SettingsView 与 HistoryView
 * 挂载时都要拉一次 get_settings，抽成 composable 避免重复的 onMounted + try/catch。
 */
export function useSettings(): UseSettings {
  const settings = ref<Settings | null>(null);
  const error = ref("");
  const loading = ref(false);

  async function load(): Promise<void> {
    loading.value = true;
    error.value = "";
    try {
      settings.value = await getSettings();
    } catch (e) {
      error.value = String(e);
    } finally {
      loading.value = false;
    }
  }

  return { settings, error, loading, load };
}
