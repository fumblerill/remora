"use client";

import { useMemo } from "react";
import { ReportConfig } from "@/lib/types";
import { evaluateReport } from "@/lib/report";

type ReportViewerProps = {
  config: ReportConfig | null;
  data: Record<string, unknown>[] | null;
};

export default function ReportViewer({ config, data }: ReportViewerProps) {
  const { rendered, values } = useMemo(() => {
    if (!config || !data) return { rendered: "", values: {} };
    return evaluateReport(config, data);
  }, [config, data]);

  if (!config) {
    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-4 text-sm text-gray-500">
        Отчёт не настроен. Добавьте метрики, чтобы отображать сводку.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-brand/20 bg-gradient-to-br from-white via-white to-brand/5 p-5 shadow-sm">
      {config.title && <h3 className="text-lg font-semibold text-brand mb-3">{config.title}</h3>}
      <div className="space-y-2 text-sm text-gray-800 whitespace-pre-wrap">
        {rendered || (
          <span className="text-gray-500">
            Шаблон пустой. Используйте поля метрик, например {"{{total}}"}.
          </span>
        )}
      </div>
      <details className="mt-4 text-xs text-gray-400">
        <summary className="cursor-pointer select-none">Показать значения метрик</summary>
        <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
          {Object.entries(values).map(([id, value]) => (
            <li key={id} className="font-mono bg-white/80 px-2 py-1 rounded border text-gray-600">
              {id}: <span className="font-semibold text-brand">{String(value)}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
