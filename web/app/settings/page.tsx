"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import { ArrowUp, ArrowDown, UserPlus, Shield, Trash2, LayoutDashboard } from "lucide-react";
import { useUserRole } from "@/lib/useUserRole";
import { useUsers } from "@/lib/hooks/useUsers";
import UserCreateModal from "@/components/settings/UserCreateModal";

export default function SettingsPage() {
  const { role, loading: roleLoading } = useUserRole();
  const {
    users,
    configs,
    loading,
    loadAll,
    handleCreateUser,
    handleDelete,
    handleRoleChange,
    handleDashboardsChange,
  } = useUsers();

  const [creating, setCreating] = useState(false);
  const isSuper = role === "SuperAdmin";
  const isAdmin = role === "Admin";

  useEffect(() => {
    if (!roleLoading) loadAll();
  }, [roleLoading]);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      { header: "ID", accessorKey: "id" },
      { header: "Логин", accessorKey: "login" },
      {
        header: "Роль",
        accessorKey: "role",
        cell: ({ row }) =>
          isSuper ? (
            <select
              value={row.original.role}
              onChange={(e) => handleRoleChange(row.original.id, e.target.value)}
              className="border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-brand"
            >
              <option value="User">User</option>
              <option value="Admin">Admin</option>
              <option value="SuperAdmin">SuperAdmin</option>
            </select>
          ) : (
            <span>{row.original.role}</span>
          ),
      },
      {
        header: "Дашборды",
        accessorKey: "dashboards",
        cell: ({ row }) => {
          const [open, setOpen] = useState(false);
          const selected = row.original.dashboards || [];
          if (!(isSuper || isAdmin)) return <span className="text-gray-500 text-sm">{selected.join(", ") || "—"}</span>;
          return (
            <div className="relative">
              <button
                onClick={() => setOpen(!open)}
                className="border border-gray-300 rounded px-2 py-1 text-sm w-full text-left bg-white hover:bg-gray-50"
              >
                {selected.length ? selected.join(", ") : "Выбрать дашборды"}
              </button>
              {open && (
                <div className="absolute top-full mt-1 left-0 w-56 bg-white border rounded shadow-md z-10 p-2 max-h-48 overflow-y-auto">
                  {configs.map((cfg) => {
                    const checked = selected.includes(cfg.name);
                    return (
                      <label key={cfg.file} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const updated = checked
                              ? selected.filter((n: string) => n !== cfg.name)
                              : [...selected, cfg.name];
                            handleDashboardsChange(row.original.id, updated);
                          }}
                        />
                        <span>{cfg.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        },
      },
      {
        header: "Действия",
        id: "actions",
        cell: ({ row }) =>
          isSuper ? (
            <button
              onClick={() => handleDelete(row.original.id)}
              className="text-red-500 hover:text-red-700 flex items-center gap-1 text-sm"
            >
              <Trash2 size={14} /> Удалить
            </button>
          ) : (
            <span className="text-gray-400 text-sm">—</span>
          ),
      },
    ],
    [users, configs, role]
  );

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (roleLoading || loading) return <div className="p-6 text-center">Загрузка...</div>;

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex flex-1 mt-4 gap-4">
        {/* Боковая панель */}
        <div className="relative">
          <div className="absolute top-0 left-1/4 w-0.5 h-full bg-gray-300 z-0" />
          <div className="absolute top-0 right-1/4 w-0.5 h-full bg-gray-300 z-0" />
          <aside className="sticky top-20 z-10 w-64 bg-white shadow-md rounded-lg p-4 flex flex-col gap-3 border h-fit">
            <h2 className="text-lg font-bold text-brand mb-1 flex items-center gap-2">
              <Shield size={18} /> Управление
            </h2>
            {isSuper ? (
              <button
                onClick={() => setCreating(true)}
                className="flex items-center justify-center gap-2 px-3 py-2 border border-brand text-brand rounded hover:bg-brand hover:text-white transition"
              >
                <UserPlus size={16} /> Новый пользователь
              </button>
            ) : (
              <p className="text-gray-500 text-sm">Только SuperAdmin может создавать пользователей</p>
            )}
          </aside>
        </div>

        {/* Таблица */}
        <main className="flex-1 bg-white shadow-md rounded-lg p-4 border">
          <h2 className="text-xl font-semibold text-brand mb-4 flex items-center gap-2">
            <LayoutDashboard size={18} /> Пользователи системы
          </h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header) => (
                      <th key={header.id} className="px-3 py-2 text-left">
                        {header.isPlaceholder ? null : (
                          <div
                            className="flex items-center gap-1 select-none cursor-pointer"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{
                              asc: <ArrowUp size={14} />,
                              desc: <ArrowDown size={14} />,
                            }[header.column.getIsSorted() as string] ?? null}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="text-center py-4 text-gray-500">
                      Нет пользователей
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      <UserCreateModal
        isOpen={creating}
        onClose={() => setCreating(false)}
        onCreate={handleCreateUser}
      />
    </div>
  );
}
