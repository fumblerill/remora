"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { handleFileUpload } from "@/lib/fileUpload";

type FileUploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: (data: any) => void;
};

export default function FileUploadModal({
  isOpen,
  onClose,
  onUploadComplete,
}: FileUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function onSave() {
    if (!file) return;
    setUploading(true);
    try {
      await handleFileUpload(file, {
        onUploadComplete,
        onClose: () => {
          onClose();
          setFile(null);
        },
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4">Загрузить файл</h2>

      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-brand transition"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
          }
        }}
      >
        <input
          type="file"
          accept=".csv,.xlsx"
          id="fileInput"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setFile(e.target.files[0]);
            }
          }}
        />
        {!file ? (
          <label htmlFor="fileInput" className="cursor-pointer block">
            <p className="text-gray-600">Перетащите CSV/XLSX сюда</p>
            <p className="text-sm text-gray-400 mt-2">или нажмите для выбора файла</p>
          </label>
        ) : (
          <div>
            <p className="font-medium">{file.name}</p>
            <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="mt-2 text-sm text-red-500 hover:underline"
            >
              Удалить
            </button>
          </div>
        )}
      </div>

      <button
        onClick={onSave}
        disabled={uploading || !file}
        className="mt-4 w-full bg-brand text-white py-2 rounded-lg hover:bg-brand/90 transition disabled:opacity-50"
      >
        {uploading ? "Загрузка..." : "Сохранить"}
      </button>
    </Modal>
  );
}
