"use client";

import { ReportConfig, ReportMetricAggregation, ReportMetricConditionOperator, ReportMetricFormat } from "@/lib/types";
import { PlusCircle, Trash2 } from "lucide-react";

type ReportEditorFormProps = {
  value: ReportConfig;
  columns: string[];
  onChange: (config: ReportConfig) => void;
};

const AGG_OPTIONS: { value: ReportMetricAggregation; label: string }[] = [
  { value: "count", label: "Количество" },
  { value: "sum", label: "Сумма" },
  { value: "avg", label: "Среднее" },
  { value: "min", label: "Минимум" },
  { value: "max", label: "Максимум" },
  { value: "minDate", label: "Минимальная дата" },
  { value: "maxDate", label: "Максимальная дата" },
];

const FORMAT_OPTIONS: { value: ReportMetricFormat; label: string }[] = [
  { value: "number", label: "Число (2 знака)" },
  { value: "integer", label: "Целое" },
  { value: "currency", label: "Валюта" },
  { value: "date", label: "Дата" },
  { value: "datetime", label: "Дата и время" },
];

const CONDITION_OPTIONS: { value: ReportMetricConditionOperator; label: string }[] = [
  { value: "eq", label: "Равно" },
  { value: "neq", label: "Не равно" },
  { value: "contains", label: "Содержит" },
  { value: "startsWith", label: "Начинается с" },
  { value: "endsWith", label: "Заканчивается на" },
];

export default function ReportEditorForm({ value, columns, onChange }: ReportEditorFormProps) {
  const metrics = value.metrics ?? [];

  const updateConfig = (patch: Partial<ReportConfig>) => {
    onChange({ ...value, ...patch });
  };

  const updateMetrics = (nextMetrics: typeof metrics) => {
    onChange({ ...value, metrics: nextMetrics });
  };

  const updateMetric = (index: number, patch: Record<string, unknown>) => {
    const nextMetrics = metrics.map((metric, idx) => (idx === index ? { ...metric, ...patch } : metric));
    updateMetrics(nextMetrics);
  };

  const addMetric = () => {
    updateMetrics([
      ...metrics,
      {
        id: `metric_${Date.now()}`,
        label: "Новая метрика",
        field: columns[0] ?? "",
        aggregation: "sum" as ReportMetricAggregation,
        format: "number" as ReportMetricFormat,
        conditionField: columns[0] ?? "",
        conditionOperator: "eq" as ReportMetricConditionOperator,
        conditionValue: "",
      },
    ]);
  };

  const removeMetric = (index: number) => {
    updateMetrics(metrics.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-600">Текст отчёта</label>
          <span className="text-xs text-gray-400">Используйте {"{{код_метрики}}"} для подстановки значений</span>
        </div>
        <textarea
          value={value.template}
          onChange={(e) => updateConfig({ template: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2 text-sm min-h-[140px] font-mono"
          placeholder={`Данные с {{minDate}} по {{maxDate}}\nВсего записей — {{totalCount}}`}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-600">Метрики</label>
          <button
            type="button"
            onClick={addMetric}
            className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
          >
            <PlusCircle size={16} />
            Добавить метрику
          </button>
        </div>

        {metrics.length === 0 ? (
          <p className="text-sm text-gray-500 border rounded px-3 py-2">
            Добавьте хотя бы одну метрику, чтобы использовать её в шаблоне.
          </p>
        ) : (
          <div className="space-y-3">
            {metrics.map((metric, index) => (
              <div key={index} className="border rounded-lg px-3 py-3 bg-gray-50 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 uppercase">Код</label>
                    <input
                      type="text"
                      value={metric.id}
                      onChange={(e) => updateMetric(index, { id: e.target.value })}
                      className="w-full border rounded px-2 py-1 text-sm font-mono"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 uppercase">Название</label>
                    <input
                      type="text"
                      value={metric.label}
                      onChange={(e) => updateMetric(index, { label: e.target.value })}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMetric(index)}
                    className="text-red-500 hover:text-red-600 px-2 py-1"
                    title="Удалить метрику"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 uppercase">Поле</label>
                    <select
                      value={metric.field}
                      onChange={(e) => updateMetric(index, { field: e.target.value })}
                      className="w-full border rounded px-2 py-1 text-sm"
                    >
                      <option value="">Не выбрано</option>
                      {columns.map((column) => (
                        <option key={column} value={column}>
                          {column}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase">Агрегация</label>
                    <select
                      value={metric.aggregation}
                      onChange={(e) =>
                        updateMetric(index, {
                          aggregation: e.target.value as ReportMetricAggregation,
                        })
                      }
                      className="w-full border rounded px-2 py-1 text-sm"
                    >
                      {AGG_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase">Формат</label>
                    <select
                      value={metric.format ?? ""}
                      onChange={(e) =>
                        updateMetric(index, {
                          format: (e.target.value || undefined) as ReportMetricFormat | undefined,
                        })
                      }
                      className="w-full border rounded px-2 py-1 text-sm"
                    >
                      <option value="">Без форматирования</option>
                      {FORMAT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="border-t border-dashed pt-3">
                  <p className="text-xs text-gray-500 uppercase mb-2">Фильтр по значению (опционально)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-gray-500 uppercase">Поле фильтра</label>
                      <select
                        value={metric.conditionField ?? ""}
                        onChange={(e) => updateMetric(index, { conditionField: e.target.value })}
                        className="w-full border rounded px-2 py-1 text-sm"
                      >
                        <option value="">Как в метрике</option>
                        {columns.map((column) => (
                          <option key={column} value={column}>
                            {column}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 uppercase">Условие</label>
                      <select
                        value={metric.conditionOperator ?? "eq"}
                        onChange={(e) =>
                          updateMetric(index, {
                            conditionOperator: e.target.value as ReportMetricConditionOperator,
                          })
                        }
                        className="w-full border rounded px-2 py-1 text-sm"
                      >
                        {CONDITION_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 uppercase">Значение</label>
                      <input
                        type="text"
                        value={metric.conditionValue ?? ""}
                        onChange={(e) => updateMetric(index, { conditionValue: e.target.value })}
                        className="w-full border rounded px-2 py-1 text-sm"
                        placeholder="Например: Ошибка"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
