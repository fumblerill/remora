export async function uploadFile(
  file: File
): Promise<{ columns: string[]; rows: string[][] }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`/api/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Ошибка загрузки файла");

  return res.json();
}
