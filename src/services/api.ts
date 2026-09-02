import { invoke } from "@tauri-apps/api/core";
import {
  CMD_CLEAR_DATA,
  CMD_EXPORT_DATA,
  CMD_GET_RECORD,
  CMD_GET_SETTINGS,
  CMD_LIST_RECORDS,
  CMD_SAVE_RECORD,
  CMD_SAVE_SETTINGS,
  CMD_SNOOZE_REMINDER,
} from "../constants";

/** 镜像 Rust `src-tauri/src/db.rs` 的 `Settings`（serde，snake_case）。字段名须与 Rust 侧一致。 */
export interface Settings {
  template: string[];
  trigger_time: string;
  workdays_only: boolean;
  autostart: boolean;
  language: string;
  /** true = template 仍是出厂默认，前端用 i18n 翻译显示；false = 用户已编辑，原样显示 */
  template_i18n: boolean;
}

/** 镜像 Rust `src-tauri/src/db.rs` 的 `Record`（serde，snake_case）。字段名须与 Rust 侧一致。 */
export interface Record {
  date: string;
  answers: string[];
  created_at: string;
  updated_at: string;
}

export type ExportFormat = "markdown" | "csv";

export const getSettings = (): Promise<Settings> => invoke(CMD_GET_SETTINGS);

export const saveSettings = (settings: Settings): Promise<void> =>
  invoke(CMD_SAVE_SETTINGS, { settings });

export const getRecord = (date: string): Promise<Record | null> =>
  invoke(CMD_GET_RECORD, { date });

export const saveRecord = (date: string, answers: string[]): Promise<void> =>
  invoke(CMD_SAVE_RECORD, { date, answers });

export const listRecords = (): Promise<Record[]> => invoke(CMD_LIST_RECORDS);

export const exportData = (path: string, format: ExportFormat): Promise<void> =>
  invoke(CMD_EXPORT_DATA, { path, format });

export const clearData = (): Promise<void> => invoke(CMD_CLEAR_DATA);

export const snoozeReminder = (mins: number): Promise<void> =>
  invoke(CMD_SNOOZE_REMINDER, { mins });

export function today(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
