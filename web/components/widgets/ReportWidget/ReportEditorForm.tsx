"use client";

import { useMemo } from "react";
import { ReportConfig, ReportMetricAggregation, ReportMetricConditionOperator, ReportMetricFormat } from "@/lib/types";
import { PlusCircle, Trash2 } from "lucide-react";
import { useTranslation } from "@/components/i18n/LocaleProvider";

type ReportEditorFormProps = {
  value: ReportConfig;
  columns: string[];
  onChange: (config: ReportConfig) => void;
};

export default function ReportEditorForm({ value, columns, onChange }: ReportEditorFormProps) {
  const { t, locale } = useTranslation();
  const metrics = value.metrics ?? [];
  const metricPlaceholder = locale === "ru" ? "{{код_метрики}}" : "{{metric_code}}";

  const aggregationOptions = useMemo<{ value: ReportMetricAggregation; label: string }[]>(
    () => [
      { value: "count", label: t("widgets.report.aggregations.count") },
      { value: "sum", label: t("widgets.report.aggregations.sum") },
      { value: "avg", label: t("widgets.report.aggregations.avg") },
      { value: "min", label: t("widgets.report.aggregations.min") },
      { value: "max", label: t("widgets.report.aggregations.max") },
      { value: "minDate", label: t("widgets.report.aggregations.minDate") },
      { value: "maxDate", label: t("widgets.report.aggregations.maxDate") },
    ],
    [t],
  );

  const formatOptions = useMemo<{ value: ReportMetricFormat; label: string }[]>(
    () => [
      { value: "number", label: t("widgets.report.formats.number") },
      { value: "integer", label: t("widgets.report.formats.integer") },
      { value: "currency", label: t("widgets.report.formats.currency") },
      { value: "date", label: t("widgets.report.formats.date") },
      { value: "datetime", label: t("widgets.report.formats.datetime") },
    ],
    [t],
  );

  const conditionOptions = useMemo<{ value: ReportMetricConditionOperator; label: string }[]>(
    () => [
      { value: "eq", label: t("widgets.report.operators.eq") },
      { value: "neq", label: t("widgets.report.operators.neq") },
      { value: "contains", label: t("widgets.report.operators.contains") },
      { value: "startsWith", label: t("widgets.report.operators.startsWith") },
      { value: "endsWith", label: t("widgets.report.operators.endsWith") },
    ],
    [t],
  );

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
        label: t("widgets.report.form.newMetricLabel"),
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
          <label className="block text-sm font-medium text-gray-600">{t("widgets.report.form.title")}</label>
          <span className="text-xs text-gray-400">
            {t("widgets.report.form.hint", { example: metricPlaceholder })}
          </span>
        </div>
        <textarea
          value={value.template}
          onChange={(e) => updateConfig({ template: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2 text-sm min-h-[140px] font-mono"
          placeholder={t("widgets.report.form.templatePlaceholder", {
            minDate: "{{minDate}}",
            maxDate: "{{maxDate}}",
            totalCount: "{{totalCount}}",
          })}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-600">
            {t("widgets.report.form.metricsTitle")}
          </label>
          <button
            type="button"
            onClick={addMetric}
            className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
          >
            <PlusCircle size={16} />
            {t("widgets.report.form.addMetric")}
          </button>
        </div>

        {metrics.length === 0 ? (
          <p className="text-sm text-gray-500 border rounded px-3 py-2">
            {t("widgets.report.form.emptyState")}
          </p>
        ) : (
          <div className="space-y-3">
            {metrics.map((metric, index) => (
              <div key={index} className="border rounded-lg px-3 py-3 bg-gray-50 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 uppercase">
                      {t("widgets.report.form.codeLabel")}
                    </label>
                    <input
                      type="text"
                      value={metric.id}
                      onChange={(e) => updateMetric(index, { id: e.target.value })}
                      className="w-full border rounded px-2 py-1 text-sm font-mono"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 uppercase">
                      {t("widgets.report.form.nameLabel")}
                    </label>
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
                    title={t("widgets.report.form.removeMetric")}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 uppercase">
                      {t("widgets.report.form.fieldLabel")}
                    </label>
                    <select
                      value={metric.field}
                      onChange={(e) => updateMetric(index, { field: e.target.value })}
                      className="w-full border rounded px-2 py-1 text-sm"
                    >
                      <option value="">{t("widgets.report.form.fieldPlaceholder")}</option>
                      {columns.map((column) => (
                        <option key={column} value={column}>
                          {column}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase">
                      {t("widgets.report.form.aggregationLabel")}
                    </label>
                    <select
                      value={metric.aggregation}
                      onChange={(e) =>
                        updateMetric(index, {
                          aggregation: e.target.value as ReportMetricAggregation,
                        })
                      }
                      className="w-full border rounded px-2 py-1 text-sm"
                    >
                      {aggregationOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase">
                      {t("widgets.report.form.formatLabel")}
                    </label>
                    <select
                      value={metric.format ?? ""}
                      onChange={(e) =>
                        updateMetric(index, {
                          format: (e.target.value || undefined) as ReportMetricFormat | undefined,
                        })
                      }
                      className="w-full border rounded px-2 py-1 text-sm"
                    >
                      <option value="">{t("widgets.report.form.formatPlaceholder")}</option>
                      {formatOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="border-t border-dashed pt-3">
                  <p className="text-xs text-gray-500 uppercase mb-2">
                    {t("widgets.report.form.filterTitle")}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-gray-500 uppercase">
                        {t("widgets.report.form.filterField")}
                      </label>
                      <select
                        value={metric.conditionField ?? ""}
                        onChange={(e) => updateMetric(index, { conditionField: e.target.value })}
                        className="w-full border rounded px-2 py-1 text-sm"
                      >
                        <option value="">{t("widgets.report.form.filterFieldPlaceholder")}</option>
                        {columns.map((column) => (
                          <option key={column} value={column}>
                            {column}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 uppercase">
                        {t("widgets.report.form.filterOperator")}
                      </label>
                      <select
                        value={metric.conditionOperator ?? "eq"}
                        onChange={(e) =>
                          updateMetric(index, {
                            conditionOperator: e.target.value as ReportMetricConditionOperator,
                          })
                        }
                        className="w-full border rounded px-2 py-1 text-sm"
                      >
                        {conditionOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 uppercase">
                        {t("widgets.report.form.filterValue")}
                      </label>
                      <input
                        type="text"
                        value={metric.conditionValue ?? ""}
                        onChange={(e) => updateMetric(index, { conditionValue: e.target.value })}
                        className="w-full border rounded px-2 py-1 text-sm"
                        placeholder={t("widgets.report.form.filterValuePlaceholder")}
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
