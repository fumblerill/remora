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
  | "in";

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
