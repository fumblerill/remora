"use client";

import { useState } from "react";

export default function FileUpload() {
  const [file, setFile] = useState<File | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div
      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-brand transition"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <input
        type="file"
        accept=".csv,.xlsx"
        id="fileInput"
        className="hidden"
        onChange={handleFileChange}
      />
      {!file ? (
        <label htmlFor="fileInput" className="cursor-pointer">
          <p className="text-gray-600">Перетащите CSV/XLSX сюда</p>
          <p className="text-sm text-gray-400 mt-2">или нажмите для выбора файла</p>
        </label>
      ) : (
        <div>
          <p className="font-medium">{file.name}</p>
          <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
        </div>
      )}
    </div>
  );
}
