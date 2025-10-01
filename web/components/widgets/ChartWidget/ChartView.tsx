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

interface ChartViewProps {
  data: any[];
  config: ChartConfig;
  height?: number;
}

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f50", "#00c49f"];

export default function ChartView({ data, config, height = 400 }: ChartViewProps) {
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

  let chartData: any[] = [];

  // ======================
  // Pie
  // ======================
  if (config.type === "pie") {
    const yField = config.yAxis[0];

    if (config.useAggregation) {
      // группируем по X
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
      // без агрегации
      chartData = data.map((row) => ({
        name: row[config.xAxis as string],
        value: Number(row[yField.field]) || 0,
      }));
    }

    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Tooltip />
          {config.legend && <Legend {...legendProps} />}
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            outerRadius={150}
            fill="#8884d8"
            label
          >
            {chartData.map((_, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  }

  // ======================
  // Bar / Line
  // ======================
  if (config.useAggregation) {
    const grouped: Record<string, any[]> = {};
    for (const row of data) {
      const key = row[config.xAxis as string];
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    }

    chartData = Object.entries(grouped).map(([key, rows]) => {
      const obj: Record<string, any> = { [config.xAxis as string]: key };
      for (const y of config.yAxis) {
        obj[`${y.field} (${y.agg})`] = aggregate(rows, y.field, y.agg ?? "sum");
      }
      return obj;
    });
  } else {
    chartData = data.map((row) => {
      const obj: Record<string, any> = { [config.xAxis as string]: row[config.xAxis as string] };
      for (const y of config.yAxis) {
        obj[y.field] = Number(row[y.field]) || 0;
      }
      return obj;
    });
  }

  if (config.type === "bar") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData}>
          <XAxis dataKey={config.xAxis} label={{ value: config.xLabel, position: "insideBottom", offset: -5 }} />
          <YAxis label={{ value: config.yLabel, angle: -90, position: "insideLeft" }} />
          <Tooltip />
          {config.legend && <Legend {...legendProps} />}
          {config.yAxis.map((y, idx) => (
            <Bar
              key={y.field}
              dataKey={config.useAggregation ? `${y.field} (${y.agg})` : y.field}
              fill={COLORS[idx % COLORS.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (config.type === "line") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData}>
          <XAxis dataKey={config.xAxis} label={{ value: config.xLabel, position: "insideBottom", offset: -5 }} />
          <YAxis label={{ value: config.yLabel, angle: -90, position: "insideLeft" }} />
          <Tooltip />
          {config.legend && <Legend {...legendProps} />}
          {config.yAxis.map((y, idx) => (
            <Line
              key={y.field}
              type="monotone"
              dataKey={config.useAggregation ? `${y.field} (${y.agg})` : y.field}
              stroke={COLORS[idx % COLORS.length]}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return <div>Неизвестный тип графика</div>;
}
