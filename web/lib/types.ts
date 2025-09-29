export interface PivotConfig {
  available: string[];
  rows: string[];
  cols: string[];
  values: { field: string; agg: "sum" | "count" | "avg" }[];
}
