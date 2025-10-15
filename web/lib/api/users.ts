"use client";

import { successToast, errorToast } from "@/lib/toast";
import { getApiUrl } from "@/lib/env";

const API = getApiUrl(); // 🌍 Универсальный API URL

// 🧩 Универсальный fetch с перехватом 401
async function apiFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    credentials: "include",
    ...options,
  });

  if (res.status === 401) {
    console.warn("401 Unauthorized — редирект на /login");
    window.location.href = "/login";
    return Promise.reject("Unauthorized");
  }

  return res;
}

// 🔄 Получить всех пользователей
export async function fetchUsers(): Promise<any[]> {
  try {
    const res = await apiFetch(`${API}/api/users/list`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Ошибка загрузки пользователей");
    return data.users;
  } catch (err) {
    console.error("fetchUsers error:", err);
    errorToast("Ошибка соединения с сервером");
    return [];
  }
}

// 🧩 Получить список доступных дашбордов
export async function fetchConfigs(): Promise<any[]> {
  try {
    const res = await fetch("/configs/configs.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Не удалось загрузить конфиги");
    return await res.json();
  } catch (err) {
    console.error("fetchConfigs error:", err);
    errorToast("Ошибка загрузки списка дашбордов");
    return [];
  }
}

// ➕ Создать пользователя
export async function createUser(login: string, password: string, role: string) {
  try {
    const res = await apiFetch(`${API}/api/users/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password, role }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    successToast("Пользователь создан");
    return true;
  } catch (err) {
    console.error("createUser error:", err);
    errorToast("Ошибка при создании пользователя");
    return false;
  }
}

// 🔁 Изменить роль
export async function updateRole(id: number, role: string) {
  try {
    const res = await apiFetch(`${API}/api/users/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    successToast("Роль обновлена");
    return true;
  } catch (err) {
    console.error("updateRole error:", err);
    errorToast("Ошибка обновления роли");
    return false;
  }
}

// 🧩 Обновить дашборды
export async function updateDashboards(id: number, dashboards: string[]) {
  try {
    const res = await apiFetch(`${API}/api/users/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, dashboards: JSON.stringify(dashboards) }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    successToast("Дашборды обновлены");
    return true;
  } catch (err) {
    console.error("updateDashboards error:", err);
    errorToast("Ошибка обновления дашбордов");
    return false;
  }
}

// 🗑️ Удалить пользователя
export async function deleteUser(id: number) {
  try {
    const res = await apiFetch(`${API}/api/users/delete/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    successToast("Пользователь удалён");
    return true;
  } catch (err) {
    console.error("deleteUser error:", err);
    errorToast("Ошибка удаления пользователя");
    return false;
  }
}
