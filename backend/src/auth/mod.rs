use axum::routing::{get, post, delete};
use axum::Router;
use sqlx::sqlite::SqlitePoolOptions;
use std::{fs, env, path::PathBuf};

mod db;
mod models;
pub mod handlers;

use crate::protect; // макрос для сокращённой записи middleware

pub async fn setup_router() -> Router {
    let cwd = env::current_dir().expect("❌ Cannot get current dir");
    println!("🔍 Current working dir: {}", cwd.display());

    // 🗂️ Подготавливаем папку под базу
    let db_dir: PathBuf = if cwd.ends_with("backend") {
        cwd.join("data")
    } else {
        cwd.join("backend/data")
    };

    fs::create_dir_all(&db_dir).expect("❌ Failed to create backend/data directory");
    let db_path = db_dir.join("users.db");

    if !db_path.exists() {
        match fs::File::create(&db_path) {
            Ok(_) => println!("🆕 Created empty database file at {}", db_path.display()),
            Err(e) => panic!("❌ Failed to create database file: {}", e),
        }
    }

    let db_url = format!("sqlite://{}", db_path.display());
    println!("📦 Using database at: {}", db_url);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .unwrap_or_else(|e| panic!("❌ Cannot connect to users.db: {e:?}"));

    // 🧩 Применяем миграцию
    if let Err(e) = sqlx::query(models::USER_MIGRATION).execute(&pool).await {
        panic!("❌ Migration failed: {}", e);
    }

    println!("✅ Database ready and migrations applied");

    // 🚦 Основной маршрутизатор
    Router::new()
        // 🔐 Авторизация и установка
        .route("/api/setup", post(handlers::setup))
        .route("/api/setup/status", post(handlers::check_initialized))
        .route("/api/login", post(handlers::login))
        .route("/api/logout", post(handlers::logout))
        .route("/api/me", post(handlers::me))

        // 👥 Пользователи
        .route(
            "/api/users/list",
            get(handlers::list_users)
                .route_layer(protect!(pool, "Admin")), // Admin + SuperAdmin
        )
        .route(
            "/api/users/create",
            post(handlers::create_user)
                .route_layer(protect!(pool, "SuperAdmin")),
        )
        .route(
            "/api/users/update",
            post(handlers::update_user)
                .route_layer(protect!(pool, "Admin")),
        )
        .route(
            "/api/users/delete/:id",
            delete(handlers::delete_user)
                .route_layer(protect!(pool, "SuperAdmin")),
        )

        // 🧱 состояние соединения
        .with_state(pool)
}
