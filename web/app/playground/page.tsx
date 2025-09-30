"use client";

import { useState } from "react";
import TableWidget from "@/components/widgets/TableWidget";
import FileUploadModal from "@/components/ui/FileUploadModal";

export default function PlaygroundPage() {
  const [data, setData] = useState<any[] | null>(null);
  const [isUploadOpen, setUploadOpen] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">TableWidget Playground</h1>
        <button
          onClick={() => setUploadOpen(true)}
          className="bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand/90 transition"
        >
          Загрузить файл
        </button>
      </div>

      {data ? (
        <TableWidget data={data} />
      ) : (
        <p className="text-gray-500">Здесь появится таблица после загрузки</p>
      )}

      <FileUploadModal
        isOpen={isUploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploadComplete={(uploaded) => setData(uploaded)}
      />
    </div>
  );
}
