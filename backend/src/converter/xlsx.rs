use crate::converter::utils::{open_zip, parse_merge_range, read_zip_file, xml_reader};
use chrono::NaiveDate;
use quick_xml::escape::unescape;
use quick_xml::events::Event;
use std::borrow::Cow;
use std::collections::HashSet;
use std::io::{self, BufReader, Read, Seek};
use zip::read::ZipArchive;

/// Конвертация XLSX → Vec<Vec<String>>
pub fn convert_xlsx_to_vec<R: Read + Seek>(reader: R) -> io::Result<Vec<Vec<String>>> {
    let buf_reader = BufReader::new(reader);
    let mut zip = open_zip(buf_reader)?;
    let shared_strings = read_shared_strings(&mut zip)?;
    let (rows, _) = read_sheet(&mut zip, &shared_strings)?;
    Ok(rows)
}

/// Чтение sharedStrings.xml
fn read_shared_strings<R: Read + Seek>(zip: &mut ZipArchive<R>) -> io::Result<Vec<String>> {
    let xml = match read_zip_file(zip, "xl/sharedStrings.xml")? {
        Some(s) => s,
        None => return Ok(Vec::new()),
    };
    let mut reader = xml_reader(&xml);
    let mut buf = Vec::with_capacity(2048);
    let mut strings = Vec::with_capacity(1024);
    let mut current_text = String::with_capacity(64);

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) if e.name().as_ref() == b"si" => current_text.clear(),
            Ok(Event::Text(t)) => {
                let raw = t.as_ref();
                let text =
                    unescape(std::str::from_utf8(raw).unwrap_or("")).unwrap_or(Cow::Borrowed(""));
                current_text.push_str(&text);
            }
            Ok(Event::End(ref e)) if e.name().as_ref() == b"si" => {
                strings.push(current_text.clone())
            }
            Ok(Event::Eof) => break,
            Err(e) => {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    format!("XML: {}", e),
                ))
            }
            _ => {}
        }
        buf.clear();
    }
    Ok(strings)
}

/// Чтение листа
fn read_sheet<R: Read + Seek>(
    zip: &mut ZipArchive<R>,
    shared: &Vec<String>,
) -> io::Result<(Vec<Vec<String>>, HashSet<(usize, usize)>)> {
    let xml = match read_zip_file(zip, "xl/worksheets/sheet1.xml")? {
        Some(s) => s,
        None => {
            return Err(io::Error::new(
                io::ErrorKind::NotFound,
                "sheet1.xml не найден",
            ))
        }
    };
    let mut reader = xml_reader(&xml);
    let mut buf = Vec::with_capacity(4096);
    let mut rows: Vec<Vec<String>> = Vec::with_capacity(2048);
    let mut merged_map: Vec<(usize, usize, usize, usize)> = Vec::new();

    let mut current_row = 0usize;
    let mut current_col = 0usize;
    let mut current_value = String::with_capacity(64);
    let mut cell_type = String::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) => match e.name().as_ref() {
                b"row" => {
                    current_col = 0;
                    let r_attr = e
                        .attributes()
                        .flatten()
                        .find(|a| a.key.as_ref() == b"r")
                        .and_then(|a| a.unescape_value().ok());
                    if let Some(s) = r_attr {
                        current_row = s.parse::<usize>().unwrap_or(1) - 1;
                    }
                    while rows.len() <= current_row {
                        rows.push(Vec::with_capacity(16));
                    }
                }
                b"c" => {
                    current_value.clear();
                    cell_type.clear();
                    for a in e.attributes().flatten() {
                        let key = a.key.as_ref();
                        let val = a.unescape_value().unwrap_or(Cow::Borrowed(""));
                        if key == b"t" {
                            cell_type = val.to_string();
                        } else if key == b"r" {
                            let (col, _) = parse_cell_ref(&val);
                            current_col = col;
                        }
                    }
                }
                b"mergeCell" => {
                    for a in e.attributes().flatten() {
                        if a.key.as_ref() == b"ref" {
                            if let Ok(s) = a.unescape_value() {
                                if let Some((r1, c1, r2, c2)) = parse_merge_range(&s) {
                                    merged_map.push((r1, c1, r2, c2));
                                }
                            }
                        }
                    }
                }
                _ => {}
            },
            Ok(Event::Text(t)) => {
                let raw = t.as_ref();
                let text =
                    unescape(std::str::from_utf8(raw).unwrap_or("")).unwrap_or(Cow::Borrowed(""));
                current_value.push_str(&text);
            }
            Ok(Event::End(ref e)) if e.name().as_ref() == b"c" => {
                while rows[current_row].len() <= current_col {
                    rows[current_row].push(String::new());
                }
                let val = if cell_type == "s" {
                    shared
                        .get(current_value.parse::<usize>().unwrap_or(0))
                        .cloned()
                        .unwrap_or_default()
                } else {
                    format_excel_value(&current_value)
                };
                rows[current_row][current_col] = val;
                current_col += 1;
            }
            Ok(Event::Eof) => break,
            Err(e) => {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    format!("XML: {}", e),
                ))
            }
            _ => {}
        }
        buf.clear();
    }

    // Отключаем merge при слишком больших таблицах
    if rows.len() < 10_000 {
        for (r1, c1, r2, c2) in merged_map {
            if r1 >= rows.len() {
                continue;
            }

            // гарантируем, что строки содержат достаточное количество столбцов
            for r in r1..=r2.min(rows.len().saturating_sub(1)) {
                let row = &mut rows[r];
                if row.len() <= c2 {
                    row.resize_with(c2 + 1, String::new);
                }
            }

            if c1 >= rows[r1].len() {
                continue;
            }

            let val = rows[r1][c1].clone();
            for r in r1..=r2.min(rows.len().saturating_sub(1)) {
                let row = &mut rows[r];
                if row.len() <= c2 {
                    row.resize_with(c2 + 1, String::new);
                }

                for c in c1..=c2 {
                    if c >= row.len() {
                        continue;
                    }
                    if !(r == r1 && c == c1) {
                        row[c] = String::new();
                    }
                }
            }

            rows[r1][c1] = val;
        }
    }

    // выравниваем длину строк — важно для выделения столбцов на фронтенде
    let max_cols = rows.iter().map(|row| row.len()).max().unwrap_or(0);
    if max_cols > 0 {
        for row in &mut rows {
            if row.len() < max_cols {
                row.resize_with(max_cols, String::new);
            }
        }
    }

    Ok((rows, HashSet::new()))
}

fn format_excel_value(v: &str) -> String {
    if let Ok(n) = v.parse::<f64>() {
        if n > 59.0 && n < 60000.0 {
            let days = n as i64 - 2;
            if let Some(date) = NaiveDate::from_ymd_opt(1900, 1, 1)
                .and_then(|d| d.checked_add_days(chrono::Days::new(days as u64)))
            {
                return date.format("%d.%m.%Y").to_string();
            }
        }
    }
    v.trim().to_string()
}

fn parse_cell_ref(s: &str) -> (usize, usize) {
    let mut col = String::new();
    let mut row = String::new();
    for c in s.chars() {
        if c.is_ascii_alphabetic() {
            col.push(c);
        } else if c.is_ascii_digit() {
            row.push(c);
        }
    }
    let col_num = col
        .chars()
        .fold(0, |acc, c| acc * 26 + ((c as u8 - b'A' + 1) as usize));
    let row_num = row.parse::<usize>().unwrap_or(1);
    (col_num - 1, row_num - 1)
}
