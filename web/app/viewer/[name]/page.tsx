"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Configurator from "@/components/configurator/Configurator";
import { Upload } from "lucide-react";
import FileUploadModal from "@/components/ui/FileUploadModal";
import { errorToast, successToast } from "@/lib/toast";
import type { Widget } from "@/components/widgets/hooks/WidgetContainer";
import { useTranslation } from "@/components/i18n/LocaleProvider";

export default function ViewerPage() {
  const { name } = useParams<{ name: string }>();
  const { t } = useTranslation();

  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [data, setData] = useState<any[] | null>(null);
  const [dashboardName, setDashboardName] = useState("");
  const [isFileModal, setFileModal] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch(`/api/dashboard/${name}?ts=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load dashboard template");
        const dashboard = await res.json();

        if (!dashboard.widgets) throw new Error("Invalid dashboard JSON");

        const normalizedWidgets: Widget[] = dashboard.widgets.map((widget: Widget & { config?: any }) =>
          widget.type === "report"
            ? {
                ...widget,
                config:
                  widget.config ?? {
                    title: widget.title ?? t("widgets.report.defaultTitle"),
                    template: "",
                    metrics: [],
                  },
              }
            : widget,
        );

        if (!normalizedWidgets.some((widget) => widget.type === "report") && dashboard.report) {
          const reportId = `report-${Date.now()}`;
          const index = normalizedWidgets.length;
          const x = (index % 2) * 6;
          const y = Math.floor(index / 2) * 12;
          normalizedWidgets.push({
            id: reportId,
            type: "report",
            title: dashboard.report.title ?? t("widgets.report.defaultTitle"),
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
      } catch (err) {
        console.error(err);
        errorToast(t("viewer.loadError"));
      }
    }

    loadDashboard();
  }, [name, t]);

  return (
    <div className="flex flex-col h-full">
      <Header />

      <div className="flex flex-1 mt-4 gap-4">
        <div className="relative">
          <div className="absolute top-0 left-1/4 w-0.5 h-full bg-gray-300 z-0" />
          <div className="absolute top-0 right-1/4 w-0.5 h-full bg-gray-300 z-0" />

          <aside className="sticky top-20 z-10 w-64 bg-white shadow-md rounded-lg p-4 flex flex-col gap-3 border h-fit">
            <h2 className="font-semibold text-lg text-brand mb-2">
              {dashboardName || t("common.loading")}
            </h2>

            <button
              onClick={() => setFileModal(true)}
              className="flex items-center gap-2 px-3 py-2 border border-brand text-brand rounded hover:bg-brand hover:text-white transition"
            >
              <Upload size={16} />
              {t("viewer.uploadButton")}
            </button>

            {!data && (
              <p className="text-sm text-gray-500">
                {t("viewer.emptyHint")}
              </p>
            )}
          </aside>
        </div>

        <main className="flex-1 bg-white shadow-md rounded-lg p-4 border overflow-hidden">
          {data ? (
            <Configurator widgets={widgets} data={data} setWidgets={setWidgets} isReadonly />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-lg">
              {t("viewer.waiting")}
            </div>
          )}
        </main>
      </div>

      <FileUploadModal
        isOpen={isFileModal}
        onClose={() => setFileModal(false)}
        onUploadComplete={(uploaded) => {
          setData(uploaded);
          successToast(t("viewer.uploadSuccess"));
        }}
      />
      <Footer />
    </div>
  );
}
