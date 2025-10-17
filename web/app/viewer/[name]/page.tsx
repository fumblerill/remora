"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/layout/Header";
import Configurator from "@/components/configurator/Configurator";
import { Layout } from "react-grid-layout";
import { Upload } from "lucide-react";
import FileUploadModal from "@/components/ui/FileUploadModal";
import { errorToast, successToast } from "@/lib/toast";

type Widget = {
  id: string;
  type: "table" | "chart";
  layout: Layout;
  title?: string;
  config?: any;
};

export default function ViewerPage() {
  const { name } = useParams<{ name: string }>();

  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [data, setData] = useState<any[] | null>(null);
  const [dashboardName, setDashboardName] = useState("");
  const [isFileModal, setFileModal] = useState(false);

  // 📂 Загрузка шаблона дашборда
  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch(`/api/dashboard/${name}?ts=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Не удалось загрузить шаблон");
        const dashboard = await res.json();

        if (!dashboard.widgets) throw new Error("Некорректный формат JSON");
        setWidgets(dashboard.widgets);
        setDashboardName(dashboard.name || "");
      } catch (err) {
        console.error(err);
        errorToast("Ошибка загрузки шаблона дашборда");
      }
    }

    loadDashboard();
  }, [name]);

  return (
    <div className="flex flex-col h-full">
      <Header />

      <div className="flex flex-1 mt-4 gap-4">
        {/* Боковая панель + верёвки */}
        <div className="relative">
          {/* Верёвки */}
          <div className="absolute top-0 left-1/4 w-0.5 h-full bg-gray-300 z-0" />
          <div className="absolute top-0 right-1/4 w-0.5 h-full bg-gray-300 z-0" />

          <aside className="sticky top-20 z-10 w-64 bg-white shadow-md rounded-lg p-4 flex flex-col gap-3 border h-fit">
            <h2 className="font-semibold text-lg text-brand mb-2">
              {dashboardName || "Загрузка..."}
            </h2>

            <button
              onClick={() => setFileModal(true)}
              className="flex items-center gap-2 px-3 py-2 border border-brand text-brand rounded hover:bg-brand hover:text-white transition"
            >
              <Upload size={16} />
              Загрузить данные
            </button>

            {!data && (
              <p className="text-sm text-gray-500">
                Загрузите свой файл (CSV/XLSX), чтобы построить аналитику.
              </p>
            )}
          </aside>
        </div>

        {/* Рабочая зона */}
        <main className="flex-1 bg-white shadow-md rounded-lg p-4 border overflow-hidden">
          {data ? (
            <Configurator widgets={widgets} data={data} setWidgets={setWidgets} isReadonly/>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-lg">
              Ожидание данных...
            </div>
          )}
        </main>
      </div>

      {/* Модалка загрузки файла */}
      <FileUploadModal
        isOpen={isFileModal}
        onClose={() => setFileModal(false)}
        onUploadComplete={(uploaded) => {
          setData(uploaded);
          successToast("Файл успешно загружен");
        }}
      />
    </div>
  );
}
