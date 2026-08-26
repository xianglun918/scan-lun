/**
 * 默认三省模板
 * - 复用于：新装默认模板、清空数据后的回退、导出 Markdown / CSV 时的列头
 * - 翻译在此键下：messages.ts 里 `template.*`（保留与后端 Rust DEFAULT_TEMPLATE 同步）
 */
export const TEMPLATE_KEYS = ["template.q1", "template.q2", "template.q3"] as const;
