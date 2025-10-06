use axum::{Router, routing::post};
use sqlx::sqlite::SqlitePoolOptions;
use std::{fs, env, path::PathBuf};
use std::os::unix::fs::MetadataExt;

mod db;
mod models;
mod handlers;

pub use handlers::{setup, login, me};

pub async fn setup_router() -> Router {
    let cwd = env::current_dir().expect("❌ Cannot get current dir");
    println!("🔍 Current working dir: {}", cwd.display());

    let db_dir: PathBuf = if cwd.ends_with("backend") {
        cwd.join("data")
    } else {
        cwd.join("backend/data")
    };

    println!("🔍 Target DB dir: {}", db_dir.display());

    // Создаём директорию, если её нет
    fs::create_dir_all(&db_dir).expect("❌ Failed to create backend/data directory");

    // Полный путь к users.db
    let db_path = db_dir.join("users.db");

    // 🔧 Если файла нет — создаём его вручную (решает проблему с SQLx/SQLite)
    if !db_path.exists() {
        match fs::File::create(&db_path) {
            Ok(_) => println!("🆕 Created empty database file at {}", db_path.display()),
            Err(e) => panic!("❌ Failed to create database file: {}", e),
        }
    }

    let db_url = format!("sqlite://{}", db_path.display());
    println!("📦 Using database at: {}", db_url);

    // Подключаемся
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .unwrap_or_else(|e| panic!("❌ Cannot connect to users.db: {e:?}"));

    // Миграция
    if let Err(e) = sqlx::query(models::USER_MIGRATION).execute(&pool).await {
        panic!("❌ Migration failed: {}", e);
    }

    println!("✅ Database ready and migrations applied");

    Router::new()
        .route("/api/setup", post(handlers::setup))
        .route("/api/setup/status", post(handlers::check_initialized))
        .route("/api/login", post(handlers::login))
        .route("/api/logout", post(handlers::logout))
        .route("/api/me", post(handlers::me))
        .route("/api/check_initialized", post(handlers::check_initialized))
        .with_state(pool)
}
