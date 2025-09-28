"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import Configurator from "@/components/configurator/Configurator";
import { Layout } from "react-grid-layout";
import { Upload, Table, BarChart3 } from "lucide-react";
import FileUploadModal from "@/components/ui/FileUploadModal";

type Widget = {
  id: string;
  type: "table" | "chart";
  layout: Layout;
};

export default function ConfiguratorPage() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [isModalOpen, setModalOpen] = useState(false);

  const addWidget = (type: "table" | "chart") => {
    const id = Date.now().toString();

    const index = widgets.length;
    const x = (index % 2) * 6;
    const y = Math.floor(index / 2) * 12;

    setWidgets([
      ...widgets,
      {
        id,
        type,
        layout: { i: id, x, y, w: 6, h: 12 },
      },
    ]);
  };

  return (
    <div className="flex flex-col h-screen">
      <Header />

      <div className="flex flex-1 mt-4 gap-4">
        <div className="relative">
          {/* Верёвки */}
          <div className="absolute top-0 left-1/4 w-0.5 h-full bg-gray-300 z-0" />
          <div className="absolute top-0 right-1/4 w-0.5 h-full bg-gray-300 z-0" />

          {/* Панель */}
          <aside className="sticky z-10 w-64 bg-white shadow-md rounded-lg p-4 flex flex-col gap-3 border h-fit top-20">
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 border border-brand text-brand rounded hover:bg-brand hover:text-white transition"
            >
              <Upload size={16} />
              Загрузить файл
            </button>

            <button
              onClick={() => addWidget("table")}
              className="flex items-center gap-2 px-3 py-2 border border-brand text-brand rounded hover:bg-brand hover:text-white transition"
            >
              <Table size={16} />
              Добавить таблицу
            </button>

            <button
              onClick={() => addWidget("chart")}
              className="flex items-center gap-2 px-3 py-2 border border-brand text-brand rounded hover:bg-brand hover:text-white transition"
            >
              <BarChart3 size={16} />
              Добавить график
            </button>
          </aside>
        </div>

        {/* Workspace */}
        <main className="flex-1 bg-white shadow-md rounded-lg p-4 border">
          <Configurator widgets={widgets} />
        </main>
      </div>

      {/* Модалка загрузки файла */}
      <FileUploadModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onUploadComplete={(data) => {
          console.log("Файл загружен из конфигуратора:", data);
          // тут позже можно будет обновлять state с данными
        }}
      />
    </div>
  );
}
