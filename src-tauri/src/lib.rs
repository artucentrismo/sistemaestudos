use chrono::Utc;
use rusqlite::{params, Connection};
use serde::Serialize;
use std::{fs, sync::Mutex};
use tauri::{Manager, State};

struct Database(Mutex<Connection>);

#[derive(Serialize)]
struct Discipline {
    id: String,
    name: String,
    description: Option<String>,
    position: i64,
}

#[tauri::command]
fn db_health(database: State<'_, Database>) -> Result<String, String> {
    let connection = database.0.lock().map_err(|e| e.to_string())?;
    let value: i64 = connection.query_row("SELECT 1", [], |row| row.get(0)).map_err(|e| e.to_string())?;
    Ok(if value == 1 { "SQLite local conectado".to_string() } else { "Banco indisponível".to_string() })
}

#[tauri::command]
fn list_disciplines(database: State<'_, Database>) -> Result<Vec<Discipline>, String> {
    let connection = database.0.lock().map_err(|e| e.to_string())?;
    let mut statement = connection
        .prepare("SELECT id, name, description, position FROM disciplines ORDER BY position, name")
        .map_err(|e| e.to_string())?;
    let rows = statement
        .query_map([], |row| Ok(Discipline {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            position: row.get(3)?,
        }))
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn create_discipline(name: String, description: Option<String>, database: State<'_, Database>) -> Result<Discipline, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() || trimmed.len() > 120 {
        return Err("Informe um nome de disciplina com até 120 caracteres.".to_string());
    }
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let connection = database.0.lock().map_err(|e| e.to_string())?;
    let position: i64 = connection
        .query_row("SELECT COALESCE(MAX(position), -1) + 1 FROM disciplines", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    connection.execute(
        "INSERT INTO disciplines (id, name, description, position, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?5)",
        params![id, trimmed, description, position, now],
    ).map_err(|e| e.to_string())?;
    Ok(Discipline { id, name: trimmed.to_string(), description, position })
}

use uuid::Uuid;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            fs::create_dir_all(&data_dir)?;
            let database_path = data_dir.join("estudosflix.sqlite3");
            let connection = Connection::open(database_path)?;
            connection.execute_batch("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;")?;
            connection.execute_batch(include_str!("../migrations/0001_initial.sql"))?;
            app.manage(Database(Mutex::new(connection)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![db_health, list_disciplines, create_discipline])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o EstudosFlix");
}
