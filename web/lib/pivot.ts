"use client";

import {
  PivotConfig,
  PivotFilter,
  PivotSort,
  PivotValueConfig,
  PivotAggregationType,
} from "@/lib/types";

type AnyRecord = Record<string, any>;

export interface PivotValueColumnInfo {
  key: string;
  header: string;
  source: PivotValueConfig;
  columnLabel?: string;
}

export interface PivotApplyResult {
  data: AnyRecord[];
  dimensionFields: string[];
  valueColumns: PivotValueColumnInfo[];
  isPivot: boolean;
}

const defaultAggregation: PivotAggregationType = "count";

const DEFAULT_CONFIG: PivotConfig = {
  rows: [],
  columns: [],
  values: [],
  filters: [],
  postFilters: [],
  sort: [],
  limit: null,
};

function sanitizeFieldList(fields: unknown, available: string[]): string[] {
  if (!Array.isArray(fields)) return [];
  return fields
    .map((f) => (typeof f === "string" ? f : ""))
    .filter((f) => f && (available.length === 0 || available.includes(f)));
}

function sanitizeValues(
  values: unknown,
  available: string[],
): PivotValueConfig[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => {
      if (typeof value === "string") {
        return { field: value, agg: defaultAggregation };
      }
      if (value && typeof value === "object") {
        const field =
          typeof (value as AnyRecord).field === "string"
            ? (value as AnyRecord).field
            : "";
        if (!field) return null;
        const agg = (value as AnyRecord).agg as
          | PivotAggregationType
          | undefined;
        const alias =
          typeof (value as AnyRecord).alias === "string"
            ? (value as AnyRecord).alias
            : undefined;
        return {
          field,
          agg:
            agg && ["sum", "count", "avg", "min", "max"].includes(agg)
              ? agg
              : defaultAggregation,
          alias,
        };
      }
      return null;
    })
    .filter((v): v is PivotValueConfig =>
      Boolean(v && (available.length === 0 || available.includes(v.field))),
    );
}

function sanitizeFilters(filters: unknown, available: string[]): PivotFilter[] {
  if (!Array.isArray(filters)) return [];
  return filters
    .map((filter): PivotFilter | null => {
      if (!filter || typeof filter !== "object") return null;
      const column = (filter as AnyRecord).column;
      const operator = (filter as AnyRecord).operator;
      if (typeof column !== "string" || typeof operator !== "string")
        return null;
      const allowedOps = [
        "eq",
        "neq",
        "gt",
        "gte",
        "lt",
        "lte",
        "contains",
        "not_contains",
        "in",
        "starts_with",
        "ends_with",
      ];
      if (!allowedOps.includes(operator)) return null;
      const op = operator as PivotFilterOperator;
      const value = (filter as AnyRecord).value;
      if (Array.isArray(value)) {
        return {
          column,
          operator: op,
          value: value.filter(
            (item) => typeof item === "string" || typeof item === "number",
          ) as Array<string | number>,
        };
      }
      if (typeof value === "string" || typeof value === "number") {
        return { column, operator: op, value };
      }
      return { column, operator: op, value: "" };
    })
    .filter((f): f is PivotFilter => f !== null);
}

function sanitizeSort(sort: unknown): PivotSort[] {
  if (!Array.isArray(sort)) return [];
  return sort
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const column = (item as AnyRecord).column;
      const direction = (item as AnyRecord).direction;
      if (typeof column !== "string") return null;
      if (direction !== "asc" && direction !== "desc") return null;
      return { column, direction };
    })
    .filter((s): s is PivotSort => Boolean(s));
}

export function normalizePivotConfig(
  input: Partial<PivotConfig> | AnyRecord | undefined | null,
  sampleData: AnyRecord[] = [],
  options: { ensureValues?: boolean } = {},
): PivotConfig {
  const ensureValues = options.ensureValues ?? true;
  const fieldSet = new Set<string>();
  sampleData.forEach((row) => {
    if (!row || typeof row !== "object") return;
    Object.keys(row).forEach((key) => {
      if (key) fieldSet.add(key);
    });
  });

  const availableFields = Array.from(fieldSet);
  if (!input) {
    const defaultValues =
      ensureValues && availableFields[0]
        ? [{ field: availableFields[0], agg: defaultAggregation }]
        : [];
    return {
      ...DEFAULT_CONFIG,
      values: defaultValues,
    };
  }

  // Legacy support (old drag/drop config)
  if ("available" in input || "cols" in input) {
    const legacy = input as AnyRecord;
    const rows = sanitizeFieldList(legacy.rows, availableFields);
    const columns = sanitizeFieldList(
      legacy.cols ?? legacy.columns,
      availableFields,
    );
    const values = sanitizeValues(legacy.values, availableFields);

    return {
      rows,
      columns,
      values,
      filters: [],
      postFilters: [],
      sort: [],
      limit: null,
    };
  }

  const config: PivotConfig = {
    rows: sanitizeFieldList((input as AnyRecord).rows, availableFields),
    columns: sanitizeFieldList((input as AnyRecord).columns, availableFields),
    values: sanitizeValues((input as AnyRecord).values, availableFields),
    filters: sanitizeFilters((input as AnyRecord).filters, availableFields),
    postFilters: sanitizeFilters((input as AnyRecord).postFilters, []),
    sort: sanitizeSort((input as AnyRecord).sort),
    limit:
      typeof (input as AnyRecord).limit === "number" &&
      (input as AnyRecord).limit > 0
        ? (input as AnyRecord).limit
        : null,
  };

  if (!config.values.length && availableFields[0] && ensureValues) {
    config.values = [{ field: availableFields[0], agg: defaultAggregation }];
  }

  return config;
}

function evaluateFilter(value: any, filter: PivotFilter): boolean {
  const { operator } = filter;
  const filterValue = filter.value;

  if (
    filterValue === "" ||
    filterValue === null ||
    (Array.isArray(filterValue) && filterValue.length === 0)
  ) {
    return true;
  }

  if (operator === "in") {
    const list = Array.isArray(filterValue)
      ? filterValue
      : String(filterValue)
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
    const normalized = String(value ?? "").toLowerCase();
    return list.some((item) => String(item).toLowerCase() === normalized);
  }

  if (operator === "contains" || operator === "not_contains") {
    const haystack = String(value ?? "").toLowerCase();
    const needle = String(filterValue ?? "").toLowerCase();
    const result = haystack.includes(needle);
    return operator === "contains" ? result : !result;
  }

  if (operator === "starts_with" || operator === "ends_with") {
    const haystack = String(value ?? "").toLowerCase();
    const needle = String(filterValue ?? "").toLowerCase();
    if (!needle.length) return true;
    const result =
      operator === "starts_with"
        ? haystack.startsWith(needle)
        : haystack.endsWith(needle);
    return result;
  }

  const numericOps = ["gt", "gte", "lt", "lte"];
  if (numericOps.includes(operator)) {
    const numValue = typeof value === "number" ? value : Number(value);
    const numFilter = Array.isArray(filterValue)
      ? Number(filterValue[0])
      : Number(filterValue);
    if (filterValue === "" || filterValue === null) return true;
    if (Number.isNaN(numValue) || Number.isNaN(numFilter)) return false;
    if (operator === "gt") return numValue > numFilter;
    if (operator === "gte") return numValue >= numFilter;
    if (operator === "lt") return numValue < numFilter;
    if (operator === "lte") return numValue <= numFilter;
  }

  const left = value ?? "";
  const right = Array.isArray(filterValue) ? filterValue[0] : filterValue;
  if (operator === "eq") return String(left) === String(right);
  if (operator === "neq") return String(left) !== String(right);

  return true;
}

function applyFilters(data: AnyRecord[], filters: PivotFilter[]): AnyRecord[] {
  if (!filters.length) return data;
  return data.filter((row) =>
    filters.every((filter) => evaluateFilter(row[filter.column], filter)),
  );
}

function aggregateRows(
  rows: AnyRecord[],
  field: string,
  agg: PivotAggregationType,
): number {
  if (agg === "count") {
    if (field === "*") return rows.length;
    return rows.filter(
      (row) =>
        row[field] !== undefined && row[field] !== null && row[field] !== "",
    ).length;
  }

  const numeric = rows
    .map((row) => Number(row[field]))
    .filter((value) => !Number.isNaN(value));

  if (!numeric.length) return 0;

  switch (agg) {
    case "sum":
      return numeric.reduce((acc, val) => acc + val, 0);
    case "avg":
      return numeric.reduce((acc, val) => acc + val, 0) / numeric.length;
    case "min":
      return Math.min(...numeric);
    case "max":
      return Math.max(...numeric);
    default:
      return 0;
  }
}

function formatColumnLabel(columns: string[], values: any[]): string {
  if (!columns.length) return "";
  return columns.map((col, idx) => `${col}: ${values[idx] ?? "—"}`).join(" • ");
}

function makeColumnKey(columns: string[], values: any[]): string {
  if (!columns.length) return "__all__";
  return columns.map((col, idx) => `${col}=${values[idx] ?? "—"}`).join("||");
}

function defaultAlias(value: PivotValueConfig): string {
  return `${value.agg.toUpperCase()}(${value.field})`;
}

function sortData(rows: AnyRecord[], sort: PivotSort[]) {
  if (!sort.length) return rows;
  return [...rows].sort((a, b) => {
    for (const rule of sort) {
      const left = getComparableValue(a, rule.column);
      const right = getComparableValue(b, rule.column);
      if (left === right) continue;
      const direction = rule.direction === "asc" ? 1 : -1;

      const leftNum = Number(left);
      const rightNum = Number(right);
      if (!Number.isNaN(leftNum) && !Number.isNaN(rightNum)) {
        return leftNum > rightNum ? direction : -direction;
      }

      const leftStr = String(left ?? "");
      const rightStr = String(right ?? "");
      if (leftStr > rightStr) return direction;
      if (leftStr < rightStr) return -direction;
    }
    return 0;
  });
}

function getComparableValue(row: AnyRecord, column: string): any {
  if (column in row) return row[column];
  const totals = (row as AnyRecord).__pivotTotals as
    | Record<string, any>
    | undefined;
  if (totals && column in totals) return totals[column];
  return undefined;
}

export function applyPivot(
  data: AnyRecord[],
  config: PivotConfig,
): PivotApplyResult {
  const filteredData = applyFilters(data, config.filters);
  const isPivot =
    config.rows.length > 0 ||
    config.columns.length > 0 ||
    config.values.length > 0;

  if (!isPivot) {
    const dimensions = filteredData.length ? Object.keys(filteredData[0]) : [];
    return {
      data: filteredData,
      dimensionFields: dimensions,
      valueColumns: [],
      isPivot: false,
    };
  }

  const columnMap = new Map<
    string,
    { values: any[]; label: string; key: string }
  >();

  if (config.columns.length) {
    for (const row of filteredData) {
      const values = config.columns.map((col) => row[col]);
      const key = makeColumnKey(config.columns, values);
      if (!columnMap.has(key)) {
        columnMap.set(key, {
          values,
          key,
          label: formatColumnLabel(config.columns, values),
        });
      }
    }
  } else {
    columnMap.set("__all__", { values: [], label: "", key: "__all__" });
  }

  const valueColumnsMap = new Map<string, PivotValueColumnInfo>();

  const rowGroups = new Map<
    string,
    { rows: AnyRecord[]; dimensionValues: any[] }
  >();

  for (const row of filteredData) {
    const dimensionValues = config.rows.map((field) => row[field]);
    const key = JSON.stringify(dimensionValues);
    if (!rowGroups.has(key)) {
      rowGroups.set(key, { rows: [], dimensionValues });
    }
    rowGroups.get(key)!.rows.push(row);
  }

  const resultRows: AnyRecord[] = [];

  for (const [, group] of rowGroups) {
    const rowObj: AnyRecord = {};
    config.rows.forEach((field, idx) => {
      rowObj[field] = group.dimensionValues[idx];
    });

    const totals: Record<string, number> = {};

    for (const valueConfig of config.values) {
      const alias = valueConfig.alias?.trim() || defaultAlias(valueConfig);
      totals[alias] = aggregateRows(
        group.rows,
        valueConfig.field,
        valueConfig.agg,
      );
    }

    for (const columnEntry of columnMap.values()) {
      const subset =
        columnEntry.key === "__all__"
          ? group.rows
          : group.rows.filter((row) =>
              config.columns.every(
                (col, idx) => row[col] === columnEntry.values[idx],
              ),
            );

      for (const valueConfig of config.values) {
        const alias = valueConfig.alias?.trim() || defaultAlias(valueConfig);
        const result = aggregateRows(
          subset,
          valueConfig.field,
          valueConfig.agg,
        );
        const key =
          columnEntry.key === "__all__"
            ? alias
            : `${alias}::${columnEntry.key}`;

        rowObj[key] = result;

        if (!valueColumnsMap.has(key)) {
          valueColumnsMap.set(key, {
            key,
            header:
              columnEntry.key === "__all__"
                ? alias
                : `${alias} • ${columnEntry.label}`,
            source: valueConfig,
            columnLabel: columnEntry.label,
          });
        }
      }
    }

    Object.defineProperty(rowObj, "__pivotTotals", {
      value: totals,
      enumerable: false,
      configurable: false,
      writable: false,
    });

    const passesPostFilters = config.postFilters.every((filter) => {
      const totals = rowObj.__pivotTotals as Record<string, number>;
      const value =
        (totals && totals[filter.column]) ?? rowObj[filter.column] ?? null;
      return evaluateFilter(value, filter);
    });

    if (!passesPostFilters) continue;

    resultRows.push(rowObj);
  }

  const sorted = sortData(resultRows, config.sort);
  const limited =
    config.limit && config.limit > 0 ? sorted.slice(0, config.limit) : sorted;

  return {
    data: limited,
    dimensionFields: config.rows,
    valueColumns: Array.from(valueColumnsMap.values()),
    isPivot: true,
  };
}
