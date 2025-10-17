"use client";

import { useEffect, useMemo, useState } from "react";
import { ReportConfig } from "@/lib/types";
import { extractColumns } from "@/lib/report";
import ReportViewer from "./ReportViewer";
import ReportEditorForm from "./ReportEditorForm";

type ReportWidgetProps = {
  data: Record<string, unknown>[];
  config: ReportConfig | null;
  title: string;
  onTitleChange: (title: string) => void;
  onConfigChange: (config: ReportConfig) => void;
  isReadonly?: boolean;
};

function createDefaultConfig(columns: string[]): ReportConfig {
  const primaryColumn = columns[0] ?? "";
  return {
    template: "Данные за период {{minDate}} — {{maxDate}}\nВсего записей: {{totalCount}}",
    metrics: [
      {
        id: "minDate",
        label: "Минимальная дата",
        field: primaryColumn,
        aggregation: "minDate",
        format: "date",
      },
      {
        id: "maxDate",
        label: "Максимальная дата",
        field: primaryColumn,
        aggregation: "maxDate",
        format: "date",
      },
      {
        id: "totalCount",
        label: "Количество записей",
        field: primaryColumn,
        aggregation: "count",
        format: "integer",
      },
    ],
  };
}

function sanitizeConfig(config: ReportConfig): ReportConfig {
  const metrics = config.metrics ?? [];
  return {
    template: config.template ?? "",
    metrics: metrics
      .map((metric) => ({
        ...metric,
        id: metric.id.trim(),
        label: metric.label?.trim() || metric.id.trim(),
        field: metric.field.trim(),
        conditionField: metric.conditionValue?.trim()
          ? metric.conditionField?.trim() || metric.field.trim()
          : undefined,
        conditionValue: metric.conditionValue?.trim() || undefined,
        conditionOperator: metric.conditionValue?.trim()
          ? metric.conditionOperator ?? "eq"
          : undefined,
      }))
      .filter((metric) => metric.id && metric.field),
  };
}

export default function ReportWidget({
  data,
  config,
  title,
  onTitleChange,
  onConfigChange,
  isReadonly = false,
}: ReportWidgetProps) {
  const columns = useMemo(() => extractColumns(data), [data]);
  const [mode, setMode] = useState<"view" | "edit">(config ? "view" : "edit");
  const [editingTitle, setEditingTitle] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);
  const [draftConfig, setDraftConfig] = useState<ReportConfig>(() => config ?? createDefaultConfig(columns));

  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  useEffect(() => {
    if (mode === "edit") {
      setDraftConfig(config ?? createDefaultConfig(columns));
    }
  }, [mode, config, columns]);

  const applyChanges = () => {
    const normalized = sanitizeConfig(draftConfig);
    onConfigChange(normalized);
    setDraftConfig(normalized);
    setMode("view");
  };

  const cancelChanges = () => {
    setDraftConfig(config ?? createDefaultConfig(columns));
    setMode("view");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-2">
        {editingTitle && !isReadonly ? (
          <input
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={() => {
              setEditingTitle(false);
              onTitleChange(localTitle.trim() || "Отчёт");
            }}
            autoFocus
            className="font-semibold border rounded px-1 py-0.5 text-sm"
          />
        ) : (
          <span
            className={`font-semibold text-brand ${!isReadonly ? "cursor-text" : ""}`}
            onDoubleClick={() => !isReadonly && setEditingTitle(true)}
            title={!isReadonly ? "Двойной клик для редактирования" : undefined}
          >
            {localTitle || "Отчёт"}
          </span>
        )}

        {!isReadonly && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (mode === "view") {
                  setMode("edit");
                } else {
                  applyChanges();
                }
              }}
              className="text-sm border px-2 py-1 rounded"
            >
              {mode === "view" ? "Редактировать" : "Сохранить"}
            </button>
            {mode === "edit" && (
              <button
                onClick={cancelChanges}
                className="text-sm border px-2 py-1 rounded"
              >
                Отмена
              </button>
            )}
            <span className="drag-handle cursor-move px-2 relative before:content-['⋮'] before:absolute before:left-[2px] before:top-0">
              ⋮
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {mode === "view" || isReadonly ? (
          <div className="h-full overflow-auto">
            <ReportViewer config={config ?? draftConfig} data={data} />
          </div>
        ) : (
          <div className="h-full overflow-auto rounded border border-brand/40 bg-white p-3">
            <ReportEditorForm
              value={draftConfig}
              columns={columns}
              onChange={(next) => setDraftConfig(next)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
