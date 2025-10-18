"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/layout/Header";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import {
  ArrowUp,
  ArrowDown,
  UserPlus,
  Shield,
  Trash2,
  LayoutDashboard,
  Download,
  Upload,
  Trash,
} from "lucide-react";
import { useUserRole } from "@/lib/useUserRole";
import { useUsers } from "@/lib/hooks/useUsers";
import UserCreateModal from "@/components/settings/UserCreateModal";
import DashboardSelectModal from "@/components/ui/DashboardSelectModal";
import { successToast, errorToast } from "@/lib/toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useTranslation } from "@/components/i18n/LocaleProvider";

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
  const { t, locale } = useTranslation();

  const [creating, setCreating] = useState(false);
  const [dashboardModal, setDashboardModal] = useState<{
    userId: number;
    selected: string[];
    login: string;
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isSuper = role === "SuperAdmin";
  const isAdmin = role === "Admin";
  const canManageConfigs = isSuper || isAdmin;

  useEffect(() => {
    if (!roleLoading) loadAll();
  }, [roleLoading]);

  const handleDownloadConfig = async (file: string) => {
    try {
      const name = file.replace(/\.json$/i, "");
      const res = await fetch(`/api/dashboard/${encodeURIComponent(name)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch configuration");
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("download config error:", err);
      errorToast(err.message || t("settings.configs.downloadError"));
    }
  };

  const [confirmConfig, setConfirmConfig] = useState<{
    file: string;
    name: string;
  } | null>(null);

  const handleDeleteConfig = (file: string) => {
    const name = file.replace(/\.json$/i, "");
    setConfirmConfig({ file, name });
  };

  const performDeleteConfig = async () => {
    if (!confirmConfig) return;
    try {
      const res = await fetch(
        `/api/dashboard/${encodeURIComponent(confirmConfig.name)}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to delete configuration");
      }
      successToast(t("settings.configs.deleteSuccess"));
      await loadAll();
    } catch (err: any) {
      console.error("delete config error:", err);
      errorToast(err.message || t("settings.configs.deleteError"));
    } finally {
      setConfirmConfig(null);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportConfig = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setImporting(true);
      const text = await file.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("Failed to parse JSON");
      }
      if (!parsed?.name || !Array.isArray(parsed?.widgets)) {
        throw new Error("JSON must include name and widgets fields");
      }

      const widgetsPayload = Array.isArray(parsed.widgets) ? [...parsed.widgets] : [];

      if (
        parsed.report &&
        !widgetsPayload.some((widget: any) => widget && widget.type === "report")
      ) {
        const reportId = `report-${Date.now()}`;
        widgetsPayload.push({
          id: reportId,
          type: "report",
          title: parsed.report.title ?? t("widgets.report.defaultTitle"),
          layout: {
            i: reportId,
            x: 0,
            y: widgetsPayload.length * 12,
            w: 6,
            h: 12,
            minW: 3,
            minH: 6,
            maxW: 12,
            maxH: 18,
          },
          config: parsed.report,
        });
      }

      const res = await fetch("/api/save-dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: parsed.name,
          widgets: widgetsPayload,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to import configuration");
      }
      successToast(t("settings.configs.importSuccess"));
      await loadAll();
    } catch (err: any) {
      console.error("import config error:", err);
      errorToast(err.message || t("settings.configs.importError"));
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      { header: "ID", accessorKey: "id" },
      { header: t("settings.users.loginHeader"), accessorKey: "login" },
      {
        header: t("settings.users.roleHeader"),
        accessorKey: "role",
        cell: ({ row }) =>
          isSuper ? (
            <select
              value={row.original.role}
              onChange={(e) =>
                handleRoleChange(row.original.id, e.target.value)
              }
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
        header: t("settings.users.dashboardsHeader"),
        accessorKey: "dashboards",
        cell: ({ row }) => {
          const selected = row.original.dashboards || [];
          if (!(isSuper || isAdmin)) {
            return (
              <span className="text-gray-500 text-sm">
                {selected.join(", ") || "—"}
              </span>
            );
          }

          return (
            <button
              onClick={() =>
                setDashboardModal({
                  userId: row.original.id,
                  selected: Array.isArray(selected) ? [...selected] : [],
                  login: row.original.login,
                })
              }
              className="border border-gray-300 rounded px-2 py-1 text-sm w-full text-left bg-white hover:bg-gray-50"
            >
              {selected.length ? selected.join(", ") : t("settings.users.selectDashboards")}
            </button>
          );
        },
      },
      {
        header: t("settings.users.actionsHeader"),
        id: "actions",
        cell: ({ row }) =>
          isSuper ? (
            <button
              onClick={() => handleDelete(row.original.id)}
              className="flex items-center gap-1 px-2 py-1 border border-red-400 text-red-500 rounded text-sm hover:bg-red-50"
            >
              <Trash2 size={14} /> {t("common.delete")}
            </button>
          ) : (
            <span className="text-gray-400 text-sm">—</span>
          ),
      },
    ],
    [
      users,
      configs,
      isSuper,
      isAdmin,
      handleRoleChange,
      handleDashboardsChange,
      t,
    ],
  );

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (roleLoading || loading)
    return <div className="p-6 text-center">{t("common.loading")}</div>;

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex flex-1 mt-4 gap-4">
        {/* Sidebar */}
        <div className="relative">
          <div className="absolute top-0 left-1/4 w-0.5 h-full bg-gray-300 z-0" />
          <div className="absolute top-0 right-1/4 w-0.5 h-full bg-gray-300 z-0" />
          <aside className="sticky top-20 z-10 w-64 bg-white shadow-md rounded-lg p-4 flex flex-col gap-3 border h-fit">
            <h2 className="text-lg font-bold text-brand mb-1 flex items-center gap-2">
              <Shield size={18} /> {t("settings.sidebar.title")}
            </h2>
            {isSuper ? (
              <button
                onClick={() => setCreating(true)}
                className="flex items-center justify-left gap-2 px-3 py-2 border border-brand text-brand rounded hover:bg-brand hover:text-white transition"
              >
                <UserPlus size={16} /> {t("settings.sidebar.newUser")}
              </button>
            ) : (
              <p className="text-gray-500 text-sm">
                {t("settings.sidebar.onlySuperHint")}
              </p>
            )}
            <button
              type="button"
              onClick={handleImportClick}
              disabled={importing}
              className="flex items-center gap-2 px-3 py-2 border border-brand text-brand rounded hover:bg-brand hover:text-white transition disabled:opacity-60"
            >
              <Upload size={16} />{" "}
              {importing ? t("settings.sidebar.importing") : t("settings.sidebar.importButton")}
            </button>
          </aside>
        </div>

        {/* Main content */}
        <main className="flex-1 flex flex-col gap-6">
          {canManageConfigs && (
            <section className="bg-white shadow-md rounded-lg p-4 border">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-xl font-semibold text-brand flex items-center gap-2">
                  <LayoutDashboard size={18} /> {t("settings.configs.title")}
                </h2>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleImportConfig}
              />
              {configs.length === 0 ? (
                <p className="text-sm text-gray-500">
                  {t("settings.configs.empty")}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left">{t("settings.configs.nameHeader")}</th>
                        <th className="px-3 py-2 text-left">{t("settings.configs.fileHeader")}</th>
                        <th className="px-3 py-2 text-left">{t("settings.configs.updatedHeader")}</th>
                        <th className="px-3 py-2 text-left">{t("settings.configs.actionsHeader")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {configs.map((cfg) => (
                        <tr
                          key={cfg.file}
                          className="border-t border-gray-100 hover:bg-gray-50 transition"
                        >
                          <td className="px-3 py-2">{cfg.name}</td>
                          <td className="px-3 py-2">{cfg.file}</td>
                          <td className="px-3 py-2">
                            {cfg.createdAt
                              ? new Date(cfg.createdAt).toLocaleString(locale)
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleDownloadConfig(cfg.file)}
                                className="flex items-center gap-1 px-2 py-1 border rounded text-sm hover:bg-gray-100"
                              >
                                <Download size={14} /> {t("settings.configs.download")}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteConfig(cfg.file)}
                                className="flex items-center gap-1 px-2 py-1 border border-red-400 text-red-500 rounded text-sm hover:bg-red-50"
                              >
                                <Trash size={14} /> {t("common.delete")}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          <section className="bg-white shadow-md rounded-lg p-4 border flex-1">
            <h2 className="text-xl font-semibold text-brand mb-4 flex items-center gap-2">
              <LayoutDashboard size={18} /> {t("settings.users.title")}
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
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
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
                    <tr
                      key={row.id}
                      className="border-t border-gray-100 hover:bg-gray-50 transition"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-3 py-2">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="text-center py-4 text-gray-500"
                      >
                        {t("settings.users.empty")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      <ConfirmModal
        isOpen={Boolean(confirmConfig)}
        title={t("settings.configs.confirmDeleteTitle")}
        description={
          confirmConfig
            ? t("settings.configs.confirmDeleteDescription", { name: confirmConfig.name })
            : undefined
        }
        confirmText={t("common.delete")}
        cancelText={t("common.cancel")}
        onConfirm={performDeleteConfig}
        onCancel={() => setConfirmConfig(null)}
      />

      <DashboardSelectModal
        isOpen={Boolean(dashboardModal)}
        login={dashboardModal?.login ?? ""}
        configs={configs.map((cfg) => ({
          name: cfg.name,
          file: cfg.file,
          createdAt: cfg.createdAt ?? "",
        }))}
        selected={dashboardModal?.selected ?? []}
        onClose={() => setDashboardModal(null)}
        onSubmit={async (updated) => {
          if (!dashboardModal) return;
          const userId = dashboardModal.userId;
          await handleDashboardsChange(userId, updated);
          setDashboardModal(null);
        }}
      />

      <UserCreateModal
        isOpen={creating}
        onClose={() => setCreating(false)}
        onCreate={handleCreateUser}
      />
    </div>
  );
}
