use axum::routing::{delete, get, post};
use axum::Router;
use sqlx::sqlite::SqlitePoolOptions;
use std::{env, fs, path::PathBuf};

mod db;
pub mod handlers;
mod models;

use crate::protect;

pub async fn setup_router() -> Router {
    let cwd = env::current_dir().expect("❌ Cannot get current dir");
    println!("🔍 Current working dir: {}", cwd.display());

    // 🗂️ Универсальный путь для базы данных
    // 1. Если есть /app/data → используем его (Docker)
    // 2. Иначе — backend/data (локальная разработка)
    let db_dir = if PathBuf::from("/app/data").exists() {
        PathBuf::from("/app/data")
    } else if cwd.join("data").exists() {
        cwd.join("data")
    } else {
        cwd.join("backend/data")
    };

    // ✅ Создаём директорию, если её нет
    if let Err(e) = fs::create_dir_all(&db_dir) {
        eprintln!(
            "⚠️ Failed to ensure data dir: {} — {:?}",
            db_dir.display(),
            e
        );
    }

    let db_path = db_dir.join("users.db");

    // ✅ Создаём файл, если он не существует
    if !db_path.exists() {
        match fs::File::create(&db_path) {
            Ok(_) => println!("🆕 Created empty database file at {}", db_path.display()),
            Err(e) => eprintln!("⚠️ Failed to create database file: {}", e),
        }
    }

    // 🧩 Формируем URL для SQLite
    let db_url = format!("sqlite://{}", db_path.display());
    println!("📦 Using database at: {}", db_url);

    // 🗄️ Подключаемся
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .unwrap_or_else(|e| panic!("❌ Cannot connect to users.db: {e:?}"));

    // ⚙️ Применяем миграцию
    if let Err(e) = sqlx::query(models::USER_MIGRATION).execute(&pool).await {
        panic!("❌ Migration failed: {}", e);
    }

    println!("✅ Database ready and migrations applied");

    // 🚦 Основной маршрутизатор
    Router::new()
        .route("/api/setup", post(handlers::setup))
        .route("/api/setup/status", post(handlers::check_initialized))
        .route("/api/login", post(handlers::login))
        .route("/api/logout", post(handlers::logout))
        .route("/api/me", post(handlers::me))
        .route(
            "/api/users/list",
            get(handlers::list_users).route_layer(protect!(pool, "Admin")),
        )
        .route(
            "/api/users/create",
            post(handlers::create_user).route_layer(protect!(pool, "SuperAdmin")),
        )
        .route(
            "/api/users/update",
            post(handlers::update_user).route_layer(protect!(pool, "Admin")),
        )
        .route(
            "/api/users/delete/:id",
            delete(handlers::delete_user).route_layer(protect!(pool, "SuperAdmin")),
        )
        .with_state(pool)
}
