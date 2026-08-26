import { computed, ref, type ComputedRef } from "vue";
import { createI18n, useI18n } from "vue-i18n";
import zhCN from "./zh-CN";
import enUS from "./en-US";
import { TEMPLATE_KEYS } from "./template";

export type SupportedLocale = "zh-CN" | "en-US";

export const SUPPORTED_LOCALES: SupportedLocale[] = ["zh-CN", "en-US"];

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  "zh-CN": "中文",
  "en-US": "English",
};

/** Intl.DateTimeFormat 等 API 用的 BCP-47 locale 映射 */
export const INTL_LOCALE: Record<SupportedLocale, string> = {
  "zh-CN": "zh-CN",
  "en-US": "en-US",
};

export const i18n = createI18n({
  legacy: false, // Composition API
  locale: "zh-CN",
  fallbackLocale: "en-US",
  messages: {
    "zh-CN": zhCN,
    "en-US": enUS,
  },
});

/**
 * 兜底：vue-i18n 偶发 locale 改了但 useI18n() 的 t 没重新跟踪 deps。
 * 我们加一个 monotonic counter ref，每次 setLocale + 1，
 * 组件在 setup 里用 useLocaleTrigger() 取 ref 参与自己的 computed，强制重算。
 */
const _localeTick = ref(0);

export function setLocale(locale: SupportedLocale) {
  i18n.global.locale.value = locale;
  document.documentElement.lang = locale;
  _localeTick.value++;
}

export function detectInitialLocale(): SupportedLocale {
  const sys = navigator.language;
  if (sys?.toLowerCase().startsWith("en")) return "en-US";
  if (sys?.toLowerCase().startsWith("zh")) return "zh-CN";
  return "zh-CN";
}

/** 模板里若用 `{{ t(...) }}` 仍不响应，可注入这个 trigger 进 computed 强制重算 */
export function useLocaleTick(): ComputedRef<number> {
  return computed(() => {
    // 同时读 locale 触发依赖追踪
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    i18n.global.locale.value;
    return _localeTick.value;
  });
}

/**
 * 把 settings.template 转换为实际显示的模板。
 *  - template_i18n === true  → 用 i18n 翻译（template.q1/q2/q3 keys）
 *  - template_i18n === false → 用用户原样内容
 */
export function useDisplayTemplate(
  template: ComputedRef<string[] | undefined> | (() => string[] | undefined),
  templateI18n: ComputedRef<boolean | undefined> | (() => boolean | undefined),
) {
  const { t } = useI18n();
  const tick = useLocaleTick();
  const getTpl = typeof template === "function" ? template : () => template.value;
  const getFlag = typeof templateI18n === "function" ? templateI18n : () => templateI18n.value;
  return computed<string[]>(() => {
    // 读 tick 触发响应式
    void tick.value;
    const tpl = getTpl();
    const i18nFlag = getFlag();
    if (i18nFlag) {
      return TEMPLATE_KEYS.map((key, i) => {
        const localized = t(key);
        return localized && localized !== key ? localized : (tpl?.[i] ?? "");
      });
    }
    return tpl ?? [];
  });
}
