"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

type HeaderProps = {
  isAdmin?: boolean;
  onLogout?: () => void;
  onUploadComplete?: (data: any) => void; // callback после загрузки файла
};

export default function Header({ isAdmin = true, onLogout, onUploadComplete }: HeaderProps) {
  const pathname = usePathname();
  const [isModalOpen, setModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  let sectionName = "Главная";
  if (pathname.startsWith("/admin")) sectionName = "Админ-панель";
  if (pathname.startsWith("/login")) sectionName = "Авторизация";
  if (pathname.startsWith("/configurator")) sectionName = "Конфигуратор";
  if (pathname.startsWith("/settings")) sectionName = "Настройки";

  async function handleUpload() {
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8080/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Ошибка загрузки файла");

      const data = await res.json();
      console.log("Файл загружен, preview:", data);

      if (onUploadComplete) onUploadComplete(data);

      setModalOpen(false);
      setFile(null);
    } catch (err) {
      console.error(err);
      alert("Не удалось загрузить файл");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <header className="flex items-center justify-between bg-brand px-6 py-4 shadow-sm rounded-lg">
        {/* Левая часть */}
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-bold text-white">
            Remora <span className="font-normal">| {sectionName}</span>
          </h1>

          {pathname !== "/login" && (
            <button
              onClick={() => setModalOpen(true)}
              className="bg-white text-brand px-4 py-2 rounded-lg hover:bg-gray-100 transition"
            >
              Загрузить файл
            </button>
          )}
        </div>

        {/* Правая часть */}
        {pathname !== "/login" && (
          <div className="flex items-center gap-3">
            {isAdmin && (
              <>
                <Link
                  href="/settings"
                  className="border border-white text-white px-3 py-1.5 rounded-lg hover:bg-white/20"
                >
                  Настройки
                </Link>
                <Link
                  href="/configurator"
                  className="border border-white text-white px-3 py-1.5 rounded-lg hover:bg-white/20"
                >
                  Конфигуратор
                </Link>
              </>
            )}
            <button
              onClick={onLogout}
              className="border border-white text-white px-3 py-1.5 rounded-lg hover:bg-white/20"
            >
              Выйти
            </button>
          </div>
        )}
      </header>

      {/* Модалка */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
              onClick={() => setModalOpen(false)}
            >
              ✕
            </button>

            <h2 className="text-lg font-semibold mb-4">Загрузить файл</h2>

            <label
              htmlFor="fileInput"
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-brand transition block"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  setFile(e.dataTransfer.files[0]);
                }
              }}
            >
              {!file ? (
                <div>
                  <p className="text-gray-600">Перетащите CSV/XLSX сюда</p>
                  <p className="text-sm text-gray-400 mt-2">
                    или нажмите для выбора файла
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              )}
              <input
                type="file"
                id="fileInput"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFile(e.target.files[0]);
                  }
                }}
              />
            </label>

            <button
              onClick={handleUpload}
              disabled={uploading || !file}
              className="mt-4 w-full bg-brand text-white py-2 rounded-lg hover:bg-brand/90 transition disabled:opacity-50"
            >
              {uploading ? "Загрузка..." : "Сохранить"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
