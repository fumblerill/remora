use axum::{
    extract::{State, Request},
    http::{StatusCode},
    middleware::Next,
    response::Response,
};
use axum_extra::extract::cookie::CookieJar;
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};
use sqlx::Pool;
use sqlx::Sqlite;
use serde_json::json;
use crate::auth::handlers::Claims;
use std::env;

/// Проверка роли пользователя по JWT-токену из куки.
/// Если `required_role` не совпадает с ролью токена → 403.
pub async fn require_role(
    State(_pool): State<Pool<Sqlite>>,
    jar: CookieJar,
    mut req: Request,
    next: Next,
    required_role: &'static str,
) -> Result<Response, (StatusCode, axum::Json<serde_json::Value>)> {
    // достаём токен из куки
    let Some(token_cookie) = jar.get("remora_token") else {
        return Err((
            StatusCode::UNAUTHORIZED,
            axum::Json(json!({"error": "No token"})),
        ));
    };

    let token = token_cookie.value();
    let secret = env::var("JWT_SECRET").unwrap_or_else(|_| "dev_secret".to_string());

    // проверяем JWT
    let validation = Validation::new(Algorithm::HS256);
    let claims = match decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    ) {
        Ok(data) => data.claims,
        Err(_) => {
            return Err((
                StatusCode::UNAUTHORIZED,
                axum::Json(json!({"error": "Invalid token"})),
            ));
        }
    };

    // проверка роли
    if claims.role != required_role && claims.role != "SuperAdmin" {
        return Err((
            StatusCode::FORBIDDEN,
            axum::Json(json!({"error": "Forbidden"})),
        ));
    }

    // добавляем в request.extensions() для доступа дальше
    req.extensions_mut().insert(claims);

    // запускаем следующий слой
    Ok(next.run(req).await)
}

#[macro_export]
macro_rules! protect {
    ($pool:expr, $role:expr) => {
        axum::middleware::from_fn_with_state($pool.clone(), |state, jar, req, next| async move {
            $crate::middleware::auth::require_role(state, jar, req, next, $role).await
        })
    };
}
