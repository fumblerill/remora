"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import TableView from "./TableView";
import TableEditor from "./TableEditor";
import type { PivotConfig } from "@/lib/types";
import { normalizePivotConfig } from "@/lib/pivot";

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
    () => normalizePivotConfig(config, data),
    [config, data]
  );

  const normalizedString = useMemo(
    () => JSON.stringify(normalizedConfig),
    [normalizedConfig]
  );

  const [pivotConfig, setPivotConfig] = useState<PivotConfig>(normalizedConfig);

  const lastPropStringRef = useRef<string | null>(normalizedString);
  const lastEmittedRef = useRef<string>(normalizedString);

  const [mode, setMode] = useState<"view" | "edit">(config ? "view" : "edit");
  const [localTitle, setLocalTitle] = useState(title);
  const [editingTitle, setEditingTitle] = useState(false);

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
