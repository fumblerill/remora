"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PivotConfig,
  PivotFilter,
  PivotValueConfig,
  PivotAggregationType,
  PivotFilterOperator,
  PivotSort,
} from "@/lib/types";
import { normalizePivotConfig } from "@/lib/pivot";

interface TableEditorProps {
  data: any[];
  config?: PivotConfig;
  onConfigChange?: (config: PivotConfig) => void;
}

const aggregationOptions: { value: PivotAggregationType; label: string }[] = [
  { value: "count", label: "COUNT" },
  { value: "sum", label: "SUM" },
  { value: "avg", label: "AVG" },
  { value: "min", label: "MIN" },
  { value: "max", label: "MAX" },
];

const filterOperators: { value: PivotFilterOperator; label: string }[] = [
  { value: "eq", label: "Равно" },
  { value: "neq", label: "Не равно" },
  { value: "gt", label: "Больше" },
  { value: "gte", label: "Больше или равно" },
  { value: "lt", label: "Меньше" },
  { value: "lte", label: "Меньше или равно" },
  { value: "contains", label: "Содержит" },
  { value: "not_contains", label: "Не содержит" },
  { value: "in", label: "Входит в список" },
];

function defaultAlias(value: PivotValueConfig) {
  return value.alias?.trim() || `${value.agg.toUpperCase()}(${value.field})`;
}

function isNumericOperator(op: PivotFilterOperator) {
  return op === "gt" || op === "gte" || op === "lt" || op === "lte";
}

function cloneConfig(config: PivotConfig): PivotConfig {
  return {
    rows: [...config.rows],
    columns: [...config.columns],
    values: config.values.map((v) => ({ ...v })),
    filters: config.filters.map((f) => ({
      column: f.column,
      operator: f.operator,
      value: Array.isArray(f.value) ? [...f.value] : f.value,
    })),
    postFilters: config.postFilters.map((f) => ({
      column: f.column,
      operator: f.operator,
      value: Array.isArray(f.value) ? [...f.value] : f.value,
    })),
    sort: config.sort.map((s) => ({ ...s })),
    limit: config.limit ?? null,
  };
}

export default function TableEditor({ data, config, onConfigChange }: TableEditorProps) {
  if (!data || data.length === 0) return <div>Нет данных для конфигурации</div>;

  const fields = useMemo(() => {
    const set = new Set<string>();
    data.forEach((row) => {
      if (!row || typeof row !== "object") return;
      Object.keys(row).forEach((key) => {
        if (key) set.add(key);
      });
    });
    return Array.from(set);
  }, [data]);

  const [pivotConfig, setPivotConfig] = useState<PivotConfig>(() =>
    normalizePivotConfig(config, data)
  );

  const lastExternalConfig = useRef<string | null>(JSON.stringify(pivotConfig));
  const lastEmittedConfig = useRef<string>(JSON.stringify(pivotConfig));

  useEffect(() => {
    const normalized = normalizePivotConfig(config, data);
    const serialized = JSON.stringify(normalized);
    if (serialized === lastExternalConfig.current) {
      return;
    }

    lastExternalConfig.current = serialized;
    setPivotConfig((prev) => {
      if (JSON.stringify(prev) === serialized) return prev;
      return normalized;
    });
  }, [config, data]);

  useEffect(() => {
    if (!onConfigChange) return;
    const serialized = JSON.stringify(pivotConfig);

    if (lastExternalConfig.current === serialized) {
      lastExternalConfig.current = null;
      lastEmittedConfig.current = serialized;
      return;
    }

    if (serialized === lastEmittedConfig.current) return;
    lastEmittedConfig.current = serialized;
    onConfigChange(pivotConfig);
  }, [pivotConfig, onConfigChange]);

  const updateConfig = (updater: (prev: PivotConfig) => PivotConfig) => {
    setPivotConfig((prev) => {
      const draft = updater(cloneConfig(prev));

      const aggregateAliases = new Set(draft.values.map((value) => defaultAlias(value)));
      const fieldSet = new Set(fields);

      draft.postFilters = draft.postFilters.filter((filter) =>
        aggregateAliases.has(filter.column)
      );
      draft.sort = draft.sort.filter(
        (rule) =>
          draft.rows.includes(rule.column) ||
          aggregateAliases.has(rule.column) ||
          fieldSet.has(rule.column)
      );

      return draft;
    });
  };

  const availableRowFields = fields.filter((f) => !pivotConfig.rows.includes(f));
  const availableColumnFields = fields.filter((f) => !pivotConfig.columns.includes(f));

  const availableFilters = fields;
  const availableAggregates = pivotConfig.values.map((value) => ({
    key: defaultAlias(value),
    label: defaultAlias(value),
  }));

  const handleAddRowField = () => {
    if (!availableRowFields.length) return;
    const nextField = availableRowFields[0];
    updateConfig((prev) => ({
      ...prev,
      rows: [...prev.rows, nextField],
    }));
  };

  const handleAddColumnField = () => {
    if (!availableColumnFields.length) return;
    const nextField = availableColumnFields[0];
    updateConfig((prev) => ({
      ...prev,
      columns: [...prev.columns, nextField],
    }));
  };

  const updateFieldList = (
    type: "rows" | "columns",
    index: number,
    newValue: string
  ) => {
    updateConfig((prev) => {
      const nextList = [...prev[type]];
      nextList[index] = newValue;
      // удаляем дубли
      const unique = nextList.filter(
        (field, idx) => field && nextList.indexOf(field) === idx
      );
      return { ...prev, [type]: unique };
    });
  };

  const removeField = (type: "rows" | "columns", index: number) => {
    updateConfig((prev) => {
      const nextList = [...prev[type]];
      nextList.splice(index, 1);
      return { ...prev, [type]: nextList };
    });
  };

  const moveField = (type: "rows" | "columns", index: number, delta: number) => {
    updateConfig((prev) => {
      const nextList = [...prev[type]];
      const target = index + delta;
      if (target < 0 || target >= nextList.length) return prev;
      const [item] = nextList.splice(index, 1);
      nextList.splice(target, 0, item);
      return { ...prev, [type]: nextList };
    });
  };

  const addAggregation = () => {
    if (!fields.length) return;
    updateConfig((prev) => ({
      ...prev,
      values: [
        ...prev.values,
        { field: fields[0], agg: "count", alias: "" } as PivotValueConfig,
      ],
    }));
  };

  const updateAggregation = (index: number, patch: Partial<PivotValueConfig>) => {
    updateConfig((prev) => {
      const nextValues = [...prev.values];
      const current = nextValues[index];
      if (!current) return prev;

      const beforeAlias = defaultAlias(current);
      nextValues[index] = { ...current, ...patch };
      const afterAlias = defaultAlias(nextValues[index]);

      const nextPostFilters = prev.postFilters.map((filter) =>
        filter.column === beforeAlias ? { ...filter, column: afterAlias } : filter
      );

      const nextSort = prev.sort.map((rule) =>
        rule.column === beforeAlias ? { ...rule, column: afterAlias } : rule
      );

      return {
        ...prev,
        values: nextValues,
        postFilters: nextPostFilters,
        sort: nextSort,
      };
    });
  };

  const removeAggregation = (index: number) => {
    updateConfig((prev) => {
      const target = prev.values[index];
      if (!target) return prev;
      const alias = defaultAlias(target);
      const nextValues = [...prev.values];
      nextValues.splice(index, 1);

      const nextPostFilters = prev.postFilters.filter(
        (filter) => filter.column !== alias
      );

      const nextSort = prev.sort.filter((rule) => rule.column !== alias);

      return {
        ...prev,
        values: nextValues,
        postFilters: nextPostFilters,
        sort: nextSort,
      };
    });
  };

  const addFilter = (type: "filters" | "postFilters") => {
    const baseColumn =
      type === "filters" ? fields[0] ?? "" : availableAggregates[0]?.key ?? "";
    if (!baseColumn) return;

    updateConfig((prev) => ({
      ...prev,
      [type]: [
        ...prev[type],
        {
          column: baseColumn,
          operator: "eq",
          value: "",
        },
      ],
    }));
  };

  const updateFilter = (
    type: "filters" | "postFilters",
    index: number,
    patch: Partial<PivotFilter>
  ) => {
    updateConfig((prev) => {
      const next = [...prev[type]];
      const current = next[index];
      if (!current) return prev;

      let value = patch.value ?? current.value;
      const operator = (patch.operator ?? current.operator) as PivotFilterOperator;

      if (operator === "in") {
        if (typeof value === "string") {
          value = value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
        } else if (!Array.isArray(value)) {
          value = [];
        }
      } else if (isNumericOperator(operator)) {
        if (Array.isArray(value)) {
          value =
            value.length > 0 && !Number.isNaN(Number(value[0]))
              ? Number(value[0])
              : "";
        } else if (typeof value === "string") {
          value = value.trim() === "" ? "" : Number(value);
        }
        if (typeof value === "number" && Number.isNaN(value)) {
          value = "";
        }
      }

      next[index] = {
        ...current,
        ...patch,
        value,
        operator,
      };
      return { ...prev, [type]: next };
    });
  };

  const removeFilter = (type: "filters" | "postFilters", index: number) => {
    updateConfig((prev) => {
      const next = [...prev[type]];
      next.splice(index, 1);
      return { ...prev, [type]: next };
    });
  };

  const addSortRule = () => {
    updateConfig((prev) => {
      const firstOption =
        prev.rows[0] ??
        availableAggregates[0]?.key ??
        fields[0] ??
        "";
      if (!firstOption) return prev;
      return {
        ...prev,
        sort: [...prev.sort, { column: firstOption, direction: "desc" }],
      };
    });
  };

  const updateSortRule = (index: number, patch: Partial<PivotSort>) => {
    updateConfig((prev) => {
      const next = [...prev.sort];
      if (!next[index]) return prev;
      next[index] = { ...next[index], ...patch };
      return { ...prev, sort: next };
    });
  };

  const removeSortRule = (index: number) => {
    updateConfig((prev) => {
      const next = [...prev.sort];
      next.splice(index, 1);
      return { ...prev, sort: next };
    });
  };

  const updateLimit = (value: string) => {
    const numeric = Number(value);
    updateConfig((prev) => ({
      ...prev,
      limit: Number.isNaN(numeric) || numeric <= 0 ? null : numeric,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Группировки */}
      <section className="bg-white rounded border shadow-sm p-4">
        <h3 className="text-base font-semibold text-brand mb-4">
          Группировки
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">
                Поля строк
              </span>
              <button
                type="button"
                onClick={handleAddRowField}
                className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
                disabled={!availableRowFields.length}
              >
                Добавить
              </button>
            </div>
            {pivotConfig.rows.length === 0 && (
              <p className="text-xs text-gray-400">
                Выберите одно или несколько полей для строк.
              </p>
            )}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {pivotConfig.rows.map((field, index) => (
                <div
                  key={`${field}-${index}`}
                  className="flex flex-wrap items-center gap-2 border rounded px-2 py-2 bg-gray-50"
                >
                  <select
                    value={field}
                    onChange={(e) => updateFieldList("rows", index, e.target.value)}
                    className="flex-1 border rounded px-2 py-1 text-sm min-w-[160px]"
                  >
                    {[field, ...availableRowFields]
                      .filter((v, i, arr) => arr.indexOf(v) === i)
                      .map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                  </select>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveField("rows", index, -1)}
                      className="text-xs px-2 py-1 border rounded"
                      disabled={index === 0}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveField("rows", index, 1)}
                      className="text-xs px-2 py-1 border rounded"
                      disabled={index === pivotConfig.rows.length - 1}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeField("rows", index)}
                      className="text-xs px-2 py-1 border rounded text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">
                Поля столбцов
              </span>
              <button
                type="button"
                onClick={handleAddColumnField}
                className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
                disabled={!availableColumnFields.length}
              >
                Добавить
              </button>
            </div>
            {pivotConfig.columns.length === 0 && (
              <p className="text-xs text-gray-400">
                Опционально: выберите поля для столбцов.
              </p>
            )}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {pivotConfig.columns.map((field, index) => (
                <div
                  key={`${field}-${index}`}
                  className="flex flex-wrap items-center gap-2 border rounded px-2 py-2 bg-gray-50"
                >
                  <select
                    value={field}
                    onChange={(e) => updateFieldList("columns", index, e.target.value)}
                    className="flex-1 border rounded px-2 py-1 text-sm min-w-[160px]"
                  >
                    {[field, ...availableColumnFields]
                      .filter((v, i, arr) => arr.indexOf(v) === i)
                      .map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                  </select>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveField("columns", index, -1)}
                      className="text-xs px-2 py-1 border rounded"
                      disabled={index === 0}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveField("columns", index, 1)}
                      className="text-xs px-2 py-1 border rounded"
                      disabled={index === pivotConfig.columns.length - 1}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeField("columns", index)}
                      className="text-xs px-2 py-1 border rounded text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Метрики */}
      <section className="bg-white rounded border shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-brand">Показатели</h3>
          <button
            type="button"
            onClick={addAggregation}
            className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
            disabled={!fields.length}
          >
            Добавить показатель
          </button>
        </div>
        {pivotConfig.values.length === 0 && (
          <p className="text-xs text-gray-400">
            Выберите поле и агрегатную функцию (SUM/COUNT/AVG/MIN/MAX).
          </p>
        )}
        <div className="space-y-2">
          {pivotConfig.values.map((value, index) => (
            <div
              key={`${value.field}-${index}-${value.agg}`}
              className="grid md:grid-cols-4 gap-2 border rounded px-2 py-2 items-center bg-gray-50"
            >
              <select
                value={value.field}
                onChange={(e) =>
                  updateAggregation(index, { field: e.target.value })
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
                value={value.agg}
                onChange={(e) =>
                  updateAggregation(index, {
                    agg: e.target.value as PivotAggregationType,
                  })
                }
                className="border rounded px-2 py-1 text-sm"
              >
                {aggregationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                value={value.alias ?? ""}
                onChange={(e) =>
                  updateAggregation(index, { alias: e.target.value })
                }
                placeholder="Псевдоним (необязательно)"
                className="border rounded px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() => removeAggregation(index)}
                className="text-xs px-2 py-1 border rounded text-red-500"
              >
                Удалить
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Фильтры */}
      <section className="bg-white rounded border shadow-sm p-4 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-brand">Фильтры данных</h3>
            <button
              type="button"
              onClick={() => addFilter("filters")}
              className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
            >
              Добавить фильтр
            </button>
          </div>
          {pivotConfig.filters.length === 0 && (
            <p className="text-xs text-gray-400">
              Фильтры применяются до свёртки. Пример: статус = «Зарегистрирован».
            </p>
          )}
          <div className="space-y-2">
            {pivotConfig.filters.map((filter, index) => (
              <div
                key={`pre-${filter.column}-${index}`}
                className="grid md:grid-cols-4 gap-2 border rounded px-2 py-2 bg-gray-50 items-center"
              >
                <select
                  value={filter.column}
                  onChange={(e) =>
                    updateFilter("filters", index, { column: e.target.value })
                  }
                  className="border rounded px-2 py-1 text-sm"
                >
                  {availableFilters.map((field) => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
                </select>
                <select
                  value={filter.operator}
                  onChange={(e) =>
                    updateFilter("filters", index, {
                      operator: e.target.value as PivotFilterOperator,
                    })
                  }
                  className="border rounded px-2 py-1 text-sm"
                >
                  {filterOperators.map((operator) => (
                    <option key={operator.value} value={operator.value}>
                      {operator.label}
                    </option>
                  ))}
                </select>
                <input
                  value={
                    Array.isArray(filter.value)
                      ? filter.value.join(", ")
                      : filter.value ?? ""
                  }
                  onChange={(e) =>
                    updateFilter("filters", index, { value: e.target.value })
                  }
                  placeholder={
                    filter.operator === "in"
                      ? "Значения через запятую"
                      : "Значение"
                  }
                  className="border rounded px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeFilter("filters", index)}
                  className="text-xs px-2 py-1 border rounded text-red-500"
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-brand">
              Фильтры по итогам
            </h3>
            <button
              type="button"
              onClick={() => addFilter("postFilters")}
              className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
              disabled={availableAggregates.length === 0}
            >
              Добавить фильтр
            </button>
          </div>
          {pivotConfig.postFilters.length === 0 && (
            <p className="text-xs text-gray-400">
              Фильтры применяются после агрегации (например, COUNT(…) ≥ 500).
            </p>
          )}
          <div className="space-y-2">
            {pivotConfig.postFilters.map((filter, index) => (
              <div
                key={`post-${filter.column}-${index}`}
                className="grid md:grid-cols-4 gap-2 border rounded px-2 py-2 bg-gray-50 items-center"
              >
                <select
                  value={filter.column}
                  onChange={(e) =>
                    updateFilter("postFilters", index, { column: e.target.value })
                  }
                  className="border rounded px-2 py-1 text-sm"
                >
                  {availableAggregates.map((agg) => (
                    <option key={agg.key} value={agg.key}>
                      {agg.label}
                    </option>
                  ))}
                </select>
                <select
                  value={filter.operator}
                  onChange={(e) =>
                    updateFilter("postFilters", index, {
                      operator: e.target.value as PivotFilterOperator,
                    })
                  }
                  className="border rounded px-2 py-1 text-sm"
                >
                  {filterOperators
                    .filter((op) => op.value !== "contains" && op.value !== "not_contains")
                    .map((operator) => (
                      <option key={operator.value} value={operator.value}>
                        {operator.label}
                      </option>
                    ))}
                </select>
                <input
                  value={
                    Array.isArray(filter.value)
                      ? filter.value.join(", ")
                      : filter.value ?? ""
                  }
                  onChange={(e) =>
                    updateFilter("postFilters", index, { value: e.target.value })
                  }
                  placeholder="Значение (пример: 500)"
                  className="border rounded px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeFilter("postFilters", index)}
                  className="text-xs px-2 py-1 border rounded text-red-500"
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Сортировка и лимит */}
      <section className="bg-white rounded border shadow-sm p-4 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-brand">Сортировка</h3>
            <button
              type="button"
              onClick={addSortRule}
              className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
            >
              Добавить правило
            </button>
          </div>
          {pivotConfig.sort.length === 0 && (
            <p className="text-xs text-gray-400">
              Сортировка применяется к итоговой таблице.
            </p>
          )}
          <div className="space-y-2">
            {pivotConfig.sort.map((rule, index) => (
              <div
                key={`sort-${rule.column}-${index}`}
                className="flex flex-wrap md:flex-nowrap items-center gap-2 border rounded px-2 py-2 bg-gray-50"
              >
                <select
                  value={rule.column}
                  onChange={(e) =>
                    updateSortRule(index, { column: e.target.value })
                  }
                  className="border rounded px-2 py-1 text-sm"
                >
                  {[...pivotConfig.rows, ...availableAggregates.map((agg) => agg.key)].map(
                    (option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    )
                  )}
                </select>
                <select
                  value={rule.direction}
                  onChange={(e) =>
                    updateSortRule(index, {
                      direction: e.target.value as PivotSort["direction"],
                    })
                  }
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="asc">По возрастанию</option>
                  <option value="desc">По убыванию</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeSortRule(index)}
                  className="text-xs px-2 py-1 border rounded text-red-500"
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600" htmlFor="pivot-limit">
            Ограничение строк:
          </label>
          <input
            id="pivot-limit"
            type="number"
            min={1}
            value={pivotConfig.limit ?? ""}
            onChange={(e) => updateLimit(e.target.value)}
            placeholder="Без ограничения"
            className="border rounded px-2 py-1 text-sm w-32"
          />
        </div>
      </section>
    </div>
  );
}
