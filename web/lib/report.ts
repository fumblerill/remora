import {
  ReportConfig,
  ReportMetric,
  ReportMetricConditionOperator,
} from "@/lib/types";

type DatasetRow = Record<string, unknown>;

export type ReportValues = Record<string, string | number>;

function coerceNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function coerceDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatValue(value: unknown, format?: ReportMetric["format"]): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  if (!format) {
    return String(value);
  }
  switch (format) {
    case "integer":
      return Number(value).toLocaleString("ru-RU", { maximumFractionDigits: 0 });
    case "number":
      return Number(value).toLocaleString("ru-RU", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    case "currency":
      return Number(value).toLocaleString("ru-RU", {
        style: "currency",
        currency: "RUB",
        maximumFractionDigits: 0,
      });
    case "date":
      return new Date(String(value)).toLocaleDateString("ru-RU");
    case "datetime":
      return new Date(String(value)).toLocaleString("ru-RU");
    default:
      return String(value);
  }
}

function matchesCondition(
  value: unknown,
  operator: ReportMetricConditionOperator,
  expected: string
): boolean {
  const target = value ?? "";
  const normalizedTarget = String(target).toLowerCase();
  const normalizedExpected = expected.toLowerCase();

  switch (operator) {
    case "eq":
      return normalizedTarget === normalizedExpected;
    case "neq":
      return normalizedTarget !== normalizedExpected;
    case "contains":
      return normalizedTarget.includes(normalizedExpected);
    case "startsWith":
      return normalizedTarget.startsWith(normalizedExpected);
    case "endsWith":
      return normalizedTarget.endsWith(normalizedExpected);
    default:
      return false;
  }
}

function applyCondition(rows: DatasetRow[], metric: ReportMetric): DatasetRow[] {
  const { conditionValue } = metric;
  if (!conditionValue || !conditionValue.trim()) {
    return rows;
  }

  const fieldName = (metric.conditionField || metric.field || "").trim();
  if (!fieldName) return rows;

  const operator = metric.conditionOperator ?? "eq";
  return rows.filter((row) => matchesCondition(row[fieldName], operator, conditionValue));
}

function computeMetric(metric: ReportMetric, rows: DatasetRow[]): string | number {
  const { field, aggregation, format } = metric;

  if (!field) {
    if (aggregation === "count") {
      return formatValue(rows.length, format);
    }
    return "—";
  }

  const conditionedRows = applyCondition(rows, metric);
  const values = conditionedRows
    .map((row) => row[field])
    .filter((value) => value !== undefined && value !== null);

  switch (aggregation) {
    case "count": {
      return formatValue(conditionedRows.length, format);
    }
    case "sum": {
      const nums = values.map(coerceNumber).filter((n): n is number => n !== null);
      const total = nums.reduce((acc, num) => acc + num, 0);
      return formatValue(total, format);
    }
    case "avg": {
      const nums = values.map(coerceNumber).filter((n): n is number => n !== null);
      if (!nums.length) return "—";
      const avg = nums.reduce((acc, num) => acc + num, 0) / nums.length;
      return formatValue(avg, format);
    }
    case "min":
    case "max": {
      const nums = values.map(coerceNumber).filter((n): n is number => n !== null);
      if (!nums.length) return "—";
      const result = aggregation === "min" ? Math.min(...nums) : Math.max(...nums);
      return formatValue(result, format);
    }
    case "minDate":
    case "maxDate": {
      const dates = values.map(coerceDate).filter((d): d is Date => d !== null);
      if (!dates.length) return "—";
      const comparator = aggregation === "minDate" ? Math.min : Math.max;
      const timestamp = comparator(...dates.map((date) => date.getTime()));
      return formatValue(new Date(timestamp), format ?? "date");
    }
    default:
      return "—";
  }
}

export function evaluateReport(config: ReportConfig | null, data: DatasetRow[]): {
  values: ReportValues;
  rendered: string;
} {
  if (!config) {
    return { values: {}, rendered: "" };
  }

  const values: ReportValues = {};

  for (const metric of config.metrics) {
    const value = computeMetric(metric, data);
    values[metric.id] = value;
  }

  const rendered = (config.template || "").replace(/\{\{\s*([\w-]+)\s*\}\}/g, (_match, token) => {
    const value = values[token];
    return value !== undefined ? String(value) : "—";
  });

  return { values, rendered };
}

export function extractColumns(rows: DatasetRow[]): string[] {
  const set = new Set<string>();
  rows.forEach((row) => {
    if (!row || typeof row !== "object") return;
    Object.keys(row).forEach((key) => set.add(key));
  });
  return Array.from(set);
}
