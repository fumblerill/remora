use axum::{
    extract::Multipart,
    routing::post,
    Json, Router,
};
use serde::Serialize;
use std::net::SocketAddr;
use std::io::Cursor;
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};
use axum::http::Method;
use std::time::{Duration, Instant};

mod converter;
use converter::{convert_csv_to_vec, convert_ods_to_vec, convert_xlsx_to_vec};

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
            let cursor = Cursor::new(data.to_vec());

            let ext = filename.to_lowercase();
            if ext.ends_with(".csv") {
                (columns, rows) = convert_csv_to_vec(cursor).unwrap();
                log_file_info(&filename, "CSV", size_kb, start.elapsed());
            } else if ext.ends_with(".xlsx") {
                (columns, rows) = convert_xlsx_to_vec(cursor).unwrap();
                log_file_info(&filename, "XLSX", size_kb, start.elapsed());
            } else if ext.ends_with(".ods") {
                (columns, rows) = convert_ods_to_vec(cursor).unwrap();
                log_file_info(&filename, "ODS", size_kb, start.elapsed());
            } else {
                eprintln!("⚠️  Неподдерживаемый формат файла: {}", filename);
            }
        }
    }

    Json(UploadResponse { columns, rows })
}

fn log_file_info(name: &str, format: &str, size_kb: f64, duration: Duration) {
    println!(
        "✅ Обработан файл: {:<25} | Формат: {:<5} | Размер: {:>7.2} КБ | Время: {:>5.1?} мс",
        name,
        format,
        size_kb,
        duration.as_millis()
    );
}

#[tokio::main]
async fn main() {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST])
        .allow_headers(Any)
        .max_age(Duration::from_secs(3600));

    let app = Router::new()
        .route("/api/upload", post(upload))
        .layer(cors);

    let addr = SocketAddr::from(([127, 0, 0, 1], 8080));
    println!("🚀 Server running at http://{}", addr);

    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
