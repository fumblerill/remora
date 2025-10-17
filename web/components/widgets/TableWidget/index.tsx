"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import TableView from "./TableView";
import TableEditor from "./TableEditor";
import type { PivotConfig } from "@/lib/types";
import { applyPivot, normalizePivotConfig } from "@/lib/pivot";
import { exportTable } from "@/lib/api";

interface TableWidgetProps {
  data: any[];
  config?: PivotConfig;
  height?: number;
  title: string;
  onTitleChange?: (newTitle: string) => void;
  onConfigChange?: (newConfig: PivotConfig) => void;
  isReadonly?: boolean; // ✅ добавили
}

export default function TableWidget({
  data,
  config,
  height,
  title,
  onTitleChange,
  onConfigChange,
  isReadonly = false, // ✅ по умолчанию false
}: TableWidgetProps) {
  const normalizedConfig = useMemo(
    () => normalizePivotConfig(config, data, { ensureValues: false }),
    [config, data],
  );

  const normalizedString = useMemo(
    () => JSON.stringify(normalizedConfig),
    [normalizedConfig],
  );

  const [pivotConfig, setPivotConfig] = useState<PivotConfig>(normalizedConfig);

  const lastPropStringRef = useRef<string | null>(normalizedString);
  const lastEmittedRef = useRef<string>(normalizedString);

  const [mode, setMode] = useState<"view" | "edit">(config ? "view" : "edit");
  const [localTitle, setLocalTitle] = useState(title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [exporting, setExporting] = useState<"xlsx" | "ods" | null>(null);

  // 🔄 уведомляем контейнер при изменении конфига
  useEffect(() => {
    if (lastPropStringRef.current === normalizedString) {
      return;
    }

    lastPropStringRef.current = normalizedString;
    setPivotConfig((prev) => {
      if (JSON.stringify(prev) === normalizedString) {
        return prev;
      }
      return normalizedConfig;
    });
  }, [normalizedConfig, normalizedString]);

  useEffect(() => {
    if (!onConfigChange) return;
    const serialized = JSON.stringify(pivotConfig);
    if (serialized === lastEmittedRef.current) return;
    lastEmittedRef.current = serialized;
    onConfigChange(pivotConfig);
  }, [pivotConfig, onConfigChange]);

  // 🔄 синхронизируем внешний title с локальным
  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  const exportDataset = useMemo(() => {
    const result = applyPivot(data, pivotConfig);
    const tableRows = result.data;

    if (!tableRows || tableRows.length === 0) {
      return null;
    }

    const dimensionFields = result.isPivot
      ? result.dimensionFields
      : Object.keys(tableRows[0] ?? {}).filter((key) => !key.startsWith("__"));

    const columnsOrder = (() => {
      if (result.isPivot) {
        const dimensions = dimensionFields.map((key) => ({
          key,
          header: key,
        }));
        const values = result.valueColumns.map((col) => ({
          key: col.key,
          header: col.header,
        }));
        return [...dimensions, ...values];
      }

      const known = new Set(dimensionFields);
      const extras = Object.keys(tableRows[0] ?? {})
        .filter((key) => !key.startsWith("__") && !known.has(key))
        .map((key) => ({
          key,
          header: key,
        }));

      const dimensions = dimensionFields.map((key) => ({
        key,
        header: key,
      }));
      return [...dimensions, ...extras];
    })();

    const serialize = (value: unknown): string => {
      if (value === null || value === undefined) return "";
      if (value instanceof Date) return value.toISOString();
      if (typeof value === "object") {
        try {
          return JSON.stringify(value);
        } catch {
          return String(value);
        }
      }
      return String(value);
    };

    const rows = tableRows.map((row) =>
      columnsOrder.map((col) => serialize((row as Record<string, unknown>)[col.key])),
    );

    return {
      columns: columnsOrder.map((col) => col.header),
      rows,
    };
  }, [data, pivotConfig]);

  const safeFileBase = useMemo(() => {
    const base = (localTitle || "table").trim();
    const sanitized = base
      .split("")
      .map((char) =>
        /[0-9A-Za-z_\-]/.test(char) ? char : "_",
      )
      .join("")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
    return sanitized || "table";
  }, [localTitle]);

  const handleExport = useCallback(
    async (format: "xlsx" | "ods") => {
      if (!exportDataset) return;

      try {
        setExporting(format);
        const filename = `${safeFileBase}.${format}`;
        const blob = await exportTable({
          columns: exportDataset.columns,
          rows: exportDataset.rows,
          format,
          filename,
        });

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Table export failed", err);
        alert("Не удалось скачать файл");
      } finally {
        setExporting(null);
      }
    },
    [exportDataset, safeFileBase],
  );

  return (
    <div className="flex flex-col h-full">
      {/* ====== Заголовок ====== */}
      <div className="flex justify-between items-center mb-2 gap-4">
        {editingTitle && !isReadonly ? (
          <input
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={() => {
              setEditingTitle(false);
              onTitleChange?.(localTitle);
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
            {localTitle}
          </span>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport("xlsx")}
            disabled={!exportDataset || exporting !== null}
            className="text-sm border border-brand text-brand px-2 py-1 rounded hover:bg-brand hover:text-white transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting === "xlsx" ? "Готовим XLSX..." : "XLSX"}
          </button>
          <button
            onClick={() => handleExport("ods")}
            disabled={!exportDataset || exporting !== null}
            className="text-sm border border-brand text-brand px-2 py-1 rounded hover:bg-brand hover:text-white transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting === "ods" ? "Готовим ODS..." : "ODS"}
          </button>
          {!isReadonly && (
            <button
              onClick={() => setMode(mode === "view" ? "edit" : "view")}
              className="text-sm border px-2 py-1 rounded"
            >
              {mode === "view" ? "Редактировать" : "Сохранить"}
            </button>
          )}
          {!isReadonly && (
            <span className="drag-handle cursor-move px-2 relative before:content-['⋮'] before:absolute before:left-[2px] before:top-0">
              ⋮
            </span>
          )}
        </div>
      </div>

      {/* ====== Контент ====== */}
      <div className="flex-1 overflow-hidden">
        {mode === "view" || isReadonly ? (
          <div className="h-full overflow-auto">
            <TableView
              data={data}
              config={pivotConfig}
              height={height ?? 500}
            />
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <TableEditor
              data={data}
              config={pivotConfig}
              onConfigChange={setPivotConfig}
            />
          </div>
        )}
      </div>
    </div>
  );
}
