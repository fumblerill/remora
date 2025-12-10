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
  ColumnSizingState,
  Header,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useState, useRef, useEffect, type ReactNode } from "react";
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

  const columns = useMemo<ColumnDef<any>[]>(() => {
    const dimensionDefs: ColumnDef<any>[] = dimensionFields.map((field) => ({
      accessorKey: field,
      header: field,
      cell: (info: CellContext<any, unknown>) => (
        <CellContent value={info.getValue()} />
      ),
    }));

    const valueDefs: ColumnDef<any>[] = valueColumns.map((col) => ({
      accessorKey: col.key,
      header: cleanHeader(col.header),
      cell: (info: CellContext<any, unknown>) => (
        <CellContent value={info.getValue()} />
      ),
    }));

    // если таблица не pivot, возможно есть столбцы, которых нет в dimensionFields
    if (!pivotResult.isPivot) {
      const extraKeys = Object.keys(tableData[0] ?? {}).filter(
        (key) =>
          !key.startsWith("__") &&
          !dimensionFields.includes(key) &&
          !valueColumns.some((col) => col.key === key),
      );

      const extraDefs = extraKeys.map((key) => ({
        accessorKey: key,
        header: key,
        cell: (info: CellContext<any, unknown>) => (
          <CellContent value={info.getValue()} />
        ),
      }));

      return [...dimensionDefs, ...extraDefs];
    }

    return [...dimensionDefs, ...valueDefs];
  }, [dimensionFields, valueColumns, tableData, pivotResult.isPivot]);

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
  const [selectionStart, setSelectionStart] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [hasUserSizedColumns, setHasUserSizedColumns] = useState(false);
  const autoSizingRef = useRef(false);
  const lastAutoSignatureRef = useRef<string | null>(null);

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
    enableSortingRemoval: false,
  });

  const parentRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const element = parentRef.current;
    if (!element) return;

    const updateSize = () => {
      setContainerWidth(element.clientWidth);
    };

    updateSize();

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 10,
  });

  const leafColumnSignature = table
    .getAllLeafColumns()
    .map((column) => column.id)
    .join("|");
  const totalSize = table.getTotalSize();
  const columnSizingState = table.getState().columnSizing;
  const columnSizingSignature = useMemo(() => {
    const entries = Object.entries(columnSizingState);
    if (!entries.length) return "";
    return entries
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, size]) => `${id}:${size}`)
      .join("|");
  }, [columnSizingState]);

  useEffect(() => {
    setHasUserSizedColumns(false);
    lastAutoSignatureRef.current = null;
    autoSizingRef.current = true;
    table.resetColumnSizing();
  }, [leafColumnSignature, table]);

  useEffect(() => {
    if (!columnSizingSignature) {
      lastAutoSignatureRef.current = null;
      autoSizingRef.current = false;
      return;
    }

    if (autoSizingRef.current) {
      lastAutoSignatureRef.current = columnSizingSignature;
      autoSizingRef.current = false;
      return;
    }

    lastAutoSignatureRef.current = null;
    setHasUserSizedColumns(true);
  }, [columnSizingSignature]);

  useEffect(() => {
    if (hasUserSizedColumns) return;
    if (!containerWidth) return;
    const columns = table.getAllLeafColumns();
    if (!columns.length) return;

    const currentTotalSize = table.getTotalSize();
    const hasAutoSizing = lastAutoSignatureRef.current !== null;
    const tolerance = 1;
    const shouldStretch =
      containerWidth > 0 && currentTotalSize + tolerance < containerWidth;
    const shouldShrink =
      hasAutoSizing && currentTotalSize - tolerance > containerWidth;

    if (!shouldStretch && !shouldShrink) return;

    const widthPerColumn = containerWidth / columns.length;
    autoSizingRef.current = true;
    table.setColumnSizing(() => {
      const next: ColumnSizingState = {};
      for (const column of columns) {
        next[column.id] = widthPerColumn;
      }
      return next;
    });
  }, [
    containerWidth,
    hasUserSizedColumns,
    table,
    leafColumnSignature,
  ]);

  return (
    <div
      className="border border-gray-300 w-full h-full overflow-hidden"
      onMouseLeave={() => setIsSelecting(false)}
      onMouseUp={() => setIsSelecting(false)}
    >
      <div ref={parentRef} className="overflow-auto" style={{ height }}>
        {/* фиксированная шапка */}
        <div
          className="flex bg-gray-100 font-semibold border-b min-w-max sticky top-0 z-10"
          style={{ height: 64 }}
        >
          {table.getHeaderGroups().map((headerGroup) => (
            <div
              key={headerGroup.id}
              className="flex"
            >
              {headerGroup.headers.map((header) => {
                const headerContent = flexRender(
                  header.column.columnDef.header,
                  header.getContext(),
                );
                const headerTitle = getHeaderTitle(header, headerContent);

                return (
                  <div
                    key={header.id}
                    className="border-r px-2 py-1 relative flex flex-col justify-between"
                    style={{
                      width: header.getSize(),
                      minWidth: header.getSize(),
                    }}
                  >
                    {/* название */}
                    <div
                      onClick={header.column.getToggleSortingHandler()}
                      className="cursor-pointer select-none flex items-center gap-1 truncate whitespace-nowrap overflow-hidden"
                      title={headerTitle}
                    >
                      {headerContent}
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
                        onChange={(e) =>
                          header.column.setFilterValue(e.target.value)
                        }
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
                );
              })}
            </div>
          ))}
        </div>

        {/* тело таблицы */}
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: totalSize,
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
                data-index={virtualRow.index}
                style={{
                  position: "absolute",
                  top: virtualRow.start,
                  left: 0,
                  width: "100%",
                }}
              >
                {row.getVisibleCells().map((cell, cellIndex) => {
                  const bounds = getSelectionBounds(
                    selectionStart,
                    selectionEnd,
                  );
                  const isSelected =
                    bounds &&
                    row.index >= bounds.top &&
                    row.index <= bounds.bottom &&
                    cellIndex >= bounds.left &&
                    cellIndex <= bounds.right;
                  return (
                    <div
                      key={cell.id}
                      className={`border-r px-2 py-1 truncate whitespace-nowrap overflow-hidden ${
                        isSelected ? "bg-blue-100" : ""
                      }`}
                      style={{
                        width: cell.column.getSize(),
                        minWidth: cell.column.getSize(),
                        userSelect: "none",
                      }}
                      onClick={() => {
                        setSelectionStart({ row: row.index, col: cellIndex });
                        setSelectionEnd({ row: row.index, col: cellIndex });
                        setIsSelecting(false);
                      }}
                      onMouseDown={(e) => {
                        if (e.button !== 0) return;
                        setSelectionStart({ row: row.index, col: cellIndex });
                        setSelectionEnd({ row: row.index, col: cellIndex });
                        setIsSelecting(true);
                      }}
                      onMouseEnter={() => {
                        if (!isSelecting || !selectionStart) return;
                        setSelectionEnd({ row: row.index, col: cellIndex });
                      }}
                      onMouseUp={() => setIsSelecting(false)}
                      onDoubleClick={() => {
                        const value = cell.getContext().getValue();
                        if (value === undefined || value === null) return;
                        const str = String(value);
                        if (!navigator.clipboard) return;
                        navigator.clipboard.writeText(str).catch(() => {});
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getSelectionBounds(
  start: { row: number; col: number } | null,
  end: { row: number; col: number } | null,
) {
  if (!start || !end) return null;
  const top = Math.min(start.row, end.row);
  const bottom = Math.max(start.row, end.row);
  const left = Math.min(start.col, end.col);
  const right = Math.max(start.col, end.col);
  return { top, bottom, left, right };
}

function getHeaderTitle(
  header: Header<any, unknown>,
  rendered: ReactNode,
): string | undefined {
  if (typeof rendered === "string") {
    return rendered;
  }

  const rawHeader = header.column.columnDef.header;
  if (typeof rawHeader === "string") {
    return rawHeader;
  }

  return typeof header.column.id === "string"
    ? header.column.id
    : undefined;
}

function cleanHeader(raw: string): string {
  if (!raw) return raw;

  const [metricPart, rest] = raw.split("•").map(s => s.trim());

  if (!rest) return raw;

  const finalValue = rest.includes(":")
    ? rest.split(":").at(-1)!.trim()
    : rest;

  return `${metricPart} → ${finalValue}`;
}




function CellContent({ value }: { value: unknown }) {
  const str = value === undefined || value === null ? "" : String(value);
  return (
    <div
      className="truncate whitespace-nowrap overflow-hidden select-text"
      title={str}
      tabIndex={0}
    >
      {str}
    </div>
  );
}
