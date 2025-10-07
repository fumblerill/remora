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
    dotenv::dotenv().ok();

    let dev_mode = env::var("DEV").unwrap_or_else(|_| "false".to_string()) == "true";

    if dev_mode {
        println!("🧩 DEV mode detected → overriding origins & bind addresses");
    } else {
        println!("🚀 Production mode detected → using .env values as-is");
    }

    // ✅ localhost во всех случаях
    let frontend_origin = if dev_mode {
        "http://localhost:3000".to_string()
    } else {
        env::var("FRONTEND_ORIGIN").unwrap_or_else(|_| "http://localhost:3000".to_string())
    };

    let bind_addr = if dev_mode {
        "localhost".to_string()
    } else {
        env::var("BIND_ADDR").unwrap_or_else(|_| "localhost".to_string())
    };

    let port = env::var("RUST_PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse::<u16>()
        .unwrap_or(8080);

    println!("🌐 Allowed origin: {}", frontend_origin);
    println!("📦 Binding on {}:{}", bind_addr, port);

    let cors = CorsLayer::new()
        .allow_origin(frontend_origin.parse::<HeaderValue>().unwrap())
        .allow_methods([Method::GET, Method::POST, Method::DELETE, Method::OPTIONS])
        .allow_headers([
            axum::http::header::CONTENT_TYPE,
            axum::http::header::AUTHORIZATION,
        ])
        .allow_credentials(true)
        .max_age(Duration::from_secs(3600));

    let app = Router::new()
        .route("/api/upload", post(upload))
        .merge(auth::setup_router().await)
        .layer(cors)
        .layer(DefaultBodyLimit::max(50 * 1024 * 1024));

    // 👇 теперь localhost резолвится корректно
    let addr = format!("{}:{}", bind_addr, port)
        .to_socket_addrs()
        .unwrap()
        .next()
        .unwrap();

    println!("🚀 Server running at http://{}:{}", bind_addr, port);

    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
