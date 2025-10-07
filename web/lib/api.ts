import { getApiUrl } from "@/lib/env"; // если уже есть общий env-хелпер

export async function uploadFile(
  file: File
): Promise<{ columns: string[]; rows: string[][] }> {
  const formData = new FormData();
  formData.append("file", file);

  const API = getApiUrl();

  const res = await fetch(`${API}/api/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Ошибка загрузки файла");

  return res.json();
}
