import { uploadFile } from "@/lib/api";

export async function handleFileUpload(
  file: File,
  {
    onUploadComplete,
    onClose,
  }: {
    onUploadComplete?: (data: any[]) => void;
    onClose?: () => void;
  } = {}
) {
  try {
    const resp = await uploadFile(file);
    // resp = { columns: string[], rows: string[][] }

    const { columns, rows } = resp;

    const normalized = rows.map((r: string[]) =>
      Object.fromEntries(columns.map((col, i) => [col, r[i] ?? ""]))
    );

    if (onUploadComplete) onUploadComplete(normalized);
    if (onClose) onClose();

    return normalized;
  } catch (err) {
    console.error(err);
    alert("Не удалось загрузить файл");
    throw err;
  }
}

