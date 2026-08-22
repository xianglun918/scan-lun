use std::fs;
use std::path::Path;
use std::sync::Mutex;

use chrono::Local;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

pub struct Db(pub Mutex<Connection>);

pub const DEFAULT_TEMPLATE: [&str; 3] = [
    "今日工作完成了什么？",
    "今天遇到什么问题、有哪些不足？",
    "明天重点要做哪几件事？",
];
pub const DEFAULT_TRIGGER_TIME: &str = "18:00";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Record {
    pub date: String,
    pub answers: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub template: Vec<String>,
    pub trigger_time: String,
    pub workdays_only: bool,
    pub autostart: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            template: DEFAULT_TEMPLATE.iter().map(|s| s.to_string()).collect(),
            trigger_time: DEFAULT_TRIGGER_TIME.to_string(),
            workdays_only: true,
            autostart: false,
        }
    }
}

pub fn init(app_data_dir: &Path) -> rusqlite::Result<Connection> {
    fs::create_dir_all(app_data_dir).expect("failed to create app data dir");
    let conn = Connection::open(app_data_dir.join("scan-lun.db"))?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL UNIQUE,
            answers TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );",
    )?;
    Ok(conn)
}

fn today() -> String {
    Local::now().format("%Y-%m-%d").to_string()
}

fn now() -> String {
    Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
}

pub fn get_record(conn: &Connection, date: &str) -> rusqlite::Result<Option<Record>> {
    let mut stmt = conn.prepare(
        "SELECT date, answers, created_at, updated_at FROM records WHERE date = ?1",
    )?;
    let mut rows = stmt.query_map(params![date], |row| {
        let answers_json: String = row.get(1)?;
        Ok(Record {
            date: row.get(0)?,
            answers: serde_json::from_str(&answers_json).unwrap_or_default(),
            created_at: row.get(2)?,
            updated_at: row.get(3)?,
        })
    })?;
    rows.next().transpose()
}

pub fn upsert_record(conn: &Connection, date: &str, answers: &[String]) -> rusqlite::Result<()> {
    let answers_json = serde_json::to_string(answers).unwrap_or_else(|_| "[]".into());
    conn.execute(
        "INSERT INTO records (date, answers, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?3)
         ON CONFLICT(date) DO UPDATE SET answers = ?2, updated_at = ?3",
        params![date, answers_json, now()],
    )?;
    Ok(())
}

pub fn list_records(conn: &Connection) -> rusqlite::Result<Vec<Record>> {
    let mut stmt = conn.prepare(
        "SELECT date, answers, created_at, updated_at FROM records ORDER BY date DESC",
    )?;
    let rows = stmt.query_map([], |row| {
        let answers_json: String = row.get(1)?;
        Ok(Record {
            date: row.get(0)?,
            answers: serde_json::from_str(&answers_json).unwrap_or_default(),
            created_at: row.get(2)?,
            updated_at: row.get(3)?,
        })
    })?;
    rows.collect()
}

pub fn get_setting(conn: &Connection, key: &str) -> rusqlite::Result<Option<String>> {
    let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1")?;
    let mut rows = stmt.query_map(params![key], |row| row.get::<_, String>(0))?;
    rows.next().transpose()
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = ?2",
        params![key, value],
    )?;
    Ok(())
}

pub fn get_settings(conn: &Connection) -> Settings {
    let default = Settings::default();
    Settings {
        template: get_setting(conn, "template")
            .ok()
            .flatten()
            .and_then(|v| serde_json::from_str(&v).ok())
            .unwrap_or(default.template),
        trigger_time: get_setting(conn, "trigger_time")
            .ok()
            .flatten()
            .unwrap_or(default.trigger_time),
        workdays_only: get_setting(conn, "workdays_only")
            .ok()
            .flatten()
            .map(|v| v == "true")
            .unwrap_or(default.workdays_only),
        autostart: get_setting(conn, "autostart")
            .ok()
            .flatten()
            .map(|v| v == "true")
            .unwrap_or(default.autostart),
    }
}

pub fn save_settings(conn: &Connection, settings: &Settings) -> rusqlite::Result<()> {
    set_setting(
        conn,
        "template",
        &serde_json::to_string(&settings.template).unwrap_or_else(|_| "[]".into()),
    )?;
    set_setting(conn, "trigger_time", &settings.trigger_time)?;
    set_setting(conn, "workdays_only", &settings.workdays_only.to_string())?;
    set_setting(conn, "autostart", &settings.autostart.to_string())?;
    Ok(())
}

pub fn export_markdown(records: &[Record], settings: &Settings) -> String {
    let mut out = String::from("# scan-lun 三省记录\n\n");
    for r in records {
        out.push_str(&format!("## {}\n\n", r.date));
        for (i, q) in settings.template.iter().enumerate() {
            out.push_str(&format!("**{}**\n\n", q));
            out.push_str(&format!("{}\n\n", r.answers.get(i).cloned().unwrap_or_default()));
        }
    }
    out
}

pub fn export_csv(records: &[Record], settings: &Settings) -> String {
    let mut out = String::from("date");
    for q in &settings.template {
        out.push_str(&format!(",\"{}\"", q.replace('"', "\"\"")));
    }
    out.push('\n');
    for r in records {
        out.push_str(&r.date);
        for a in &r.answers {
            out.push_str(&format!(",\"{}\"", a.replace('"', "\"\"")));
        }
        out.push('\n');
    }
    out
}

pub fn clear_all(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute("DELETE FROM records", [])?;
    Ok(())
}

pub fn today_answered(conn: &Connection) -> rusqlite::Result<bool> {
    Ok(get_record(conn, &today())?.is_some())
}
