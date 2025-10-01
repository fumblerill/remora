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
  });

  const updateConfig = (partial: Partial<ChartConfig>) => {
    const newConfig = { ...chartConfig, ...partial };
    setChartConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  return (
    <div className="space-y-4">
      {/* Тип графика */}
      <div>
        <label className="font-semibold">Тип графика</label>
        <select
          value={chartConfig.type}
          onChange={(e) => updateConfig({ type: e.target.value as ChartConfig["type"] })}
          className="ml-2 border rounded px-2 py-1"
        >
          <option value="bar">Столбчатая</option>
          <option value="line">Линейная</option>
          <option value="pie">Круговая</option>
        </select>
      </div>

      {/* Оси */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="font-semibold block mb-1">Ось X (Категории)</label>
          <select
            value={chartConfig.xAxis ?? ""}
            onChange={(e) => updateConfig({ xAxis: e.target.value || null })}
            className="w-full border rounded px-2 py-1"
          >
            <option value="">—</option>
            {fields.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Подпись оси X"
            value={chartConfig.xLabel}
            onChange={(e) => updateConfig({ xLabel: e.target.value })}
            className="mt-2 w-full border rounded px-2 py-1 text-sm"
          />
        </div>

        <div>
          <label className="font-semibold block mb-1">Ось Y (Показатели)</label>
          <select
            multiple
            value={chartConfig.yAxis.map((y) => y.field)}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
              const newY = selected.map((field) => {
                const existing = chartConfig.yAxis.find((y) => y.field === field);
                return existing || { field, agg: "sum" as const };
              });
              updateConfig({ yAxis: newY });
            }}
            className="w-full border rounded px-2 py-1 h-32"
          >
            {fields.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Подпись оси Y"
            value={chartConfig.yLabel}
            onChange={(e) => updateConfig({ yLabel: e.target.value })}
            className="mt-2 w-full border rounded px-2 py-1 text-sm"
          />
        </div>
      </div>

      {/* Переключатель агрегации */}
      <div>
        <label>
          <input
            type="checkbox"
            checked={chartConfig.useAggregation}
            onChange={(e) => updateConfig({ useAggregation: e.target.checked })}
          />{" "}
          Использовать агрегацию (сумма, среднее, количество)
        </label>
      </div>

      {/* Агрегации для каждого Y */}
      {chartConfig.useAggregation && chartConfig.yAxis.length > 0 && (
        <div>
          <label className="font-semibold block mb-1">Агрегация показателей</label>
          {chartConfig.yAxis.map((y, idx) => (
            <div key={y.field} className="flex items-center gap-2 mb-1">
              <span className="text-sm">{y.field}</span>
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

      {/* Легенда */}
      <div>
        <label>
          <input
            type="checkbox"
            checked={chartConfig.legend}
            onChange={(e) => updateConfig({ legend: e.target.checked })}
          />{" "}
          Показать легенду
        </label>
      </div>

      {chartConfig.legend && (
        <div className="mt-2">
          <label className="font-semibold block mb-1">Расположение легенды</label>
          <select
            value={chartConfig.legendPosition}
            onChange={(e) =>
              updateConfig({ legendPosition: e.target.value as ChartConfig["legendPosition"] })
            }
            className="border rounded px-2 py-1"
          >
            <option value="right">Справа</option>
            <option value="left">Слева</option>
            <option value="top">Сверху</option>
            <option value="bottom">Снизу</option>
          </select>
        </div>
      )}
    </div>
  );
}
