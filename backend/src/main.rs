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

#[tokio::main]
async fn main() {
    dotenv::dotenv().ok();

    let rust_port = env::var("RUST_PORT").unwrap_or_else(|_| "8080".to_string());
    let front_port = env::var("FRONT_PORT").unwrap_or_else(|_| "3000".to_string());
    let bind_addr = format!("0.0.0.0:{}", rust_port);

    // ───────────────────────────────
    // 🌐 Формируем CORS Origins
    // ───────────────────────────────
    let cors_template = env::var("CORS_ORIGINS_TEMPLATE").unwrap_or_else(|_| {
        "http://localhost:{FRONT_PORT},http://127.0.0.1:{FRONT_PORT},http://0.0.0.0:{FRONT_PORT}"
            .to_string()
    });

    let cors_origins_env = cors_template.replace("{FRONT_PORT}", &front_port);

    let allowed_origins: Vec<HeaderValue> = cors_origins_env
        .split(',')
        .filter_map(|s| s.trim().parse::<HeaderValue>().ok())
        .collect();

    println!("🌐 Allowed origins:");
    for origin in &allowed_origins {
        println!("   → {}", origin.to_str().unwrap_or_default());
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
