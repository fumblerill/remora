import { uploadFile } from "@/lib/api";

export type UploadedDataset = {
  columns: string[];
  rows: string[][];
};

export type NormalizedRow = Record<string, string>;

export function normalizeDataset({ columns, rows }: UploadedDataset): NormalizedRow[] {
  return rows.map((row) =>
    Object.fromEntries(columns.map((col, index) => [col, row[index] ?? ""]))
  );
}

export async function fetchUploadedDataset(file: File): Promise<UploadedDataset> {
  const { columns, rows } = await uploadFile(file);
  return {
    columns: [...columns],
    rows: rows.map((row) => [...row]),
  };
}

export async function handleFileUpload(
  file: File,
  {
    onUploadComplete,
    onClose,
  }: {
    onUploadComplete?: (data: NormalizedRow[]) => void;
    onClose?: () => void;
  } = {}
): Promise<NormalizedRow[]> {
  try {
    const dataset = await fetchUploadedDataset(file);
    const normalized = normalizeDataset(dataset);

    if (onUploadComplete) onUploadComplete(normalized);
    if (onClose) onClose();

    return normalized;
  } catch (err) {
    console.error(err);
    alert("Не удалось загрузить файл");
    throw err;
  }
}
