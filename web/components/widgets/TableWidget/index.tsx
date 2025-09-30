"use client";

import { useState } from "react";
import TableView from "./TableView";
import TableEditor from "./TableEditor";
import type { PivotConfig } from "@/lib/types";

interface TableWidgetProps {
  data: any[];
  config?: PivotConfig;
}

export default function TableWidget({ data, config }: TableWidgetProps) {
  // если есть данные, берём поля; иначе пустой массив
  const fields = data && data.length > 0 ? Object.keys(data[0]) : [];

  // инициализация конфига: если ничего не передали → всё пустое, кроме available
  const [pivotConfig, setPivotConfig] = useState<PivotConfig>(
    config || { available: fields, rows: [], cols: [], values: [] }
  );

  const [mode, setMode] = useState<"view" | "edit">(config ? "view": "edit");

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold">Table Widget</span>
        <button
          onClick={() => setMode(mode === "view" ? "edit" : "view")}
          className="text-sm border px-2 py-1 rounded"
        >
          {mode === "view" ? "Редактировать" : "Сохранить"}
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {mode === "view" ? (
          <TableView data={data} config={pivotConfig} />
        ) : (
          <TableEditor
            data={data}
            config={pivotConfig}
            onConfigChange={setPivotConfig}
          />
        )}
      </div>
    </div>
  );
}
