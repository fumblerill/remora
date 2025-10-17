"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PivotFilterOperator } from "@/lib/types";

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
  filters: ChartFilter[];
  includeOthers?: boolean;
}

export interface ChartFilter {
  label: string;
  column: string;
  operator: PivotFilterOperator;
  value: string;
}

const aggregationOptions: { value: "sum" | "count" | "avg"; label: string }[] =
  [
    { value: "sum", label: "Сумма" },
    { value: "count", label: "Количество" },
    { value: "avg", label: "Среднее" },
  ];

const filterOperators: { value: PivotFilterOperator; label: string }[] = [
  { value: "contains", label: "Содержит" },
  { value: "eq", label: "Равно" },
  { value: "starts_with", label: "Начинается с" },
  { value: "ends_with", label: "Заканчивается на" },
  { value: "in", label: "Входит в список" },
];

const textOperators = new Set<PivotFilterOperator>([
  "contains",
  "eq",
  "starts_with",
  "ends_with",
  "in",
]);

function listFields(data: any[]): string[] {
  const set = new Set<string>();
  data.forEach((row) => {
    if (!row || typeof row !== "object") return;
    Object.keys(row).forEach((key) => {
      if (key) set.add(key);
    });
  });
  return Array.from(set);
}

export function normalizeChartConfig(
  config: ChartConfig | undefined,
  data: any[],
  options: { ensureAxes?: boolean } = {},
): ChartConfig {
  const ensureAxes = options.ensureAxes ?? true;
  const fields = listFields(data);
  const type: ChartConfig["type"] = config?.type ?? "bar";

  let xAxis =
    config?.xAxis && fields.includes(config.xAxis)
      ? config.xAxis
      : ensureAxes
        ? (fields[0] ?? null)
        : null;

  const rawYAxis = Array.isArray(config?.yAxis) ? config!.yAxis : [];
  let yAxis = rawYAxis.reduce<
    Array<{ field: string; agg?: "sum" | "count" | "avg" }>
  >((acc, item) => {
    if (typeof item === "string") {
      if (fields.includes(item)) {
        acc.push({ field: item, agg: "sum" });
      }
      return acc;
    }

    if (item && typeof item === "object" && typeof item.field === "string") {
      if (!fields.includes(item.field)) {
        return acc;
      }

      const agg =
        item.agg && aggregationOptions.some((opt) => opt.value === item.agg)
          ? item.agg
          : undefined;

      acc.push({ field: item.field, agg });
    }

    return acc;
  }, []);

  if (type === "pie" && yAxis.length > 1) {
    yAxis = yAxis.slice(0, 1);
  }

  if (ensureAxes && yAxis.length === 0 && fields.length) {
    const defaultField =
      xAxis && fields.length > 1
        ? (fields.find((f) => f !== xAxis) ?? fields[0])
        : fields[0];
    if (defaultField) {
      yAxis = [
        {
          field: defaultField,
          agg: config?.useAggregation ? "sum" : undefined,
        },
      ];
    }
  }

  const useAggregation = config?.useAggregation ?? false;
  yAxis = yAxis.map((series) => ({
    field: series.field,
    agg: useAggregation ? (series.agg ?? "sum") : series.agg,
  }));

  if (type === "pie" && xAxis === null && fields.length) {
    xAxis = fields[0];
  }

  const filters = Array.isArray(config?.filters)
    ? config!.filters
        .map((filter) => {
          const rawLabel =
            typeof (filter as any).label === "string"
              ? (filter as any).label
              : "";
          const valueString =
            typeof (filter as any).value === "string"
              ? (filter as any).value
              : String((filter as any).value ?? "");
          const label = rawLabel !== "" ? rawLabel : valueString;
          return {
            label,
            column:
              typeof (filter as any).column === "string" &&
              fields.includes((filter as any).column)
                ? (filter as any).column
                : (fields[0] ?? ""),
            operator: (filter as any).operator as PivotFilterOperator,
            value: valueString,
          };
        })
        .filter(
          (filter) =>
            filter.column &&
            textOperators.has(filter.operator) &&
            typeof filter.value === "string",
        )
    : [];

  return {
    type,
    xAxis,
    yAxis,
    legend: config?.legend ?? true,
    legendPosition: config?.legendPosition ?? "right",
    xLabel: config?.xLabel ?? "",
    yLabel: config?.yLabel ?? "",
    useAggregation,
    pieShowPercent: config?.pieShowPercent ?? false,
    filters,
    includeOthers: config?.includeOthers ?? false,
  };
}

interface ChartEditorProps {
  data: any[];
  config?: ChartConfig;
  onConfigChange?: (config: ChartConfig) => void;
}

export default function ChartEditor({
  data,
  config,
  onConfigChange,
}: ChartEditorProps) {
  if (!data || data.length === 0) return <div>Нет данных для конфигурации</div>;

  const fields = useMemo(() => listFields(data), [data]);

  const ensureDefaults = !config;
  const [localConfig, setLocalConfig] = useState<ChartConfig>(() =>
    normalizeChartConfig(config, data, { ensureAxes: ensureDefaults }),
  );

  const lastExternalRef = useRef<string | null>(JSON.stringify(localConfig));
  const lastEmittedRef = useRef<string>(JSON.stringify(localConfig));

  useEffect(() => {
    const normalized = normalizeChartConfig(config, data, {
      ensureAxes: !config,
    });
    const serialized = JSON.stringify(normalized);
    if (lastExternalRef.current === serialized) return;
    lastExternalRef.current = serialized;
    setLocalConfig(normalized);
  }, [config, data]);

  useEffect(() => {
    if (!onConfigChange) return;
    const serialized = JSON.stringify(localConfig);
    if (serialized === lastEmittedRef.current) return;
    lastEmittedRef.current = serialized;
    onConfigChange(localConfig);
  }, [localConfig, onConfigChange]);

  const applyConfig = (updater: (prev: ChartConfig) => ChartConfig) => {
    setLocalConfig((prev) =>
      normalizeChartConfig(updater(prev), data, { ensureAxes: false }),
    );
  };

  const handleAddSeries = () => {
    if (!fields.length) return;
    const fallback =
      fields.find(
        (f) => !localConfig.yAxis.some((series) => series.field === f),
      ) ?? fields[0];
    applyConfig((prev) => ({
      ...prev,
      yAxis: [
        ...prev.yAxis,
        {
          field: fallback,
          agg: prev.useAggregation
            ? "sum"
            : prev.yAxis.find((s) => s.field === fallback)?.agg,
        },
      ],
    }));
  };

  const handleSeriesFieldChange = (index: number, field: string) => {
    applyConfig((prev) => {
      const next = [...prev.yAxis];
      const current = next[index];
      if (!current) return prev;
      next[index] = { ...current, field };
      return { ...prev, yAxis: next };
    });
  };

  const handleSeriesAggChange = (
    index: number,
    agg: "sum" | "count" | "avg",
  ) => {
    applyConfig((prev) => {
      const next = [...prev.yAxis];
      const current = next[index];
      if (!current) return prev;
      next[index] = { ...current, agg };
      return { ...prev, yAxis: next };
    });
  };

  const handleRemoveSeries = (index: number) => {
    applyConfig((prev) => {
      const next = [...prev.yAxis];
      next.splice(index, 1);
      return { ...prev, yAxis: next };
    });
  };

  const handleToggleAggregation = (checked: boolean) => {
    applyConfig((prev) => ({
      ...prev,
      useAggregation: checked,
      yAxis: prev.yAxis.map((series) => ({
        ...series,
        agg: checked ? (series.agg ?? "sum") : series.agg,
      })),
    }));
  };

  const axisOptions =
    fields.length > 0
      ? fields
      : ([localConfig.xAxis].filter(Boolean) as string[]);

  const handleAddFilter = () => {
    if (!fields.length) return;
    const defaultColumn = fields[0];
    const defaultLabel = `Группа ${localConfig.filters.length + 1}`;
    applyConfig((prev) => ({
      ...prev,
      filters: [
        ...prev.filters,
        {
          label: defaultLabel,
          column: defaultColumn,
          operator: "contains",
          value: defaultLabel,
        },
      ],
    }));
  };

  const handleUpdateFilter = (index: number, patch: Partial<ChartFilter>) => {
    applyConfig((prev) => {
      const next = [...prev.filters];
      const current = next[index];
      if (!current) return prev;
      next[index] = { ...current, ...patch };
      return { ...prev, filters: next };
    });
  };

  const handleRemoveFilter = (index: number) => {
    applyConfig((prev) => {
      const next = [...prev.filters];
      next.splice(index, 1);
      return { ...prev, filters: next };
    });
  };

  return (
    <div className="space-y-6">
      {/* Тип графика */}
      <section className="bg-white rounded border shadow-sm p-4 space-y-3">
        <h3 className="text-base font-semibold text-brand">Тип графика</h3>
        <select
          value={localConfig.type}
          onChange={(e) =>
            applyConfig((prev) => ({
              ...prev,
              type: e.target.value as ChartConfig["type"],
            }))
          }
          className="w-full border rounded px-2 py-1 text-sm"
        >
          <option value="bar">Столбчатая диаграмма</option>
          <option value="line">Линейная диаграмма</option>
          <option value="pie">Круговая диаграмма</option>
        </select>
      </section>

      {/* Оси */}
      <section className="bg-white rounded border shadow-sm p-4 space-y-4">
        <h3 className="text-base font-semibold text-brand">Оси</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <span className="text-sm font-medium text-gray-600">
              Ось X (категории)
            </span>
            <select
              value={localConfig.xAxis ?? ""}
              onChange={(e) =>
                applyConfig((prev) => ({
                  ...prev,
                  xAxis: e.target.value ? e.target.value : null,
                }))
              }
              className="w-full border rounded px-2 py-1 text-sm"
            >
              <option value="">— Не выбрано —</option>
              {axisOptions.map((field) => (
                <option key={field} value={field}>
                  {field}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Подпись оси X"
              value={localConfig.xLabel}
              onChange={(e) =>
                applyConfig((prev) => ({
                  ...prev,
                  xLabel: e.target.value,
                }))
              }
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium text-gray-600">
              Подпись оси Y
            </span>
            <input
              type="text"
              placeholder="Подпись оси Y"
              value={localConfig.yLabel}
              onChange={(e) =>
                applyConfig((prev) => ({
                  ...prev,
                  yLabel: e.target.value,
                }))
              }
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>
        </div>
      </section>

      {/* Показатели */}
      <section className="bg-white rounded border shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-brand">Показатели</h3>
          <button
            type="button"
            onClick={handleAddSeries}
            className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
            disabled={!fields.length}
          >
            Добавить показатель
          </button>
        </div>
        {localConfig.yAxis.length === 0 ? (
          <p className="text-xs text-gray-400">
            Выберите одно или несколько полей для построения графика.
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {localConfig.yAxis.map((series, index) => (
              <div
                key={`${series.field}-${index}`}
                className="grid md:grid-cols-3 gap-2 border rounded px-2 py-2 bg-gray-50 items-center"
              >
                <select
                  value={series.field}
                  onChange={(e) =>
                    handleSeriesFieldChange(index, e.target.value)
                  }
                  className="border rounded px-2 py-1 text-sm"
                >
                  {fields.map((field) => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
                </select>
                <select
                  value={series.agg ?? "sum"}
                  onChange={(e) =>
                    handleSeriesAggChange(
                      index,
                      e.target.value as "sum" | "count" | "avg",
                    )
                  }
                  className="border rounded px-2 py-1 text-sm"
                  disabled={!localConfig.useAggregation}
                >
                  {aggregationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleRemoveSeries(index)}
                  className="text-xs px-2 py-1 border rounded text-red-500"
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Дополнительные настройки */}
      <section className="bg-white rounded border shadow-sm p-4 space-y-4">
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={localConfig.useAggregation}
              onChange={(e) => handleToggleAggregation(e.target.checked)}
            />
            <span className="font-medium text-sm">
              Использовать агрегацию по оси X
            </span>
          </label>
          <p className="text-xs text-gray-400">
            При агрегации значения объединяются по категориям оси X с выбранной
            функцией агрегирования.
          </p>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={localConfig.legend}
              onChange={(e) =>
                applyConfig((prev) => ({
                  ...prev,
                  legend: e.target.checked,
                }))
              }
            />
            <span className="font-medium text-sm">Показывать легенду</span>
          </label>
          {localConfig.legend && (
            <select
              value={localConfig.legendPosition}
              onChange={(e) =>
                applyConfig((prev) => ({
                  ...prev,
                  legendPosition: e.target
                    .value as ChartConfig["legendPosition"],
                }))
              }
              className="w-full border rounded px-2 py-1 text-sm"
            >
              <option value="right">Справа</option>
              <option value="left">Слева</option>
              <option value="top">Сверху</option>
              <option value="bottom">Снизу</option>
            </select>
          )}
        </div>

        {localConfig.type === "pie" && (
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={localConfig.pieShowPercent ?? false}
                onChange={(e) =>
                  applyConfig((prev) => ({
                    ...prev,
                    pieShowPercent: e.target.checked,
                  }))
                }
              />
              <span className="font-medium text-sm">
                Показывать проценты вместо значений
              </span>
            </label>
          </div>
        )}
      </section>

      {/* Фильтры */}
      <section className="bg-white rounded border shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-brand">Фильтры данных</h3>
          <button
            type="button"
            onClick={handleAddFilter}
            className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
            disabled={!fields.length}
          >
            Добавить фильтр
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Фильтры позволяют группировать категории по шаблону. Каждое совпадение
          заменит значение оси X на указанный ярлык.
        </p>

        {localConfig.filters.length === 0 ? (
          <p className="text-xs text-gray-400">Фильтры пока не настроены.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {localConfig.filters.map((filter, index) => (
              <div
                key={`chart-filter-${index}`}
                className="grid md:grid-cols-5 gap-2 border rounded px-2 py-2 bg-gray-50 items-center"
              >
                <input
                  type="text"
                  value={filter.label}
                  onChange={(e) =>
                    handleUpdateFilter(index, { label: e.target.value })
                  }
                  placeholder="Ярлык (например, Ошибка логики)"
                  className="border rounded px-2 py-1 text-sm md:col-span-2"
                />

                <select
                  value={filter.column}
                  onChange={(e) =>
                    handleUpdateFilter(index, { column: e.target.value })
                  }
                  className="border rounded px-2 py-1 text-sm"
                >
                  {fields.map((field) => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
                </select>

                <select
                  value={filter.operator}
                  onChange={(e) =>
                    handleUpdateFilter(index, {
                      operator: e.target.value as PivotFilterOperator,
                    })
                  }
                  className="border rounded px-2 py-1 text-sm"
                >
                  {filterOperators.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={filter.value}
                  onChange={(e) =>
                    handleUpdateFilter(index, { value: e.target.value })
                  }
                  placeholder="Значение фильтра"
                  className="border rounded px-2 py-1 text-sm"
                />

                <button
                  type="button"
                  onClick={() => handleRemoveFilter(index)}
                  className="text-xs px-2 py-1 border rounded text-red-500"
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        )}

        {localConfig.filters.length > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={localConfig.includeOthers ?? false}
              onChange={(e) =>
                applyConfig((prev) => ({
                  ...prev,
                  includeOthers: e.target.checked,
                }))
              }
            />
            <span className="text-gray-600">
              Оставлять категории, не попавшие ни под один фильтр
            </span>
          </label>
        )}
      </section>
    </div>
  );
}
