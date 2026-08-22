# ADR-0002：本地 SQLite 明文存储（records + settings 表）

- 状态：已接受
- 日期：2026-08-22

## 背景

三省记录与设置需要本地持久化。选型范围：SQLite、JSON 文件、`tauri-plugin-store`。

## 决策

- 用 **rusqlite（bundled）** 直接打开应用数据目录下的 `scan-lun.db`，存两张表：
  - `records(id, date TEXT UNIQUE, answers TEXT JSON, created_at, updated_at)` — 每日一份，`date` 唯一，同日重写覆盖。
  - `settings(key TEXT PK, value TEXT)` — 存 template（JSON 数组）、trigger_time、workdays_only、autostart。
- DB 连接以 `Db(Mutex<Connection>)` 作为 `tauri::State` 管理。
- **明文**存储，不做加密。

## 理由

- 每日一份的结构用 `date UNIQUE` + `INSERT ... ON CONFLICT DO UPDATE` 即可表达「同日覆盖」，不需要 ORM。
- 设置存 key-value 表而非 `tauri-plugin-store`，少一个插件依赖，且与记录同库便于原子迁移。
- 明文：数据是用户自己的思考记录，本地文件即可；加密不引入（见范围外）。

## 后果

- 前端所有读写经 `#[tauri::command]` + `Mutex` 串行化；连接锁竞争在单用户场景可忽略。
- answers 用 JSON 文本存列，模板顺序变更后历史记录按索引对齐，需在导出时按当前模板渲染（已处理）。
