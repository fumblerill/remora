export async function uploadFile(
  file: File
): Promise<{ columns: string[]; rows: string[][] }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`/api/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Failed to upload file");

  return res.json();
}

export async function exportTable({
  columns,
  rows,
  format,
  filename,
}: {
  columns: string[];
  rows: string[][];
  format: "xlsx" | "ods";
  filename?: string;
}): Promise<Blob> {
  const res = await fetch("/api/export-table", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      columns,
      rows,
      format,
      filename,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to generate file");
  }

  return await res.blob();
}
