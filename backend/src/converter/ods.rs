use std::borrow::Cow;
use std::io::{self, Read, Seek};
use quick_xml::events::Event;
use quick_xml::escape::unescape;
use chrono::NaiveDate;
use crate::converter::utils::{open_zip, read_zip_file, xml_reader};

pub fn convert_ods_to_vec<R: Read + Seek>(mut reader: R) -> io::Result<Vec<Vec<String>>> {
    let mut zip = open_zip(&mut reader)?;
    let xml = match read_zip_file(&mut zip, "content.xml")? {
        Some(s) => s,
        None => return Err(io::Error::new(io::ErrorKind::NotFound, "content.xml не найден")),
    };

    let mut reader = xml_reader(&xml);
    let mut buf = Vec::new();
    let mut rows: Vec<Vec<String>> = Vec::new();
    let mut current_row: Vec<String> = Vec::new();
    let mut current_text = String::new();
    let mut in_cell = false;
    let mut current_type = String::new();
    let mut current_value_attr = String::new();
    let mut current_date_attr = String::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) => match e.name().as_ref() {
                b"table:table-row" => current_row.clear(),
                b"table:table-cell" => {
                    in_cell = true;
                    current_text.clear();
                    current_type.clear();
                    current_value_attr.clear();
                    current_date_attr.clear();

                    for a in e.attributes().flatten() {
                        let key = a.key.as_ref();
                        let val = a.unescape_value().unwrap_or(Cow::Borrowed(""));
                        match key {
                            b"office:value-type" => current_type = val.to_string(),
                            b"office:value" => current_value_attr = val.to_string(),
                            b"office:date-value" => current_date_attr = val.to_string(),
                            _ => {}
                        }
                    }
                }
                _ => {}
            },
            Ok(Event::Text(t)) => {
                if in_cell {
                    let raw = t.as_ref();
                    let text = unescape(std::str::from_utf8(raw).unwrap_or("")).unwrap_or(Cow::Borrowed(""));
                    current_text.push_str(&text);
                }
            }
            Ok(Event::End(ref e)) => match e.name().as_ref() {
                b"table:table-cell" => {
                    in_cell = false;
                    let value = if !current_date_attr.is_empty() {
                        format_ods_date(&current_date_attr)
                    } else if current_type == "date" {
                        format_ods_date(&current_text)
                    } else if current_type == "float" && !current_value_attr.is_empty() {
                        format_excel_float_as_date(&current_value_attr)
                    } else {
                        current_text.trim().to_string()
                    };
                    current_row.push(value);
                }
                b"table:table-row" => {
                    if !current_row.is_empty() {
                        rows.push(current_row.clone());
                    }
                }
                _ => {}
            },
            Ok(Event::Eof) => break,
            Err(e) => {
                return Err(io::Error::new(io::ErrorKind::InvalidData, format!("Ошибка XML ODS: {}", e)))
            }
            _ => {}
        }
        buf.clear();
    }

    Ok(rows)
}

fn format_ods_date(s: &str) -> String {
    if let Ok(date) = NaiveDate::parse_from_str(s, "%Y-%m-%d") {
        return date.format("%d.%m.%Y").to_string();
    }
    s.to_string()
}

fn format_excel_float_as_date(s: &str) -> String {
    if let Ok(n) = s.parse::<f64>() {
        if n > 59.0 && n < 60000.0 {
            let days = n as i64 - 2;
            if let Some(date) = NaiveDate::from_ymd_opt(1900, 1, 1)
                .and_then(|d| d.checked_add_days(chrono::Days::new(days as u64)))
            {
                return date.format("%d.%m.%Y").to_string();
            }
        }
    }
    s.to_string()
}
