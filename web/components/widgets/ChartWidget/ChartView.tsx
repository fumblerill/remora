"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { ChartConfig, ChartFilter } from "./ChartEditor";
import type { PieLabelRenderProps } from "recharts";
import { useEffect, useMemo, useState } from "react";

interface ChartViewProps {
  data: any[];
  config: ChartConfig;
  height?: number;
}

const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7f50",
  "#00c49f",
  "#ffbb28",
  "#a4de6c",
];

const aggregationLabels: Record<
  NonNullable<ChartConfig["yAxis"][number]["agg"]>,
  string
> = {
  sum: "Сумма",
  count: "Количество",
  avg: "Среднее",
};

function buildSeriesKey(series: ChartConfig["yAxis"][number]) {
  return series.agg
    ? `${series.field} (${aggregationLabels[series.agg] ?? series.agg})`
    : series.field;
}

function aggregateRows(
  rows: any[],
  field: string,
  agg: "sum" | "count" | "avg",
) {
  if (agg === "count") {
    return rows.filter(
      (r) => r[field] !== undefined && r[field] !== null && r[field] !== "",
    ).length;
  }
  const vals = rows.map((r) => Number(r[field])).filter((v) => !isNaN(v));
  if (agg === "sum") return vals.reduce((a, b) => a + b, 0);
  if (agg === "avg")
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  return 0;
}

function evaluateFilter(value: any, filter: ChartFilter): boolean {
  const { operator } = filter;
  const target = value === undefined || value === null ? "" : String(value);
  const needle = filter.value ?? "";

  switch (operator) {
    case "contains":
      return target.toLowerCase().includes(needle.toLowerCase());
    case "eq":
      return target.toLowerCase() === needle.toLowerCase();
    case "starts_with":
      return target.toLowerCase().startsWith(needle.toLowerCase());
    case "ends_with":
      return target.toLowerCase().endsWith(needle.toLowerCase());
    case "in":
      return needle
        .split(",")
        .map((part) => part.trim().toLowerCase())
        .filter(Boolean)
        .some((part) => target.toLowerCase() === part);
    default:
      return false;
  }
}

export default function ChartView({
  data,
  config,
  height = 400,
}: ChartViewProps) {
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);
  const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);

  if (!data || data.length === 0) return <div>Нет данных</div>;
  if (!config.xAxis || config.yAxis.length === 0)
    return <div>Настрой график</div>;

  const xKey = config.xAxis as string;
  const seriesDefinitions = useMemo(
    () =>
      config.yAxis.map((series) => ({
        ...series,
        key: buildSeriesKey(series),
      })),
    [config.yAxis],
  );

  const filters = config.filters ?? [];
  const includeOthers = config.includeOthers ?? false;
  const categoryLegendEnabled =
    config.type === "bar" && seriesDefinitions.length === 1;

  const processedData = useMemo(() => {
    if (!filters.length || !xKey) return data;
    const result: any[] = [];
    for (const row of data) {
      const match = filters.find((filter) =>
        evaluateFilter(row[filter.column], filter),
      );
      if (match) {
        result.push({
          ...row,
          [xKey]: match.label || match.value,
        });
      } else if (includeOthers) {
        result.push({ ...row });
      }
    }
    return result;
  }, [data, filters, includeOthers, xKey]);

  if (processedData.length === 0) {
    return <div>Нет данных по выбранным фильтрам</div>;
  }

  const legendProps =
    config.legendPosition === "right"
      ? {
          layout: "vertical" as const,
          verticalAlign: "middle" as const,
          align: "right" as const,
        }
      : config.legendPosition === "left"
        ? {
            layout: "vertical" as const,
            verticalAlign: "middle" as const,
            align: "left" as const,
          }
        : config.legendPosition === "top"
          ? {
              layout: "horizontal" as const,
              verticalAlign: "top" as const,
              align: "center" as const,
            }
          : {
              layout: "horizontal" as const,
              verticalAlign: "bottom" as const,
              align: "center" as const,
            };

  useEffect(() => {
    setHiddenSeries([]);
  }, [
    config.type,
    config.xAxis,
    seriesDefinitions.map((s) => s.key).join("|"),
  ]);

  useEffect(() => {
    setHiddenCategories([]);
  }, [
    categoryLegendEnabled,
    xKey,
    processedData.map((row) => row[xKey]).join("|"),
  ]);

  const handleLegendClick = (o: any) => {
    const key = (o.dataKey as string) ?? (o.value as string);
    if (!key) return;
    setHiddenSeries((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const pieData = useMemo(() => {
    if (config.type !== "pie" || !xKey || seriesDefinitions.length === 0)
      return [];
    const source = processedData;
    const series = seriesDefinitions[0];

    if (config.useAggregation) {
      const grouped = new Map<string, any[]>();
      for (const row of source) {
        const key = row[xKey];
        if (key === undefined || key === null || key === "") continue;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(row);
      }
      return Array.from(grouped.entries())
        .map(([name, rows]) => ({
          name,
          value: aggregateRows(rows, series.field, series.agg ?? "sum"),
        }))
        .filter((entry) => entry.value !== 0);
    }

    return source
      .map((row) => ({
        name: row[xKey],
        value: Number(row[series.field]) || 0,
      }))
      .filter(
        (entry) =>
          entry.name !== undefined &&
          entry.name !== null &&
          entry.name !== "" &&
          entry.value !== 0,
      );
  }, [
    config.type,
    config.useAggregation,
    processedData,
    seriesDefinitions,
    xKey,
  ]);

  const barData = useMemo(() => {
    if (config.type !== "bar" || !xKey || seriesDefinitions.length === 0)
      return [];
    const source = processedData;

    if (config.useAggregation) {
      const grouped = new Map<string, any[]>();
      for (const row of source) {
        const key = row[xKey];
        if (key === undefined || key === null || key === "") continue;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(row);
      }
      return Array.from(grouped.entries()).map(([category, rows]) => {
        const entry: Record<string, any> = { category };
        seriesDefinitions.forEach((series) => {
          entry[series.key] = aggregateRows(
            rows,
            series.field,
            series.agg ?? "sum",
          );
        });
        return entry;
      });
    }

    return source
      .map((row) => {
        const category = row[xKey];
        const entry: Record<string, any> = { category };
        seriesDefinitions.forEach((series) => {
          entry[series.key] = Number(row[series.field]) || 0;
        });
        return entry;
      })
      .filter(
        (entry) =>
          entry.category !== undefined &&
          entry.category !== null &&
          entry.category !== "",
      );
  }, [
    config.type,
    config.useAggregation,
    processedData,
    seriesDefinitions,
    xKey,
  ]);

  const adjustedBarData = useMemo(() => {
    if (!categoryLegendEnabled || seriesDefinitions.length === 0)
      return barData;
    const seriesKey = seriesDefinitions[0].key;
    return barData.map((entry) =>
      hiddenCategories.includes(entry.category)
        ? { ...entry, [seriesKey]: 0 }
        : entry,
    );
  }, [barData, categoryLegendEnabled, hiddenCategories, seriesDefinitions]);

  const lineData = useMemo(() => {
    if (config.type !== "line" || !xKey || seriesDefinitions.length === 0)
      return [];
    const source = processedData;

    if (config.useAggregation) {
      const grouped = new Map<string, any[]>();
      for (const row of source) {
        const key = row[xKey];
        if (key === undefined || key === null || key === "") continue;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(row);
      }

      return Array.from(grouped.entries()).map(([name, rows]) => {
        const entry: Record<string, any> = { name };
        seriesDefinitions.forEach((series) => {
          entry[series.key] = aggregateRows(
            rows,
            series.field,
            series.agg ?? "sum",
          );
        });
        return entry;
      });
    }

    return source
      .map((row) => {
        const name = row[xKey];
        const entry: Record<string, any> = { name };
        seriesDefinitions.forEach((series) => {
          entry[series.key] = Number(row[series.field]) || 0;
        });
        return entry;
      })
      .filter(
        (entry) =>
          entry.name !== undefined && entry.name !== null && entry.name !== "",
      );
  }, [
    config.type,
    config.useAggregation,
    processedData,
    seriesDefinitions,
    xKey,
  ]);

  // ======================
  // Pie
  // ======================
  if (config.type === "pie") {
    const yField = seriesDefinitions[0];

    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const entry = payload[0];
                return (
                  <div className="bg-white border rounded p-2 shadow text-sm">
                    <div className="font-semibold">{entry.payload.name}</div>
                    <div style={{ color: entry.fill }}>
                      {`${buildSeriesKey(yField)} : ${entry.value}`}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          {config.legend && <Legend {...legendProps} />}
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            outerRadius={150}
            fill="#8884d8"
            label={
              config.pieShowPercent
                ? ({ percent }: PieLabelRenderProps) =>
                    typeof percent === "number"
                      ? `${(percent * 100).toFixed(1)}%`
                      : ""
                : true
            }
          >
            {pieData.map((entry, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  }

  // ======================
  // Bar
  // ======================
  if (config.type === "bar") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={adjustedBarData}>
          <XAxis
            dataKey="category"
            label={
              config.xLabel
                ? { value: config.xLabel, position: "insideBottom", offset: -4 }
                : undefined
            }
          />
          <YAxis
            label={
              config.yLabel
                ? { value: config.yLabel, angle: -90, position: "insideLeft" }
                : undefined
            }
          />
          <Tooltip />
          {config.legend &&
            (categoryLegendEnabled ? (
              <Legend
                {...legendProps}
                content={() => {
                  const seriesKey = seriesDefinitions[0]?.key;
                  if (!seriesKey) return null;
                  return (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {barData.map((entry, idx) => {
                        const category = entry.category;
                        const isHidden = hiddenCategories.includes(category);
                        const value = entry[seriesKey];
                        return (
                          <li
                            key={`legend-category-${category}-${idx}`}
                            style={{
                              color: isHidden
                                ? "#aaa"
                                : COLORS[idx % COLORS.length],
                              cursor: "pointer",
                              userSelect: "none",
                              marginBottom: 4,
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              fontSize: "0.85rem",
                            }}
                            onClick={() =>
                              setHiddenCategories((prev) =>
                                prev.includes(category)
                                  ? prev.filter((name) => name !== category)
                                  : [...prev, category],
                              )
                            }
                          >
                            <span
                              style={{
                                display: "inline-block",
                                width: 10,
                                height: 10,
                                backgroundColor: isHidden
                                  ? "#ccc"
                                  : COLORS[idx % COLORS.length],
                              }}
                            />
                            <span style={{ flex: 1 }}>{category || "—"}</span>
                            <span style={{ fontWeight: 500 }}>{value}</span>
                          </li>
                        );
                      })}
                    </ul>
                  );
                }}
              />
            ) : (
              <Legend {...legendProps} onClick={handleLegendClick} />
            ))}
          {seriesDefinitions.map((series, seriesIdx) => {
            const baseColor = COLORS[seriesIdx % COLORS.length];
            const useCategoryPalette = seriesDefinitions.length === 1;
            return (
              <Bar
                key={series.key}
                dataKey={series.key}
                name={series.key}
                fill={baseColor}
                hide={hiddenSeries.includes(series.key)}
              >
                {useCategoryPalette &&
                  adjustedBarData.map((entry, idx) => (
                    <Cell
                      key={`${series.key}-cell-${idx}`}
                      fill={
                        hiddenCategories.includes(entry.category)
                          ? "#ccc"
                          : COLORS[idx % COLORS.length]
                      }
                    />
                  ))}
              </Bar>
            );
          })}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // ======================
  // Line
  // ======================
  if (config.type === "line") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={lineData}>
          <XAxis
            dataKey="name"
            label={
              config.xLabel
                ? { value: config.xLabel, position: "insideBottom", offset: -4 }
                : undefined
            }
          />
          <YAxis
            label={
              config.yLabel
                ? { value: config.yLabel, angle: -90, position: "insideLeft" }
                : undefined
            }
          />
          <Tooltip />
          {config.legend && (
            <Legend {...legendProps} onClick={handleLegendClick} />
          )}
          {seriesDefinitions.map((series, idx) => (
            <Line
              key={series.key}
              type="monotone"
              dataKey={series.key}
              name={series.key}
              stroke={COLORS[idx % COLORS.length]}
              hide={hiddenSeries.includes(series.key)}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return <div>Неизвестный тип графика</div>;
}
