use std::fs;
use std::path::Path;
use std::sync::Mutex;

use chrono::Local;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

pub struct Db(Mutex<Connection>);

impl Db {
    /// Wraps a live connection in the process-wide mutex.
    pub fn new(conn: Connection) -> Self {
        Db(Mutex::new(conn))
    }

    /// Runs `f` with the connection locked, centralizing the poison check so
    /// callers never re-implement `lock().expect(...)`.
    pub fn with_conn<F, R>(&self, f: F) -> R
    where
        F: FnOnce(&Connection) -> R,
    {
        let conn = self.0.lock().expect("db lock poisoned");
        f(&conn)
    }
}

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
    pub language: String,
    /// 标记 template 字段是否仍为"出厂默认"。true = 默认，前端应使用 i18n 翻译；
    /// false = 用户已编辑过，前端应原样显示 template 内容。
    pub template_i18n: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            template: DEFAULT_TEMPLATE.iter().map(|s| s.to_string()).collect(),
            trigger_time: DEFAULT_TRIGGER_TIME.to_string(),
            workdays_only: true,
            autostart: false,
            language: "zh-CN".to_string(),
            template_i18n: true,
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
        language: get_setting(conn, "language")
            .ok()
            .flatten()
            .filter(|v| v == "zh-CN" || v == "en-US")
            .unwrap_or(default.language),
        template_i18n: get_setting(conn, "template_i18n")
            .ok()
            .flatten()
            .map(|v| v == "true")
            // 关键：旧用户从没有 template_i18n key 的数据库升级时，如果 template 仍是默认中文，
            // 仍按"是默认"对待 → 切语言时能翻译；如果 template 已被改过（用户自定义），
            // 也按"是默认"对待会有问题，但保守策略优先翻译覆盖，用户切回去时如发现被翻译，
            // 引导用户主动保存一次。
            .unwrap_or(default.template_i18n),
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
    set_setting(conn, "language", &settings.language)?;
    set_setting(conn, "template_i18n", &settings.template_i18n.to_string())?;
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

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    /// 用临时目录开 DB，调用 init() 建表，返回 Connection。
    /// TempDir 在测试结束时自动清理。
    fn fresh_conn() -> (TempDir, Connection) {
        let dir = TempDir::new().expect("tempdir");
        let conn = init(dir.path()).expect("init db");
        (dir, conn)
    }

    // ----- today_answered 行为 -----

    #[test]
    fn today_answered_is_false_on_empty_db() {
        let (_dir, conn) = fresh_conn();
        assert!(!today_answered(&conn).unwrap());
    }

    #[test]
    fn today_answered_is_true_after_upsert_today() {
        let (_dir, conn) = fresh_conn();
        let today_str = today();
        upsert_record(&conn, &today_str, &["a".into(), "b".into(), "c".into()]).unwrap();
        assert!(today_answered(&conn).unwrap());
    }

    #[test]
    fn today_answered_uses_today_date_only() {
        // 昨天填的 record 不应被当成"今天已填"
        let (_dir, conn) = fresh_conn();
        upsert_record(
            &conn,
            "2020-01-01",
            &["yesterday1".into(), "y2".into(), "y3".into()],
        )
        .unwrap();
        assert!(
            !today_answered(&conn).unwrap(),
            "昨天的 record 不应让 today_answered 返回 true"
        );
    }

    // ----- 关键 bug 场景：跨天后用过去日期存 record，应被 today_answered 当作"未填" -----
    // 这条测试模拟"前端用锁定日期 saveRecord"——存的是昨天（弹窗时锁定），
    // 即使 Local::now() 现在是今天，today_answered 也不应误报为 true。

    #[test]
    fn save_with_past_date_does_not_count_as_today() {
        let (_dir, conn) = fresh_conn();
        let yesterday = "2020-01-01";
        upsert_record(&conn, yesterday, &["x".into(), "y".into(), "z".into()]).unwrap();

        // 直接通过 get_record 查询"今天"（这里无法真跨日，但语义可验证）：
        // records 表里有 yesterday 的 record，today() 返回的日期没 record。
        assert!(!today_answered(&conn).unwrap());
    }

    // ----- upsert_record 行为：ON CONFLICT(date) DO UPDATE -----

    #[test]
    fn upsert_inserts_then_updates_same_date() {
        let (_dir, conn) = fresh_conn();
        let d = "2025-03-15";
        upsert_record(&conn, d, &["a".into(), "b".into(), "c".into()]).unwrap();
        let r1 = get_record(&conn, d).unwrap().expect("first record");
        assert_eq!(r1.answers, vec!["a", "b", "c"]);

        upsert_record(&conn, d, &["x".into(), "y".into(), "z".into()]).unwrap();
        let r2 = get_record(&conn, d).unwrap().expect("updated record");
        assert_eq!(r2.answers, vec!["x", "y", "z"]);
        assert_eq!(r2.date, d);
    }

    #[test]
    fn upsert_with_different_dates_creates_separate_rows() {
        let (_dir, conn) = fresh_conn();
        upsert_record(&conn, "2025-01-01", &["a".into(), "b".into(), "c".into()]).unwrap();
        upsert_record(&conn, "2025-01-02", &["d".into(), "e".into(), "f".into()]).unwrap();

        let r1 = get_record(&conn, "2025-01-01").unwrap().unwrap();
        let r2 = get_record(&conn, "2025-01-02").unwrap().unwrap();
        assert_eq!(r1.answers, vec!["a", "b", "c"]);
        assert_eq!(r2.answers, vec!["d", "e", "f"]);
    }

    // ----- 关键 bug 场景：模拟"前端漂移"——用今天日期存 record，模拟"0824 弹窗 0825 保存"被错误存为 0825 -----
    // 验证：一旦 record.date 真的写成今天，today_answered 就会返回 true（这是期望的，不是 bug）。
    // 这条测试是"反向验证"——确认"如果前端没锁定，bug 真的会发生"。

    #[test]
    fn drift_simulation_save_with_today_date_is_answered() {
        let (_dir, conn) = fresh_conn();
        // 模拟"前端 today() 现算"：saveRecord(today()) 写入 today 的 record
        let today_str = today();
        upsert_record(&conn, &today_str, &["a".into(), "b".into(), "c".into()]).unwrap();
        // 后端 today_answered 查到今天有 record
        assert!(today_answered(&conn).unwrap());
    }

    // ----- save_settings 持久化 -----

    #[test]
    fn save_and_get_settings_roundtrip() {
        let (_dir, conn) = fresh_conn();
        let mut s = Settings::default();
        s.trigger_time = "07:30".into();
        s.workdays_only = false;
        s.autostart = true;
        s.language = "en-US".into();
        s.template_i18n = false;
        save_settings(&conn, &s).unwrap();

        let got = get_settings(&conn);
        assert_eq!(got.trigger_time, "07:30");
        assert!(!got.workdays_only);
        assert!(got.autostart);
        assert_eq!(got.language, "en-US");
        assert!(!got.template_i18n);
    }

    #[test]
    fn unknown_language_falls_back_to_default() {
        let (_dir, conn) = fresh_conn();
        let mut s = Settings::default();
        s.language = "klingon".into();
        save_settings(&conn, &s).unwrap();

        let got = get_settings(&conn);
        assert_eq!(got.language, "zh-CN", "未知 locale 必须回退默认");
    }

    #[test]
    fn get_settings_returns_defaults_when_empty() {
        let (_dir, conn) = fresh_conn();
        let s = get_settings(&conn);
        assert_eq!(s.trigger_time, DEFAULT_TRIGGER_TIME);
        assert!(s.workdays_only);
        assert!(!s.autostart);
        assert_eq!(s.language, "zh-CN");
        assert!(s.template_i18n);
    }
}
