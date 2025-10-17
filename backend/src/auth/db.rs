use crate::auth::models::User;
use sqlx::{Pool, Sqlite};

pub async fn get_user_by_login(pool: &Pool<Sqlite>, login: &str) -> Option<User> {
    sqlx::query_as::<_, User>("SELECT * FROM users WHERE login = ?")
        .bind(login)
        .fetch_optional(pool)
        .await
        .ok()?
}

pub async fn insert_user(
    pool: &Pool<Sqlite>,
    login: &str,
    hashed_password: &str,
    role: &str,
) -> sqlx::Result<()> {
    sqlx::query("INSERT INTO users (login, hashed_password, role) VALUES (?, ?, ?)")
        .bind(login)
        .bind(hashed_password)
        .bind(role)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn user_count(pool: &Pool<Sqlite>) -> i64 {
    sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users")
        .fetch_one(pool)
        .await
        .unwrap_or(0)
}
