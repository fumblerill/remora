use std::io::{self, Read, Seek};
use csv::ReaderBuilder;

pub mod utils;
pub mod xlsx;
pub mod ods;

use utils::extract_header_rows;

/// Конвертация CSV → Vec<Vec<String>>
pub fn convert_csv_to_vec<R: Read>(reader: R) -> io::Result<(Vec<String>, Vec<Vec<String>>)> {
    let mut rdr = ReaderBuilder::new()
        .delimiter(b';')
        .has_headers(true)
        .from_reader(reader);

    let (columns, rows) = extract_header_rows(&mut rdr);
    Ok((columns, rows))
}

/// Конвертация XLSX → Vec<Vec<String>>
pub fn convert_xlsx_to_vec<R: Read + Seek>(reader: R) -> io::Result<(Vec<String>, Vec<Vec<String>>)> {
    let rows = xlsx::convert_xlsx_to_vec(reader)?;
    Ok(utils::split_header_rows(rows))
}

/// Конвертация ODS → Vec<Vec<String>>
pub fn convert_ods_to_vec<R: Read + Seek>(reader: R) -> io::Result<(Vec<String>, Vec<Vec<String>>)> {
    let rows = ods::convert_ods_to_vec(reader)?;
    Ok(utils::split_header_rows(rows))
}
