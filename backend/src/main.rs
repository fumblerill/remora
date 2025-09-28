use axum::{
    extract::Multipart,
    routing::post,
    Json, Router,
};
use serde::Serialize;
use std::net::SocketAddr;
use calamine::{open_workbook_auto_from_rs, Reader};
use csv::ReaderBuilder;
use std::io::Cursor;
use tokio::net::TcpListener;

use tower_http::cors::{Any, CorsLayer};
use axum::http::Method;
use std::time::Duration;


#[derive(Serialize)]
struct UploadResponse {
    columns: Vec<String>,
    rows: Vec<Vec<String>>,
}

async fn upload(mut multipart: Multipart) -> Json<UploadResponse> {
    let mut columns = vec![];
    let mut rows = vec![];

    while let Some(field) = multipart.next_field().await.unwrap() {
        let name = field.name().unwrap_or("").to_string();
        if name == "file" {
            let filename = field.file_name().unwrap_or("").to_string();
            let data = field.bytes().await.unwrap();

            if filename.ends_with(".csv") {
                // Читаем CSV
                let mut rdr = ReaderBuilder::new()
                    .has_headers(true)
                    .from_reader(data.as_ref());

                columns = rdr
                    .headers()
                    .unwrap()
                    .iter()
                    .map(|s| s.to_string())
                    .collect();

                for record in rdr.records() {
                    rows.push(record.unwrap().iter().map(|s| s.to_string()).collect());
                }
            } else if filename.ends_with(".xlsx") {
                let cursor = Cursor::new(data.to_vec());
                let mut workbook = open_workbook_auto_from_rs(cursor).unwrap();

                // Логируем все листы
                for (name, _) in workbook.worksheets() {
                    println!("Найден лист: {}", name);
                }

                // Берём первый лист, если он есть
                if let Some((_, range)) = workbook.worksheets().first() {
                    if let Some(first_row) = range.rows().next() {
                        columns = first_row.iter().map(|c| c.to_string()).collect();
                    }
                    for row in range.rows().skip(1) {
                        rows.push(row.iter().map(|c| c.to_string()).collect());
                    }
                }
            }
        }
    }
    Json(UploadResponse { columns, rows })
}

#[tokio::main]
async fn main() {
    let cors = CorsLayer::new()
        .allow_origin(Any) // для dev можно Any, потом лучше ограничить
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

