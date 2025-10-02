"use client";

import { useState } from "react";

export interface ChartConfig {
  type: "bar" | "line" | "pie";
  xAxis: string | null;
  yAxis: { field: string; agg?: "sum" | "count" | "avg" }[];
  legend: boolean;
  legendPosition: "right" | "bottom" | "left" | "top";
  xLabel: string;
  yLabel: string;
  useAggregation: boolean;
  pieShowPercent?: boolean;
}

interface ChartEditorProps {
  data: any[];
  config?: ChartConfig;
  onConfigChange?: (config: ChartConfig) => void;
}

export default function ChartEditor({ data, config, onConfigChange }: ChartEditorProps) {
  if (!data || data.length === 0) return <div>Нет данных для конфигурации</div>;

  const fields = Object.keys(data[0]);
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    type: config?.type ?? "bar",
    xAxis: config?.xAxis ?? null,
    yAxis: config?.yAxis ?? [],
    legend: config?.legend ?? true,
    legendPosition: config?.legendPosition ?? "right",
    xLabel: config?.xLabel ?? "",
    yLabel: config?.yLabel ?? "",
    useAggregation: config?.useAggregation ?? false,
    pieShowPercent: config?.pieShowPercent ?? false,
  });

  const updateConfig = (partial: Partial<ChartConfig>) => {
    const newConfig = { ...chartConfig, ...partial };
    setChartConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  return (
    <div className="space-y-6">
      {/* Тип графика */}
      <div>
        <label className="block font-semibold mb-2">Тип графика</label>
        <select
          value={chartConfig.type}
          onChange={(e) => updateConfig({ type: e.target.value as ChartConfig["type"] })}
          className="w-full border rounded px-2 py-1"
        >
          <option value="bar">Столбчатая</option>
          <option value="line">Линейная</option>
          <option value="pie">Круговая</option>
        </select>
      </div>

      {/* Оси */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block font-semibold mb-2">Ось X (Категории)</label>
          <div className="space-y-1 max-h-32 overflow-y-auto border rounded p-2">
            {fields.map((f) => (
              <label key={f} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="x-axis"
                  checked={chartConfig.xAxis === f}
                  onChange={() => updateConfig({ xAxis: f })}
                />
                {f}
              </label>
            ))}
          </div>
          <input
            type="text"
            placeholder="Подпись оси X"
            value={chartConfig.xLabel}
            onChange={(e) => updateConfig({ xLabel: e.target.value })}
            className="mt-2 w-full border rounded px-2 py-1 text-sm"
          />
        </div>

        <div>
          <label className="block font-semibold mb-2">Ось Y (Показатели)</label>
          <div className="space-y-1 max-h-32 overflow-y-auto border rounded p-2">
            {fields.map((f) => (
              <label key={f} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={chartConfig.yAxis.some((y) => y.field === f)}
                  onChange={(e) => {
                    let newY = [...chartConfig.yAxis];
                    if (e.target.checked) {
                      newY.push({ field: f, agg: "sum" as const });
                    } else {
                      newY = newY.filter((y) => y.field !== f);
                    }
                    updateConfig({ yAxis: newY });
                  }}
                />
                {f}
              </label>
            ))}
          </div>
          <input
            type="text"
            placeholder="Подпись оси Y"
            value={chartConfig.yLabel}
            onChange={(e) => updateConfig({ yLabel: e.target.value })}
            className="mt-2 w-full border rounded px-2 py-1 text-sm"
          />
        </div>
      </div>

      {/* Агрегация */}
      <div>
        <label className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={chartConfig.useAggregation}
            onChange={(e) => updateConfig({ useAggregation: e.target.checked })}
          />
          <span className="font-semibold">Использовать агрегацию</span>
        </label>
        {chartConfig.useAggregation && chartConfig.yAxis.length > 0 && (
          <div className="space-y-2">
            {chartConfig.yAxis.map((y, idx) => (
              <div key={y.field} className="flex items-center gap-2">
                <span className="text-sm flex-1">{y.field}</span>
                <select
                  value={y.agg ?? "sum"}
                  onChange={(e) => {
                    const newY = [...chartConfig.yAxis];
                    newY[idx] = { ...y, agg: e.target.value as "sum" | "count" | "avg" };
                    updateConfig({ yAxis: newY });
                  }}
                  className="border rounded px-1 py-0.5 text-sm"
                >
                  <option value="sum">Сумма</option>
                  <option value="count">Количество</option>
                  <option value="avg">Среднее</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Легенда */}
      <div>
        <label className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={chartConfig.legend}
            onChange={(e) => updateConfig({ legend: e.target.checked })}
          />
          <span className="font-semibold">Показать легенду</span>
        </label>
        {chartConfig.legend && (
          <select
            value={chartConfig.legendPosition}
            onChange={(e) =>
              updateConfig({ legendPosition: e.target.value as ChartConfig["legendPosition"] })
            }
            className="w-full border rounded px-2 py-1"
          >
            <option value="right">Справа</option>
            <option value="left">Слева</option>
            <option value="top">Сверху</option>
            <option value="bottom">Снизу</option>
          </select>
        )}
      </div>

      {/* Pie only */}
      {chartConfig.type === "pie" && (
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={chartConfig.pieShowPercent ?? false}
              onChange={(e) => updateConfig({ pieShowPercent: e.target.checked })}
            />
            <span className="font-semibold">Проценты вместо значений</span>
          </label>
        </div>
      )}
    </div>
  );
}
