"use client";

import type { PivotConfig } from "@/lib/types";

interface TableViewProps {
  data: any[];
  config: PivotConfig;
}

export default function TableView({ data, config }: TableViewProps) {
  if (!data || data.length === 0) return <div>Нет данных</div>;

  const { rows, cols, values } = config;

  // Если конфиг пустой — показываем исходные данные
  if (rows.length === 0 && cols.length === 0 && values.length === 0) {
    return (
      <table className="border border-gray-300 w-full">
        <thead>
          <tr>
            {Object.keys(data[0]).map((key) => (
              <th key={key} className="border px-2 py-1 bg-gray-100">{key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {Object.values(row).map((val, j) => (
                <td key={j} className="border px-2 py-1">{String(val)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // ===============================
  // Сводная таблица
  // ===============================

  // Получаем уникальные ключи по колонкам
  const colKeys = cols.length
    ? Array.from(new Set(data.map((row) => cols.map((c) => row[c]).join(" | "))))
    : [""];

  // Группируем данные по строкам
  const grouped: Record<string, any[]> = {};
  for (const row of data) {
    const rowKey = rows.map((r) => row[r]).join(" | ") || "∅";
    if (!grouped[rowKey]) grouped[rowKey] = [];
    grouped[rowKey].push(row);
  }

  // Функция агрегации
  const aggregate = (rows: any[], field: string, agg: "sum" | "count" | "avg") => {
    const vals = rows.map((r) => Number(r[field]) || 0);
    if (agg === "sum") return vals.reduce((a, b) => a + b, 0);
    if (agg === "count") return vals.length;
    if (agg === "avg") return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return 0;
  };

  return (
    <table className="border border-gray-300 w-full">
      <thead>
        <tr>
          {/* Колонки для группировки строк */}
          {rows.map((r) => (
            <th key={r} className="border px-2 py-1 bg-gray-100">{r}</th>
          ))}

          {/* Колонки для значений */}
          {colKeys.map((colKey) =>
            values.map((v) => (
              <th
                key={`${colKey}-${v.field}-${v.agg}`}
                className="border px-2 py-1 bg-gray-100"
              >
                {colKey ? `${colKey} | ${v.field} (${v.agg})` : `${v.field} (${v.agg})`}
              </th>
            ))
          )}
        </tr>
      </thead>
      <tbody>
        {Object.entries(grouped).map(([rowKey, rowsData], i) => {
          const rowParts = rowKey.split(" | ");

          return (
            <tr key={i}>
              {rowParts.map((p, idx) => (
                <td key={idx} className="border px-2 py-1">{p}</td>
              ))}

              {colKeys.map((colKey) =>
                values.map((v) => {
                  const filtered = colKey
                    ? rowsData.filter((r) => cols.map((c) => r[c]).join(" | ") === colKey)
                    : rowsData;
                  return (
                    <td key={`${rowKey}-${colKey}-${v.field}-${v.agg}`} className="border px-2 py-1">
                      {aggregate(filtered, v.field, v.agg)}
                    </td>
                  );
                })
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
