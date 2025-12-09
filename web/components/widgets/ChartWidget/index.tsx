"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import ChartEditor, { ChartConfig, normalizeChartConfig } from "./ChartEditor";
import ChartView from "./ChartView";

interface ChartWidgetProps {
  data: any[];
  config?: ChartConfig;
  height?: number;
  title: string;
  onTitleChange?: (newTitle: string) => void;
  onConfigChange?: (newConfig: ChartConfig) => void;
  isReadonly?: boolean; // ✅ добавили
}

export default function ChartWidget({
  data,
  config,
  height,
  title,
  onTitleChange,
  onConfigChange,
  isReadonly = false, // ✅ по умолчанию false
}: ChartWidgetProps) {
  const normalizedConfig = useMemo(
    () => normalizeChartConfig(config, data, { ensureAxes: !config }),
    [config, data]
  );

  const normalizedString = useMemo(
    () => JSON.stringify(normalizedConfig),
    [normalizedConfig]
  );

  const [chartConfig, setChartConfig] = useState<ChartConfig>(normalizedConfig);
  const lastPropStringRef = useRef<string | null>(normalizedString);
  const lastEmittedRef = useRef<string>(normalizedString);
  const lastLocalSnapshotRef = useRef<string>(normalizedString);

  const [mode, setMode] = useState<"view" | "edit">(config ? "view" : "edit");
  const [localTitle, setLocalTitle] = useState(title);
  const [editingTitle, setEditingTitle] = useState(false);

  useEffect(() => {
    lastLocalSnapshotRef.current = JSON.stringify(chartConfig);
  }, [chartConfig]);

  // 🔄 уведомляем контейнер при изменении конфигурации
  useEffect(() => {
    if (lastPropStringRef.current === normalizedString) {
      return;
    }

    lastPropStringRef.current = normalizedString;
    if (
      lastLocalSnapshotRef.current === normalizedString ||
      lastEmittedRef.current === normalizedString
    ) {
      return;
    }
    setChartConfig(normalizedConfig);
  }, [normalizedConfig, normalizedString]);

  useEffect(() => {
    if (!onConfigChange) return;
    const serialized = JSON.stringify(chartConfig);
    if (serialized === lastEmittedRef.current) return;
    lastEmittedRef.current = serialized;
    onConfigChange(chartConfig);
  }, [chartConfig, onConfigChange]);

  // 🔄 синхронизируем внешний title
  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  return (
    <div className="flex flex-col h-full">
      {/* ====== Шапка ====== */}
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
            <ChartView data={data} config={chartConfig} height={height ?? 400} />
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <ChartEditor
              data={data}
              config={chartConfig}
              onConfigChange={setChartConfig}
            />
          </div>
        )}
      </div>
    </div>
  );
}
