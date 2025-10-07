use axum::routing::{get, post, delete};
use axum::Router;
use axum::middleware::from_fn_with_state;
use sqlx::sqlite::SqlitePoolOptions;
use std::{fs, env, path::PathBuf};

mod db;
mod models;
pub mod handlers;

use crate::middleware::auth::require_role;

pub async fn setup_router() -> Router {
    let cwd = env::current_dir().expect("❌ Cannot get current dir");
    println!("🔍 Current working dir: {}", cwd.display());

    let db_dir: PathBuf = if cwd.ends_with("backend") {
        cwd.join("data")
    } else {
        cwd.join("backend/data")
    };

    println!("🔍 Target DB dir: {}", db_dir.display());

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

    if let Err(e) = sqlx::query(models::USER_MIGRATION).execute(&pool).await {
        panic!("❌ Migration failed: {}", e);
    }

    println!("✅ Database ready and migrations applied");

    Router::new()
        // 🔐 Авторизация
        .route("/api/setup", post(handlers::setup))
        .route("/api/setup/status", post(handlers::check_initialized))
        .route("/api/login", post(handlers::login))
        .route("/api/logout", post(handlers::logout))
        .route("/api/me", post(handlers::me))
        .route("/api/check_initialized", post(handlers::check_initialized))

        // 👥 Пользователи
        .route("/api/users/list", get(handlers::list_users))
        .route(
            "/api/users/create",
            post(handlers::create_user)
                .route_layer(from_fn_with_state(pool.clone(), |state, jar, req, next| async move {
                    require_role(state, jar, req, next, "SuperAdmin").await
                })),
        )
        .route(
            "/api/users/update",
            post(handlers::update_user)
                .route_layer(from_fn_with_state(pool.clone(), |state, jar, req, next| async move {
                    require_role(state, jar, req, next, "SuperAdmin").await
                })),
        )
        .route("/api/users/delete/:id", delete(handlers::delete_user))
        .with_state(pool)
}
