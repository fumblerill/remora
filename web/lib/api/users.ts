"use client";

import { successToast, errorToast } from "@/lib/toast";
// 🧩 Универсальный fetch с перехватом 401
async function apiFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    credentials: "include",
    ...options,
  });

  if (res.status === 401) {
    console.warn("401 Unauthorized — redirecting to /login");
    window.location.href = "/login";
    return Promise.reject("Unauthorized");
  }

  return res;
}

// 🔄 Получить всех пользователей
export async function fetchUsers(): Promise<any[]> {
  try {
    const res = await apiFetch(`/api/users/list`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load users");
    return data.users;
  } catch (err) {
    console.error("fetchUsers error:", err);
    errorToast("Server connection error");
    return [];
  }
}

// 🧩 Получить список доступных дашбордов
export async function fetchConfigs(): Promise<any[]> {
  try {
    const res = await fetch("/api/list-dashboards", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load dashboards");
    const data = await res.json();
    return data.configs ?? [];
  } catch (err) {
    console.error("fetchConfigs error:", err);
    errorToast("Failed to load dashboard list");
    return [];
  }
}

// ➕ Создать пользователя
export async function createUser(login: string, password: string, role: string) {
  try {
    const res = await apiFetch(`/api/users/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password, role }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    successToast("User created");
    return true;
  } catch (err) {
    console.error("createUser error:", err);
    errorToast("Failed to create user");
    return false;
  }
}

// 🔁 Изменить роль
export async function updateRole(id: number, role: string) {
  try {
    const res = await apiFetch(`/api/users/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    successToast("Role updated");
    return true;
  } catch (err) {
    console.error("updateRole error:", err);
    errorToast("Failed to update role");
    return false;
  }
}

// 🧩 Обновить дашборды
export async function updateDashboards(id: number, dashboards: string[]) {
  try {
    const res = await apiFetch(`/api/users/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, dashboards: JSON.stringify(dashboards) }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    successToast("Dashboards updated");
    return true;
  } catch (err) {
    console.error("updateDashboards error:", err);
    errorToast("Failed to update dashboards");
    return false;
  }
}

// 🗑️ Удалить пользователя
export async function deleteUser(id: number) {
  try {
    const res = await apiFetch(`/api/users/delete/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    successToast("User deleted");
    return true;
  } catch (err) {
    console.error("deleteUser error:", err);
    errorToast("Failed to delete user");
    return false;
  }
}
