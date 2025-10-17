"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import Configurator from "@/components/configurator/Configurator";
import { Layout } from "react-grid-layout";
import { Upload, Table, BarChart3, Save, FolderOpen, FileText } from "lucide-react";
import FileUploadModal from "@/components/ui/FileUploadModal";
import ConfigSelectModal from "@/components/ui/ConfigSelectModal";
import { errorToast, successToast } from "@/lib/toast";

type Widget = {
  id: string;
  type: "table" | "chart" | "report";
  layout: Layout;
  title?: string;
  config?: any;
};

export default function ConfiguratorPage() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [data, setData] = useState<any[] | null>(null);
  const [isFileModal, setFileModal] = useState(false);
  const [isConfigModal, setConfigModal] = useState(false);
  const [dashboardName, setDashboardName] = useState("");

  const addWidget = (type: Widget["type"]) => {
    if ((type === "table" || type === "report") && !data) {
      errorToast("Сначала загрузите файл");
      return;
    }
    if (type === "report" && widgets.some((widget) => widget.type === "report")) {
      errorToast("Отчёт уже добавлен");
      return;
    }

    const id = Date.now().toString();
    const index = widgets.length;
    const x = (index % 2) * 6;
    const y = Math.floor(index / 2) * 12;

    setWidgets([
      ...widgets,
      {
        id,
        type,
        layout: {
          i: id,
          x,
          y,
          w: 6,
          h: 12,
          minW: 3,
          minH: 6,
          maxW: 12,
          maxH: 18,
        },
        title: type === "report" ? "Отчёт" : undefined,
        config: type === "report" ? null : undefined,
      },
    ]);
  };

  // 📂 Загрузка сохранённого дашборда
  const loadDashboard = async (fileName: string) => {
    try {
      const cleanName = fileName.replace(/\.json$/i, "");
      const res = await fetch(`/api/dashboard/${cleanName}?ts=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Не удалось загрузить файл");
      const dashboard = await res.json();

      if (!dashboard.widgets) throw new Error("Некорректный формат JSON");
      const normalizedWidgets = dashboard.widgets.map((widget: any) =>
        widget.type === "report"
          ? {
              ...widget,
              config:
                widget.config ?? {
                  title: widget.title ?? "Отчёт",
                  template: "",
                  metrics: [],
                },
            }
          : widget,
      );

      if (!normalizedWidgets.some((widget: any) => widget.type === "report") && dashboard.report) {
        const reportId = `report-${Date.now()}`;
        const index = normalizedWidgets.length;
        const x = (index % 2) * 6;
        const y = Math.floor(index / 2) * 12;
        normalizedWidgets.push({
          id: reportId,
          type: "report",
          title: dashboard.report.title ?? "Отчёт",
          layout: {
            i: reportId,
            x,
            y,
            w: 6,
            h: 12,
            minW: 3,
            minH: 6,
            maxW: 12,
            maxH: 18,
          },
          config: dashboard.report,
        });
      }

      setWidgets(normalizedWidgets);
      setDashboardName(dashboard.name || "");
      successToast(`Загружен дашборд: ${dashboard.name}`);
    } catch (err) {
      console.error(err);
      errorToast("Ошибка загрузки дашборда");
    }
  };

  // 💾 Сохранение дашборда
  const saveDashboard = async () => {
    if (!dashboardName.trim()) {
      errorToast("Введите имя дашборда");
      return;
    }

    try {
      const res = await fetch("/api/save-dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: dashboardName.trim(),
          widgets,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Ошибка при сохранении");

      successToast(`Дашборд сохранён: ${result.file}`);
    } catch (err) {
      console.error("Ошибка сохранения:", err);
      errorToast("Не удалось сохранить дашборд");
    }
  };

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
            <input
              type="text"
              placeholder="Имя дашборда"
              value={dashboardName}
              onChange={(e) => setDashboardName(e.target.value)}
              className="font-semibold border border-brand text-brand placeholder-brand rounded px-2 py-1 text-sm mb-2"
            />

            <button
              onClick={() => setFileModal(true)}
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

            <button
              onClick={() => addWidget("report")}
              className="flex items-center gap-2 px-3 py-2 border border-brand text-brand rounded hover:bg-brand hover:text-white transition"
            >
              <FileText size={16} />
              Добавить отчёт
            </button>

            <button
              onClick={saveDashboard}
              className="flex items-center gap-2 px-3 py-2 border border-green-600 text-green-600 rounded hover:bg-green-600 hover:text-white transition"
            >
              <Save size={16} />
              Сохранить
            </button>

            <button
              onClick={() => setConfigModal(true)}
              className="flex text-left items-center gap-2 px-3 py-2 border border-brand text-brand rounded hover:bg-brand hover:text-white transition"
            >
              <FolderOpen size={16} />
              Конфигурации
            </button>
          </aside>
        </div>

        {/* Рабочая зона */}
        <main className="flex-1 bg-white shadow-md rounded-lg p-4 border h-full">
          <Configurator widgets={widgets} data={data} setWidgets={setWidgets} />
        </main>
      </div>

      {/* Модалки */}
      <FileUploadModal
        isOpen={isFileModal}
        onClose={() => setFileModal(false)}
        onUploadComplete={(uploaded) => {
          setData(uploaded);
          successToast("Файл успешно загружен");
        }}
      />

      <ConfigSelectModal
        isOpen={isConfigModal}
        onClose={() => setConfigModal(false)}
        onSelect={loadDashboard}
      />
    </div>
  );
}
