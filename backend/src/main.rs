use axum::{
    extract::{DefaultBodyLimit, Multipart},
    http::{HeaderValue, Method},
    routing::post,
    Json, Router,
};
use serde::Serialize;
use std::{
    env,
    io::{BufReader, Cursor},
    net::SocketAddr,
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

            // Копия для spawn_blocking
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
    let fmt = if ext.ends_with(".csv") {
        "CSV"
    } else if ext.ends_with(".xlsx") {
        "XLSX"
    } else if ext.ends_with(".ods") {
        "ODS"
    } else {
        "UNK"
    };
    println!(
        "✅ {:<25} | {:<5} | {:>7.2} KB | Rows {:>6} | Cols {:>4} | {:>6.1} ms",
        name, fmt, size_kb, rows, cols, dur.as_millis()
    );
}

#[tokio::main]
async fn main() {
    // 📦 Загружаем .env только в DEV-режиме
    let dev_mode = std::env::var("DEV").unwrap_or_else(|_| "false".to_string()) == "true";
    if dev_mode {
        dotenv::dotenv().ok();
        println!("🧩 DEV mode: loading .env from filesystem");
    } else {
        println!("🚀 Production mode: using injected env vars");
    }

    // 🔧 Переменные окружения
    let frontend_origin =
        env::var("FRONTEND_ORIGIN").unwrap_or_else(|_| "http://localhost:3000".to_string());
    let bind_addr = env::var("BIND_ADDR").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = env::var("RUST_PORT").unwrap_or_else(|_| "8080".to_string())
        .parse::<u16>().unwrap_or(8080);

    println!("🌐 Allowed origin: {}", frontend_origin);

    // 🧱 CORS
    let cors = CorsLayer::new()
        .allow_origin(frontend_origin.parse::<HeaderValue>().unwrap())
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([
            axum::http::header::CONTENT_TYPE,
            axum::http::header::AUTHORIZATION,
        ])
        .allow_credentials(true)
        .max_age(Duration::from_secs(3600));

    // 🚀 Приложение
    let app = Router::new()
        .route("/api/upload", post(upload))
        .merge(auth::setup_router().await)
        .layer(cors)
        .layer(DefaultBodyLimit::max(50 * 1024 * 1024)); // 50 МБ

    let addr = SocketAddr::from((bind_addr.parse::<std::net::IpAddr>().unwrap(), port));
    println!("🚀 Server running at http://{}", addr);
    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

