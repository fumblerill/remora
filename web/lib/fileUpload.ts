import { uploadFile } from "@/lib/api";

export async function handleFileUpload(
  file: File,
  {
    onUploadComplete,
    onClose,
  }: {
    onUploadComplete?: (data: any) => void;
    onClose?: () => void;
  } = {}
) {
  try {
    const data = await uploadFile(file);
    console.log("Файл загружен, preview:", data);

    if (onUploadComplete) onUploadComplete(data);
    if (onClose) onClose();

    return data;
  } catch (err) {
    console.error(err);
    alert("Не удалось загрузить файл");
    throw err;
  }
}
