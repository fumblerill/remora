"use client";

import { useState } from "react";
import TableView from "./TableView";
import TableEditor from "./TableEditor";
import type { PivotConfig } from "@/lib/types";

interface TableWidgetProps {
  data: any[];
  config?: PivotConfig;
  height?: number;
}

export default function TableWidget({ data, config, height }: TableWidgetProps) {
  const fields = data && data.length > 0 ? Object.keys(data[0]) : [];

  const [pivotConfig, setPivotConfig] = useState<PivotConfig>(
    config || { available: fields, rows: [], cols: [], values: [] }
  );

  const [mode, setMode] = useState<"view" | "edit">(config ? "view" : "edit");
  const [title, setTitle] = useState("Table Widget");
  const [editingTitle, setEditingTitle] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-2">
        {editingTitle ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setEditingTitle(false)}
            autoFocus
            className="font-semibold border rounded px-1 py-0.5 text-sm"
          />
        ) : (
          <span
            className="font-semibold cursor-text"
            onDoubleClick={() => setEditingTitle(true)}
            title="Двойной клик для редактирования"
          >
            {title}
          </span>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode(mode === "view" ? "edit" : "view")}
            className="text-sm border px-2 py-1 rounded"
          >
            {mode === "view" ? "Редактировать" : "Сохранить"}
          </button>
          <span className="drag-handle cursor-move px-2">⋮⋮</span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {mode === "view" ? (
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
