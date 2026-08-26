import { invoke } from "@tauri-apps/api/core";

export interface Settings {
  template: string[];
  trigger_time: string;
  workdays_only: boolean;
  autostart: boolean;
  language: string;
  /** true = template 仍是出厂默认，前端用 i18n 翻译显示；false = 用户已编辑，原样显示 */
  template_i18n: boolean;
}

export interface Record {
  date: string;
  answers: string[];
  created_at: string;
  updated_at: string;
}

export type ExportFormat = "markdown" | "csv";

export const getSettings = (): Promise<Settings> => invoke("get_settings");

export const saveSettings = (settings: Settings): Promise<void> =>
  invoke("save_settings", { settings });

export const getRecord = (date: string): Promise<Record | null> =>
  invoke("get_record", { date });

export const saveRecord = (date: string, answers: string[]): Promise<void> =>
  invoke("save_record", { date, answers });

export const listRecords = (): Promise<Record[]> => invoke("list_records");

export const exportData = (path: string, format: ExportFormat): Promise<void> =>
  invoke("export_data", { path, format });

export const clearData = (): Promise<void> => invoke("clear_data");

export const todayStatus = (): Promise<boolean> => invoke("today_status");

export const snoozeReminder = (mins: number): Promise<void> =>
  invoke("snooze_reminder", { mins });

export function today(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
