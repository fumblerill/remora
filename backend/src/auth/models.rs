use serde::{Deserialize, Serialize};
use sqlx::FromRow;

pub const USER_MIGRATION: &str = r#"
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT NOT NULL UNIQUE,
    hashed_password TEXT NOT NULL,
    role TEXT NOT NULL,
    dashboards TEXT DEFAULT '[]'
);
"#;

#[derive(Serialize, Deserialize, FromRow, Debug, Clone)]
pub struct User {
    pub id: i64,
    pub login: String,
    pub hashed_password: String,
    pub role: String,
    pub dashboards: String,
}

#[derive(Deserialize)]
pub struct UserInput {
    pub login: String,
    pub password: String,
}
