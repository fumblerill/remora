"use client";

import { useState, useCallback } from "react";
import {
  fetchUsers,
  fetchConfigs,
  createUser,
  deleteUser,
  updateRole,
  updateDashboards,
} from "@/lib/api/users";

interface Dashboard {
  name: string;
  file: string;
}

interface User {
  id: number;
  login: string;
  role: string;
  dashboards: string[];
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [configs, setConfigs] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [u, c] = await Promise.all([fetchUsers(), fetchConfigs()]);
    setUsers(u);
    setConfigs(c);
    setLoading(false);
  }, []);

  const handleCreateUser = useCallback(
    async (login: string, password: string, role: string) => {
      const ok = await createUser(login, password, role);
      if (ok) await loadAll();
    },
    [loadAll]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      const ok = await deleteUser(id);
      if (ok) await loadAll();
    },
    [loadAll]
  );

  const handleRoleChange = useCallback(
    async (id: number, role: string) => {
      const ok = await updateRole(id, role);
      if (ok) await loadAll();
    },
    [loadAll]
  );

  const handleDashboardsChange = useCallback(
    async (id: number, dashboards: string[]) => {
      const ok = await updateDashboards(id, dashboards);
      if (ok) await loadAll();
    },
    [loadAll]
  );

  return {
    users,
    configs,
    loading,
    loadAll,
    handleCreateUser,
    handleDelete,
    handleRoleChange,
    handleDashboardsChange,
  };
}
