"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";

// 🔹 Компонент фильтра (инпут + чекбоксы)
function ColumnFilter({ column, tableData }: { column: any; tableData: any[] }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const uniqueValues = useMemo(() => {
    return Array.from(new Set(tableData.map((row) => row[column.id]))).sort();
  }, [tableData, column.id]);

  const selectedValues = (column.getFilterValue() as string[]) ?? [];

  const filteredValues = uniqueValues.filter((v) =>
    v.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      {/* Инпут поиска */}
      <input
        type="text"
        placeholder="Поиск..."
        value={search}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)} // задержка чтобы можно было кликнуть по чекбоксу
        onChange={(e) => setSearch(e.target.value)}
        className="mt-1 w-full border px-2 py-1 text-sm rounded"
      />

      {/* Выпадающий список */}
      {open && (
        <div className="absolute left-0 mt-1 w-48 max-h-40 overflow-y-auto border rounded bg-white shadow-lg z-50 p-2">
          {filteredValues.map((val) => (
            <label key={val} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={selectedValues.includes(val)}
                onChange={(e) => {
                  let newValues = [...selectedValues];
                  if (e.target.checked) {
                    newValues.push(val);
                  } else {
                    newValues = newValues.filter((x) => x !== val);
                  }
                  column.setFilterValue(newValues.length ? newValues : undefined);
                }}
              />
              {val}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}


// 🔹 Основная таблица
export default function PivotRenderer({
  data,
}: {
  data: { columns: string[]; rows: string[][] };
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Преобразуем строки → массив объектов
  const tableData = useMemo(() => {
    return data.rows.map((row) =>
      Object.fromEntries(data.columns.map((col, i) => [col, row[i]]))
    );
  }, [data]);

  // Колонки
  const columns = useMemo<ColumnDef<any>[]>(() => {
    return data.columns.map((col) => ({
      accessorKey: col,
      header: col,
      cell: (info) => info.getValue(),
      enableColumnFilter: true,
    }));
  }, [data]);

  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="overflow-x-auto mt-6 bg-white rounded-lg shadow p-4">
      <table className="min-w-full border-collapse border">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  className="border px-4 py-2 bg-gray-100 text-left align-top"
                >
                  {/* Заголовок с сортировкой */}
                  <div
                    className="cursor-pointer select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    {{
                      asc: " ▲",
                      desc: " ▼",
                    }[header.column.getIsSorted() as string] ?? null}
                  </div>

                  {/* Фильтр */}
                  {header.column.getCanFilter() ? (
                    <ColumnFilter
                      column={header.column}
                      tableData={tableData}
                    />
                  ) : null}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="border px-4 py-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
