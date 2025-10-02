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
import type { ChartConfig } from "./ChartEditor";
import type { PieLabelRenderProps } from "recharts";
import { useState } from "react";

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

export default function ChartView({ data, config, height = 400 }: ChartViewProps) {
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([]);

  if (!data || data.length === 0) return <div>Нет данных</div>;
  if (!config.xAxis || config.yAxis.length === 0) return <div>Настрой график</div>;

  const aggregate = (rows: any[], field: string, agg: "sum" | "count" | "avg") => {
    const vals = rows.map((r) => Number(r[field]) || 0);
    if (agg === "sum") return vals.reduce((a, b) => a + b, 0);
    if (agg === "count") return vals.length;
    if (agg === "avg") return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return 0;
  };

  const legendProps =
    config.legendPosition === "right"
      ? { layout: "vertical" as const, verticalAlign: "middle" as const, align: "right" as const }
      : config.legendPosition === "left"
      ? { layout: "vertical" as const, verticalAlign: "middle" as const, align: "left" as const }
      : config.legendPosition === "top"
      ? { layout: "horizontal" as const, verticalAlign: "top" as const, align: "center" as const }
      : { layout: "horizontal" as const, verticalAlign: "bottom" as const, align: "center" as const };

  const handleLegendClick = (o: any) => {
    const key = o.value as string;
    setHiddenKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // ======================
  // Pie (как раньше)
  // ======================
  if (config.type === "pie") {
    const yField = config.yAxis[0];
    let chartData: any[] = [];

    if (config.useAggregation) {
      const grouped: Record<string, any[]> = {};
      for (const row of data) {
        const key = row[config.xAxis as string];
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(row);
      }
      chartData = Object.entries(grouped).map(([key, rows]) => ({
        name: key,
        value: aggregate(rows, yField.field, yField.agg ?? "sum"),
      }));
    } else {
      chartData = data.map((row) => ({
        name: row[config.xAxis as string],
        value: Number(row[yField.field]) || 0,
      }));
    }

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
                      {`${yField.field}${yField.agg ? ` (${yField.agg})` : ""} : ${entry.value}`}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          {config.legend && <Legend {...legendProps} />}
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            outerRadius={150}
            fill="#8884d8"
            label={
              config.pieShowPercent
                ? ({ percent }: PieLabelRenderProps) =>
                    typeof percent === "number" ? `${(percent * 100).toFixed(1)}%` : ""
                : true
            }
          >
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  }

  // ======================
  // Bar → pivot-логика
  // ======================
  if (config.type === "bar") {
    // агрегируем: каждая строка = категория
    let chartData: any[] = [];

    if (config.useAggregation) {
      const grouped: Record<string, any[]> = {};
      for (const row of data) {
        const key = row[config.xAxis as string];
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(row);
      }
      chartData = Object.entries(grouped).map(([key, rows]) => ({
        category: key,
        value: aggregate(rows, config.yAxis[0].field, config.yAxis[0].agg ?? "sum"),
      }));
    } else {
      chartData = data.map((row) => ({
        category: row[config.xAxis as string],
        value: Number(row[config.yAxis[0].field]) || 0,
      }));
    }

    const categories = chartData.map((d) => d.category);

    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData}>
          <XAxis dataKey="category" />
          <YAxis />
          <Tooltip />
          {config.legend && (
            <Legend
              {...legendProps}
              content={() => (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {categories.map((cat, idx) => {
                    const isHidden = hiddenKeys.includes(cat);
                    return (
                      <li
                        key={cat}
                        style={{
                          color: isHidden ? "#aaa" : COLORS[idx % COLORS.length],
                          cursor: "pointer",
                          userSelect: "none",
                        }}
                        onClick={() =>
                          setHiddenKeys((prev) =>
                            prev.includes(cat)
                              ? prev.filter((k) => k !== cat)
                              : [...prev, cat]
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
                            marginRight: 6,
                          }}
                        />
                        {cat}
                      </li>
                    );
                  })}
                </ul>
              )}
            />
          )}
          <Bar
            dataKey="value"
            name="Значение"
            shape={(props: any) => {
              const { x, y, width, height, payload } = props;
              const idx = categories.indexOf(payload.category);
              if (hiddenKeys.includes(payload.category)) return <></>;
              return (
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={COLORS[idx % COLORS.length]}
                />
              );
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // ======================
  // Line → классическая логика
  // ======================
  if (config.type === "line") {
    let chartData: any[] = [];

    if (config.useAggregation) {
      const grouped: Record<string, any[]> = {};
      for (const row of data) {
        const key = row[config.xAxis as string];
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(row);
      }

      chartData = Object.entries(grouped).map(([key, rows]) => {
        const obj: Record<string, any> = { name: key };
        for (const y of config.yAxis) {
          obj[y.field] = aggregate(rows, y.field, y.agg ?? "sum");
        }
        return obj;
      });
    } else {
      chartData = data.map((row) => {
        const obj: Record<string, any> = { name: row[config.xAxis as string] };
        for (const y of config.yAxis) {
          obj[y.field] = Number(row[y.field]) || 0;
        }
        return obj;
      });
    }

    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          {config.legend && <Legend {...legendProps} onClick={handleLegendClick} />}
          {config.yAxis.map((y, idx) => (
            <Line
              key={y.field}
              type="monotone"
              dataKey={y.field}
              name={`${y.field}${y.agg ? ` (${y.agg})` : ""}`}
              stroke={COLORS[idx % COLORS.length]}
              hide={hiddenKeys.includes(y.field)}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return <div>Неизвестный тип графика</div>;
}
