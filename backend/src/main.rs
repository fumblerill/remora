use axum::{
    extract::{DefaultBodyLimit, Multipart},
    http::{HeaderValue, Method},
    routing::{get, post},
    Json, Router,
};
use serde::Serialize;
use std::{
    env,
    io::{BufReader, Cursor},
    net::{SocketAddr, ToSocketAddrs},
    time::{Duration, Instant},
};
use tokio::net::TcpListener;
use tower_http::cors::CorsLayer;

mod converter;
use converter::{convert_csv_to_vec, convert_ods_to_vec, convert_xlsx_to_vec};

mod auth;
use auth::setup_router;

mod middleware;

#[derive(Serialize)]
struct UploadResponse {
    columns: Vec<String>,
    rows: Vec<Vec<String>>,
}

async fn upload(mut multipart: Multipart) -> Json<UploadResponse> {
    let mut columns = vec![];
    let mut rows = vec![];

    while let Some(field) = multipart.next_field().await.unwrap() {
        if field.name().unwrap_or("") == "file" {
            let filename = field.file_name().unwrap_or("неизвестно").to_string();
            let data = field.bytes().await.unwrap();
            let size_kb = (data.len() as f64) / 1024.0;
            let start = Instant::now();
            let ext = filename.to_lowercase();

            let ext_clone = ext.clone();
            let data_clone = data.to_vec();

            let (cols, rows_data) = tokio::task::spawn_blocking(move || {
                let reader = BufReader::new(Cursor::new(data_clone));
                if ext_clone.ends_with(".csv") {
                    convert_csv_to_vec(reader)
                } else if ext_clone.ends_with(".xlsx") {
                    convert_xlsx_to_vec(reader)
                } else if ext_clone.ends_with(".ods") {
                    convert_ods_to_vec(reader)
                } else {
                    Err(std::io::Error::new(std::io::ErrorKind::InvalidInput, "unsupported"))
                }
            })
            .await
            .unwrap()
            .unwrap_or((vec![], vec![]));

            let duration = start.elapsed();
            let nrows = rows_data.len();
            let ncols = if !rows_data.is_empty() { rows_data[0].len() } else { 0 };
            log_file_info(&filename, &ext, size_kb, nrows, ncols, duration);

            columns = cols;
            rows = rows_data;
        }
    }

    Json(UploadResponse { columns, rows })
}

fn log_file_info(name: &str, ext: &str, size_kb: f64, rows: usize, cols: usize, dur: Duration) {
    println!(
        "✅ {:<25} | {:<5} | {:>7.2} KB | Rows {:>6} | Cols {:>4} | {:>6.1} ms",
        name, ext, size_kb, rows, cols, dur.as_millis()
    );
}

fn append_port(origin: &str, port: &str) -> String {
    if port.is_empty() || port == "0" {
        return origin.to_string();
    }

    if let Some((_, tail)) = origin.rsplit_once(':') {
        if tail.chars().all(|c| c.is_ascii_digit()) {
            return origin.to_string();
        }
    }

    format!("{}:{}", origin, port)
}

fn push_origin(origins: &mut Vec<String>, origin: String) {
    let trimmed = origin.trim();
    if trimmed.is_empty() {
        return;
    }

    if !origins.iter().any(|existing| existing == trimmed) {
        origins.push(trimmed.to_string());
    }
}

#[tokio::main]
async fn main() {
    dotenv::dotenv().ok();

    let rust_port = env::var("RUST_PORT").unwrap_or_else(|_| "8080".to_string());
    let front_port = env::var("FRONT_PORT").unwrap_or_else(|_| "3000".to_string());
    let base_url = env::var("BASE_URL").unwrap_or_else(|_| "http://localhost".to_string());
    let bind_addr = format!("0.0.0.0:{}", rust_port);

    // ───────────────────────────────
    // 🌐 Формируем CORS Origins
    // ───────────────────────────────
    let cors_direct = env::var("CORS_ORIGINS").ok().map(|value| value.trim().to_string());

    let cors_raw = if let Some(origins) = cors_direct.as_ref().filter(|s| !s.is_empty()) {
        origins.to_owned()
    } else {
        env::var("CORS_ORIGINS_TEMPLATE").unwrap_or_else(|_| {
            "http://localhost:{FRONT_PORT},http://127.0.0.1:{FRONT_PORT},http://0.0.0.0:{FRONT_PORT}"
                .to_string()
        })
    };

    let cors_string = cors_raw
        .replace("{FRONT_PORT}", &front_port)
        .replace("{RUST_PORT}", &rust_port)
        .replace("{BASE_URL}", &base_url);

    let mut origin_strings: Vec<String> = cors_string
        .split(',')
        .filter_map(|s| {
            let trimmed = s.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        })
        .collect();

    for key in ["FRONTEND_ORIGIN", "NEXT_PUBLIC_FRONTEND_ORIGIN"] {
        if let Ok(value) = env::var(key) {
            push_origin(&mut origin_strings, value);
        }
    }

    let derived_front_origin = append_port(&base_url, &front_port);
    push_origin(&mut origin_strings, derived_front_origin);

    let mut allowed_origins = Vec::new();
    let mut log_lines = Vec::new();

    for origin in origin_strings {
        match origin.parse::<HeaderValue>() {
            Ok(value) => {
                log_lines.push(origin);
                allowed_origins.push(value);
            }
            Err(_) => {
                eprintln!("⚠️ Invalid CORS origin skipped: {}", origin);
            }
        }
    }

    println!("🌐 Allowed origins (CORS):");
    for origin in &log_lines {
        println!("   → {}", origin);
    }

    // ───────────────────────────────
    // 🔐 CORS middleware
    // ───────────────────────────────
    let cors = CorsLayer::new()
        .allow_origin(allowed_origins)
        .allow_methods([Method::GET, Method::POST, Method::DELETE, Method::OPTIONS])
        .allow_headers([
            axum::http::header::CONTENT_TYPE,
            axum::http::header::AUTHORIZATION,
        ])
        .allow_credentials(true)
        .max_age(Duration::from_secs(3600));

    // ───────────────────────────────
    // Роутер — теперь CORS применяется ГЛОБАЛЬНО
    // ───────────────────────────────
    let app = Router::new()
        .route("/api/upload", post(upload))
        .merge(auth::setup_router().await)
        .route("/api/ping", get(|| async { "pong" })) // тестовый endpoint
        .layer(DefaultBodyLimit::max(50 * 1024 * 1024))
        .layer(cors); // 👈 CORS добавлен последним — применяется ко всем роутам

    println!("🚀 Server running at {}", bind_addr);

    let addr: SocketAddr = bind_addr.to_socket_addrs().unwrap().next().unwrap();
    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
