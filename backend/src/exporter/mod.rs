use anyhow::Result;
use icu_locid::locale;
use rust_xlsxwriter::Workbook;
use spreadsheet_ods::{write_ods_buf, Sheet, WorkBook};

pub fn build_xlsx(columns: &[String], rows: &[Vec<String>]) -> Result<Vec<u8>> {
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();

    for (col_idx, header) in columns.iter().enumerate() {
        worksheet.write_string(0, col_idx as u16, header)?;
    }

    for (row_idx, row) in rows.iter().enumerate() {
        for (col_idx, value) in row.iter().enumerate() {
            worksheet.write_string((row_idx + 1) as u32, col_idx as u16, value)?;
        }
    }

    let buffer = workbook.save_to_buffer()?;
    Ok(buffer)
}

pub fn build_ods(columns: &[String], rows: &[Vec<String>]) -> Result<Vec<u8>> {
    let mut workbook = WorkBook::new(locale!("en-US"));
    let mut sheet = Sheet::new("Sheet1");

    for (col_idx, header) in columns.iter().enumerate() {
        sheet.set_value(0, col_idx as u32, header.as_str());
    }

    for (row_idx, row) in rows.iter().enumerate() {
        for (col_idx, value) in row.iter().enumerate() {
            sheet.set_value((row_idx + 1) as u32, col_idx as u32, value.as_str());
        }
    }

    workbook.push_sheet(sheet);
    let buffer = write_ods_buf(&mut workbook, Vec::new())?;
    Ok(buffer)
}
