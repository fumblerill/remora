export type PivotAggregationType = "sum" | "count" | "avg" | "min" | "max";

export type PivotFilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "not_contains"
  | "in"
  | "starts_with"
  | "ends_with";

export interface PivotFilter {
  column: string;
  operator: PivotFilterOperator;
  value: string | number | Array<string | number>;
}

export interface PivotValueConfig {
  field: string;
  agg: PivotAggregationType;
  alias?: string;
}

export interface PivotSort {
  column: string;
  direction: "asc" | "desc";
}

export interface PivotConfig {
  rows: string[];
  columns: string[];
  values: PivotValueConfig[];
  filters: PivotFilter[];
  postFilters: PivotFilter[];
  sort: PivotSort[];
  limit?: number | null;
}

export type ReportMetricAggregation =
  | "count"
  | "sum"
  | "avg"
  | "min"
  | "max"
  | "minDate"
  | "maxDate"
  | "percent";

export type ReportMetricFormat =
  | "number"
  | "integer"
  | "currency"
  | "date"
  | "datetime"
  | "percent";

export type ReportMetricConditionOperator = "eq" | "neq" | "contains" | "startsWith" | "endsWith";

export interface ReportMetric {
  id: string;
  label: string;
  field: string;
  aggregation: ReportMetricAggregation;
  format?: ReportMetricFormat;
  description?: string;
  conditionField?: string;
  conditionOperator?: ReportMetricConditionOperator;
  conditionValue?: string;
}

export interface ReportConfig {
  template: string;
  metrics: ReportMetric[];
  title?: string;
}
