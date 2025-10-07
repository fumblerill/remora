"use client";

import { useState, useEffect } from "react";
import TableView from "./TableView";
import TableEditor from "./TableEditor";
import type { PivotConfig } from "@/lib/types";

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
  const fields = data && data.length > 0 ? Object.keys(data[0]) : [];

  const [pivotConfig, setPivotConfig] = useState<PivotConfig>(
    config || { available: fields, rows: [], cols: [], values: [] }
  );

  const [mode, setMode] = useState<"view" | "edit">(config ? "view" : "edit");
  const [localTitle, setLocalTitle] = useState(title);
  const [editingTitle, setEditingTitle] = useState(false);

  // 🔄 уведомляем контейнер при изменении конфига
  useEffect(() => {
    if (onConfigChange) onConfigChange(pivotConfig);
  }, [pivotConfig]);

  // 🔄 синхронизируем внешний title с локальным
  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  return (
    <div className="flex flex-col h-full">
      {/* ====== Заголовок ====== */}
      <div className="flex justify-between items-center mb-2">
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

        {!isReadonly && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode(mode === "view" ? "edit" : "view")}
              className="text-sm border px-2 py-1 rounded"
            >
              {mode === "view" ? "Редактировать" : "Сохранить"}
            </button>
            <span className="drag-handle cursor-move px-2 relative before:content-['⋮'] before:absolute before:left-[2px] before:top-0">⋮</span>
          </div>
        )}
      </div>

      {/* ====== Контент ====== */}
      <div className="flex-1 overflow-hidden">
        {mode === "view" || isReadonly ? (
          <div className="h-full overflow-auto">
            <TableView data={data} config={pivotConfig} height={height ?? 500} />
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
