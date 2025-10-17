"use client";

import type { PivotConfig } from "@/lib/types";
import { applyPivot } from "@/lib/pivot";
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

  const pivotResult = useMemo(() => applyPivot(data, config), [data, config]);
  const tableData = pivotResult.data;

  if (!tableData.length) {
    return <div>Нет данных</div>;
  }

  const dimensionFields = pivotResult.isPivot
    ? pivotResult.dimensionFields
    : Object.keys(tableData[0]).filter((key) => !key.startsWith("__"));

  const valueColumns = pivotResult.isPivot ? pivotResult.valueColumns : [];

  const columns = useMemo<ColumnDef<any>[]>(
    () => {
      const dimensionDefs: ColumnDef<any>[] = dimensionFields.map((field) => ({
        accessorKey: field,
        header: field,
        cell: (info: CellContext<any, unknown>) => (
          <div className="truncate whitespace-nowrap overflow-hidden">
            {String(info.getValue() ?? "")}
          </div>
        ),
      }));

      const valueDefs: ColumnDef<any>[] = valueColumns.map((col) => ({
        accessorKey: col.key,
        header: col.header,
        cell: (info: CellContext<any, unknown>) => (
          <div className="truncate whitespace-nowrap overflow-hidden">
            {String(info.getValue() ?? "")}
          </div>
        ),
      }));

      // если таблица не pivot, возможно есть столбцы, которых нет в dimensionFields
      if (!pivotResult.isPivot) {
        const extraKeys = Object.keys(tableData[0] ?? {}).filter(
          (key) =>
            !key.startsWith("__") &&
            !dimensionFields.includes(key) &&
            !valueColumns.some((col) => col.key === key)
        );

        const extraDefs = extraKeys.map((key) => ({
          accessorKey: key,
          header: key,
          cell: (info: CellContext<any, unknown>) => (
            <div className="truncate whitespace-nowrap overflow-hidden">
              {String(info.getValue() ?? "")}
            </div>
          ),
        }));

        return [...dimensionDefs, ...extraDefs];
      }

      return [...dimensionDefs, ...valueDefs];
    },
    [dimensionFields, valueColumns, tableData, pivotResult.isPivot]
  );

  return <TanStackTable data={tableData} columns={columns} height={height} />;
}

// ===============================
// Универсальная таблица (TanStack + virtual scroll)
// ===============================
function TanStackTable({
  data,
  columns,
  height,
}: {
  data: any[];
  columns: ColumnDef<any>[];
  height?: number;
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
    estimateSize: () => 32,
    overscan: 10,
  });

  return (
    <div className="border border-gray-300 w-full h-full overflow-hidden">
      <div ref={parentRef} className="overflow-auto" style={{ height }}>
        {/* фиксированная шапка */}
        <div
          className="flex bg-gray-100 font-semibold border-b min-w-max sticky top-0 z-10"
          style={{ height: 64 }}
        >
          {table.getHeaderGroups().map((headerGroup) => (
            <div key={headerGroup.id} className="flex">
              {headerGroup.headers.map((header) => (
                <div
                  key={header.id}
                  className="border-r px-2 py-1 relative flex flex-col justify-between"
                  style={{ width: header.getSize() }}
                >
                  {/* название */}
                  <div
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer select-none flex items-center gap-1 truncate whitespace-nowrap overflow-hidden"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{
                      asc: <ArrowUp size={14} />,
                      desc: <ArrowDown size={14} />,
                    }[header.column.getIsSorted() as string] ?? null}
                  </div>

                  {/* фильтр */}
                  {header.column.getCanFilter() && (
                    <input
                      type="text"
                      value={(header.column.getFilterValue() as string) ?? ""}
                      onChange={(e) => header.column.setFilterValue(e.target.value)}
                      placeholder="Фильтр..."
                      className="w-full border rounded px-1 text-xs mt-1"
                    />
                  )}

                  {/* ресайзер */}
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

        {/* тело таблицы */}
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
                ref={(el) => {
                  if (el) rowVirtualizer.measureElement(el);
                }}
                className="flex border-b min-w-max"
                style={{
                  position: "absolute",
                  top: virtualRow.start,
                  left: 0,
                  width: "100%",
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
