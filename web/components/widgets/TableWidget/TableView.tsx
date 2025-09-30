"use client";

import type { PivotConfig } from "@/lib/types";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
  CellContext,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useState, useRef } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

interface TableViewProps {
  data: any[];
  config: PivotConfig;
  height?: number;
}

export default function TableView({
  data,
  config,
  height = 500,
}: TableViewProps) {
  if (!data || data.length === 0) return <div>Нет данных</div>;

  const { rows, cols, values } = config;

  // ===============================
  // Сырые данные
  // ===============================
  if (rows.length === 0 && cols.length === 0 && values.length === 0) {
    const columns = useMemo<ColumnDef<any>[]>(
      () =>
        Object.keys(data[0]).map((key) => ({
          accessorKey: key,
          header: key,
          cell: (info: CellContext<any, unknown>) => (
            <div className="truncate whitespace-nowrap overflow-hidden">
              {String(info.getValue() ?? "")}
            </div>
          ),
        })),
      [data]
    );

    return <TanStackTable data={data} columns={columns} height={height} />;
  }

  // ===============================
  // Сводная таблица (pivot)
  // ===============================

  const colKeys = cols.length
    ? Array.from(new Set(data.map((row) => cols.map((c) => row[c]).join(" | "))))
    : [""];

  const grouped: Record<string, any[]> = {};
  for (const row of data) {
    const rowKey = rows.map((r) => row[r]).join(" | ") || "∅";
    if (!grouped[rowKey]) grouped[rowKey] = [];
    grouped[rowKey].push(row);
  }

  const aggregate = (
    rows: any[],
    field: string,
    agg: "sum" | "count" | "avg"
  ) => {
    const vals = rows.map((r) => Number(r[field]) || 0);
    if (agg === "sum") return vals.reduce((a, b) => a + b, 0);
    if (agg === "count") return vals.length;
    if (agg === "avg")
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return 0;
  };

  const pivotRows = Object.entries(grouped).map(([rowKey, rowsData]) => {
    const rowObj: Record<string, any> = {};
    const rowParts = rowKey.split(" | ");
    rows.forEach((r, idx) => {
      rowObj[r] = rowParts[idx];
    });

    colKeys.forEach((colKey) => {
      values.forEach((v) => {
        const fieldKey = colKey
          ? `${colKey} | ${v.field} (${v.agg})`
          : `${v.field} (${v.agg})`;

        const filtered = colKey
          ? rowsData.filter((r) => cols.map((c) => r[c]).join(" | ") === colKey)
          : rowsData;

        rowObj[fieldKey] = aggregate(filtered, v.field, v.agg);
      });
    });

    return rowObj;
  });

  const pivotColumns = useMemo<ColumnDef<any>[]>(
    () => [
      ...rows.map((r) => ({
        accessorKey: r,
        header: r,
        cell: (info: CellContext<any, unknown>) => (
          <div className="truncate whitespace-nowrap overflow-hidden">
            {String(info.getValue() ?? "")}
          </div>
        ),
      })),
      ...colKeys.flatMap((colKey) =>
        values.map((v) => {
          const fieldKey = colKey
            ? `${colKey} | ${v.field} (${v.agg})`
            : `${v.field} (${v.agg})`;
          return {
            accessorKey: fieldKey,
            header: fieldKey,
            cell: (info: CellContext<any, unknown>) => (
              <div className="truncate whitespace-nowrap overflow-hidden">
                {String(info.getValue() ?? "")}
              </div>
            ),
          } as ColumnDef<any>;
        })
      ),
    ],
    [rows, colKeys, values]
  );

  return <TanStackTable data={pivotRows} columns={pivotColumns} height={height} />;
}

// ===============================
// Универсальная таблица
// ===============================
function TanStackTable({
  data,
  columns,
  height,
}: {
  data: any[];
  columns: ColumnDef<any>[];
  height: number;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    columnResizeMode: "onChange",
  });

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32, // фиксированная высота строки
    overscan: 10,
  });

  return (
    <div className="border border-gray-300 w-full overflow-hidden">
      <div ref={parentRef} className="overflow-auto" style={{ height }}>
        {/* Заголовки */}
        <div className="flex bg-gray-100 font-semibold border-b min-w-max sticky top-0 z-10">
          {table.getHeaderGroups().map((headerGroup) => (
            <div key={headerGroup.id} className="flex">
              {headerGroup.headers.map((header) => (
                <div
                  key={header.id}
                  className="border-r px-2 py-1 truncate whitespace-nowrap overflow-hidden relative"
                  style={{ width: header.getSize() }}
                >
                  <div
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer select-none flex items-center space-x-1"
                  >
                    <span>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </span>
                    {header.column.getIsSorted() === "asc" && <ArrowUp size={14} />}
                    {header.column.getIsSorted() === "desc" && <ArrowDown size={14} />}
                  </div>
                  
                  {/* Ресайзер */}
                  <div
                    onMouseDown={header.getResizeHandler()}
                    onTouchStart={header.getResizeHandler()}
                    className="absolute top-0 right-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-400"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Тело таблицы */}
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: table.getTotalSize(),
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = table.getRowModel().rows[virtualRow.index];
            return (
              <div
                key={row.id}
                className="flex border-b min-w-max h-8"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <div
                    key={cell.id}
                    className="border-r px-2 py-1 truncate whitespace-nowrap overflow-hidden"
                    style={{ width: cell.column.getSize() }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
