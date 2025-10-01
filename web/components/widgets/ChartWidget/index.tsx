"use client";

import { useState } from "react";
import ChartEditor, { ChartConfig } from "./ChartEditor";
import ChartView from "./ChartView";

interface ChartWidgetProps {
  data: any[];
  config?: ChartConfig;
  height?: number;
}

export default function ChartWidget({ data, config, height }: ChartWidgetProps) {
  const [chartConfig, setChartConfig] = useState<ChartConfig>(
    config || {
      type: "bar",
      xAxis: null,
      yAxis: [],
      legend: true,
      legendPosition: "right",
      xLabel: "",
      yLabel: "",
      useAggregation: false,
    }
  );

  const [mode, setMode] = useState<"view" | "edit">(config ? "view" : "edit");
  const [title, setTitle] = useState("Chart Widget");
  const [editingTitle, setEditingTitle] = useState(false);

  return (
    <div className="flex flex-col h-full">
      {/* шапка */}
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

      {/* содержимое */}
      <div className="flex-1 overflow-hidden">
        {mode === "view" ? (
          <div className="h-full overflow-auto">
            <ChartView data={data} config={chartConfig} height={height ?? 400} />
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <ChartEditor data={data} config={chartConfig} onConfigChange={setChartConfig} />
          </div>
        )}
      </div>
    </div>
  );
}
