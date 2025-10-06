use csv::Reader;
use quick_xml::Reader as XmlReader;
use std::io::{self, Read, Seek};
use zip::read::ZipArchive;

/// Открыть zip-архив
pub fn open_zip<R: Read + Seek>(reader: R) -> io::Result<ZipArchive<R>> {
    ZipArchive::new(reader)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, format!("Ошибка zip: {}", e)))
}

/// Прочитать файл внутри ZIP
pub fn read_zip_file<R: Read + Seek>(zip: &mut ZipArchive<R>, name: &str) -> io::Result<Option<String>> {
    for i in 0..zip.len() {
        let mut file = zip.by_index(i)?;
        if file.name().ends_with(name) {
            let mut contents = String::new();
            file.read_to_string(&mut contents)?;
            return Ok(Some(contents));
        }
    }
    Ok(None)
}

/// Создание XML reader
pub fn xml_reader(data: &str) -> XmlReader<&[u8]> {
    let mut reader = XmlReader::from_str(data);
    reader.config_mut().trim_text(true);
    reader
}


/// Вспомогательная: разделение первой строки на заголовки
pub fn split_header_rows(rows: Vec<Vec<String>>) -> (Vec<String>, Vec<Vec<String>>) {
    if rows.is_empty() {
        return (vec![], vec![]);
    }
    let mut iter = rows.into_iter();
    let columns = iter.next().unwrap_or_default();
    let data = iter.collect();
    (columns, data)
}

/// Вспомогательная: извлечение заголовков и строк из CSV
pub fn extract_header_rows<R: Read>(rdr: &mut Reader<R>) -> (Vec<String>, Vec<Vec<String>>) {
    let headers = rdr.headers().unwrap().iter().map(|s| s.to_string()).collect();
    let mut rows = Vec::new();
    for record in rdr.records() {
        if let Ok(rec) = record {
            rows.push(rec.iter().map(|s| s.to_string()).collect());
        }
    }
    (headers, rows)
}

/// Разбор диапазона merged cells
pub fn parse_merge_range(range: &str) -> Option<(usize, usize, usize, usize)> {
    fn col_to_num(col: &str) -> usize {
        col.chars().fold(0, |acc, c| acc * 26 + ((c as u8 - b'A' + 1) as usize))
    }

    let parts: Vec<&str> = range.split(':').collect();
    if parts.len() != 2 {
        return None;
    }

    let parse_ref = |s: &str| {
        let mut col = String::new();
        let mut row = String::new();
        for c in s.chars() {
            if c.is_ascii_alphabetic() {
                col.push(c);
            } else if c.is_ascii_digit() {
                row.push(c);
            }
        }
        (col_to_num(&col) - 1, row.parse::<usize>().unwrap_or(1) - 1)
    };

    let (start_col, start_row) = parse_ref(parts[0]);
    let (end_col, end_row) = parse_ref(parts[1]);
    Some((start_row, start_col, end_row, end_col))
}
