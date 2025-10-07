use axum::{
    extract::{State, Json, Path},
    http::{StatusCode, HeaderMap},
};
use axum_extra::extract::cookie::{Cookie, CookieJar, SameSite};
use serde_json::json;
use sqlx::{Pool, Sqlite};
use crate::auth::db;
use crate::auth::models::{User, UserInput};
use argon2::{Argon2, PasswordHasher, PasswordVerifier};
use argon2::password_hash::SaltString;
use rand_core::OsRng;
use jsonwebtoken::{encode, decode, Header, EncodingKey, DecodingKey, Validation, Algorithm};
use chrono::{Utc, Duration};
use std::env;
use time::Duration as TimeDuration;

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct Claims {
    pub sub: String,
    pub role: String,
    pub exp: usize,
}

pub async fn setup(
    State(pool): State<Pool<Sqlite>>,
    Json(payload): Json<UserInput>,
) -> (StatusCode, Json<serde_json::Value>) {
    let count = db::user_count(&pool).await;
    if count > 0 {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({"error": "Already initialized"})),
        );
    }

    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let hash = argon2
        .hash_password(payload.password.as_bytes(), &salt)
        .unwrap()
        .to_string();

    if let Err(e) = db::insert_user(&pool, &payload.login, &hash, "SuperAdmin").await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        );
    }

    (StatusCode::OK, Json(json!({"status": "SuperAdmin created"})))
}

pub async fn login(
    State(pool): State<Pool<Sqlite>>,
    jar: CookieJar,
    Json(payload): Json<UserInput>,
) -> (StatusCode, HeaderMap, Json<serde_json::Value>) {
    let Some(user) = db::get_user_by_login(&pool, &payload.login).await else {
        return (
            StatusCode::UNAUTHORIZED,
            HeaderMap::new(),
            Json(json!({"error": "Invalid login"})),
        );
    };

    let parsed_hash = match argon2::PasswordHash::new(&user.hashed_password) {
        Ok(h) => h,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                HeaderMap::new(),
                Json(json!({"error": "Hash parse failed"})),
            )
        }
    };

    let argon2 = Argon2::default();
    let valid = argon2.verify_password(payload.password.as_bytes(), &parsed_hash).is_ok();

    if !valid {
        return (
            StatusCode::UNAUTHORIZED,
            HeaderMap::new(),
            Json(json!({"error": "Wrong password"})),
        );
    }

    let secret = env::var("JWT_SECRET").unwrap_or_else(|_| "dev_secret".to_string());
    let expiration = Utc::now() + Duration::hours(8);

    let claims = Claims {
        sub: user.login.clone(),
        role: user.role.clone(),
        exp: expiration.timestamp() as usize,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    ).unwrap();

    let mut cookie = Cookie::new("remora_token", token);
    cookie.set_path("/");
    cookie.set_http_only(true);
    cookie.set_same_site(SameSite::Lax);
    cookie.set_max_age(TimeDuration::hours(8));

    let jar = jar.add(cookie);
    let mut headers = HeaderMap::new();

    if let Some(cookie_str) = jar.get("remora_token") {
        headers.insert(
            axum::http::header::SET_COOKIE,
            cookie_str.to_string().parse().unwrap(),
        );
    }

    (
        StatusCode::OK,
        headers,
        Json(json!({
            "role": user.role,
            "user": user.login
        })),
    )
}

pub async fn me(jar: CookieJar) -> (StatusCode, Json<serde_json::Value>) {
    let Some(token_cookie) = jar.get("remora_token") else {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({"error": "Unauthorized"})),
        );
    };

    let token = token_cookie.value();
    let secret = env::var("JWT_SECRET").unwrap_or_else(|_| "dev_secret".to_string());
    let validation = Validation::new(Algorithm::HS256);

    match decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    ) {
        Ok(data) => (
            StatusCode::OK,
            Json(json!({
                "user": data.claims.sub,
                "role": data.claims.role
            })),
        ),
        Err(_) => (
            StatusCode::UNAUTHORIZED,
            Json(json!({"error": "Invalid token"})),
        ),
    }
}

pub async fn logout(jar: CookieJar) -> (StatusCode, HeaderMap, Json<serde_json::Value>) {
    let mut cookie = Cookie::new("remora_token", "");
    cookie.set_path("/");
    cookie.set_http_only(true);
    cookie.set_same_site(SameSite::Lax);
    cookie.set_max_age(TimeDuration::seconds(0));

    let mut headers = HeaderMap::new();
    headers.insert(
        axum::http::header::SET_COOKIE,
        "remora_token=deleted; Path=/; Max-Age=0".parse().unwrap(),
    );

    (
        StatusCode::OK,
        headers,
        Json(json!({"status": "logged out"})),
    )
}

pub async fn check_initialized(State(pool): State<Pool<Sqlite>>) -> Json<serde_json::Value> {
    let count = crate::auth::db::user_count(&pool).await;
    Json(json!({ "initialized": count > 0 }))
}

#[derive(serde::Deserialize)]
pub struct CreateUserInput {
    pub login: String,
    pub password: String,
    pub role: String,
}

#[derive(serde::Deserialize)]
pub struct UpdateUserInput {
    pub id: i64,
    pub role: Option<String>,
    pub dashboards: Option<String>,
}

pub async fn list_users(State(pool): State<Pool<Sqlite>>) -> (StatusCode, Json<serde_json::Value>) {
    let users: Vec<User> = match sqlx::query_as::<_, User>("SELECT * FROM users")
        .fetch_all(&pool)
        .await
    {
        Ok(u) => u,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": e.to_string() })),
            )
        }
    };

    let safe_users: Vec<_> = users
        .into_iter()
        .map(|u| {
            json!({
                "id": u.id,
                "login": u.login,
                "role": u.role,
                "dashboards": serde_json::from_str::<serde_json::Value>(&u.dashboards).unwrap_or(json!([]))
            })
        })
        .collect();

    (StatusCode::OK, Json(json!({ "users": safe_users })))
}

pub async fn create_user(
    State(pool): State<Pool<Sqlite>>,
    Json(payload): Json<CreateUserInput>,
) -> (StatusCode, Json<serde_json::Value>) {
    if payload.login.trim().is_empty() || payload.password.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Login and password required" })),
        );
    }

    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let hashed = argon2
        .hash_password(payload.password.as_bytes(), &salt)
        .unwrap()
        .to_string();

    match sqlx::query("INSERT INTO users (login, hashed_password, role, dashboards) VALUES (?, ?, ?, '[]')")
        .bind(&payload.login)
        .bind(&hashed)
        .bind(&payload.role)
        .execute(&pool)
        .await
    {
        Ok(_) => (StatusCode::OK, Json(json!({ "status": "created" }))),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        ),
    }
}

pub async fn update_user(
    State(pool): State<Pool<Sqlite>>,
    Json(payload): Json<UpdateUserInput>,
) -> (StatusCode, Json<serde_json::Value>) {
    let mut query = String::from("UPDATE users SET ");
    let mut fields = Vec::new();

    if let Some(role) = &payload.role {
        fields.push(format!("role = '{}'", role));
    }
    if let Some(dashboards) = &payload.dashboards {
        fields.push(format!("dashboards = '{}'", dashboards));
    }

    if fields.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Nothing to update" })),
        );
    }

    query.push_str(&fields.join(", "));
    query.push_str(&format!(" WHERE id = {}", payload.id));

    match sqlx::query(&query).execute(&pool).await {
        Ok(_) => (StatusCode::OK, Json(json!({ "status": "updated" }))),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        ),
    }
}

pub async fn delete_user(
    State(pool): State<Pool<Sqlite>>,
    Path(id): Path<i64>,
) -> (StatusCode, Json<serde_json::Value>) {
    match sqlx::query("DELETE FROM users WHERE id = ?")
        .bind(id)
        .execute(&pool)
        .await
    {
        Ok(res) if res.rows_affected() > 0 => (StatusCode::OK, Json(json!({ "status": "deleted" }))),
        Ok(_) => (StatusCode::NOT_FOUND, Json(json!({ "error": "User not found" }))),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        ),
    }
}
