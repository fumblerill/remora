use std::io::{self, Read, Seek, Cursor};
use csv::ReaderBuilder;

pub mod utils;
pub mod xlsx;
pub mod ods;

use utils::extract_header_rows;

/// Конвертация CSV → Vec<Vec<String>> с автоопределением разделителя
pub fn convert_csv_to_vec<R: Read>(mut reader: R) -> io::Result<(Vec<String>, Vec<Vec<String>>)> {
    // Считываем часть файла, чтобы определить разделитель
    let mut sample = Vec::new();
    let mut buffer = [0u8; 1024];
    let n = reader.read(&mut buffer)?;
    sample.extend_from_slice(&buffer[..n]);

    // Определяем разделитель по частоте встречаемости
    let possible_delims = [b';', b',', b'\t', b'|'];
    let mut counts = possible_delims
        .iter()
        .map(|&d| (d, sample.iter().filter(|&&c| c == d).count()))
        .collect::<Vec<_>>();

    counts.sort_by(|a, b| b.1.cmp(&a.1)); // по убыванию количества
    let detected = if counts.first().map(|(_, c)| *c).unwrap_or(0) > 0 {
        counts.first().unwrap().0
    } else {
        b';'
    };

    // Объединяем обратно sample + остаток файла
    let mut rest = Vec::new();
    reader.read_to_end(&mut rest)?;
    let mut full_data = sample;
    full_data.extend_from_slice(&rest);

    // Парсим с определённым разделителем
    let mut rdr = ReaderBuilder::new()
        .delimiter(detected)
        .has_headers(true)
        .from_reader(Cursor::new(full_data));

    // Извлекаем заголовки и строки
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
