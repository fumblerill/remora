// ✅ Централизованное управление переменными окружения Remora
// Работает стабильно в dev, Docker и production.

const DEV =
  process.env.DEV === "true" ||
  process.env.NODE_ENV !== "production";

/**
 * 🌍 Возвращает актуальный URL Rust-бэкенда.
 * Даже если кто-то случайно оставил NEXT_PUBLIC_API_URL в .env,
 * в DEV-режиме всегда возвращается localhost.
 */
export function getApiUrl(): string {
  const envApi = process.env.NEXT_PUBLIC_API_URL;

  if (DEV) {
    // всегда localhost в dev
    return "http://localhost:8080";
  }

  if (envApi && envApi !== "") {
    return envApi;
  }

  // fallback для Docker / production
  return "http://remora_backend:8080";
}

/**
 * 🔐 Возвращает секрет JWT (используется middleware и серверными частями).
 */
export function getJwtSecret(): string {
  return (
    process.env.JWT_SECRET ||
    process.env.NEXT_PUBLIC_JWT_SECRET ||
    "dev_secret"
  );
}

/**
 * 🚀 Возвращает true, если приложение в dev-режиме.
 */
export function isDev(): boolean {
  return DEV;
}

/**
 * 🌐 Возвращает базовый frontend-origin (для CORS и логов).
 */
export function getFrontendOrigin(): string {
  const envOrigin = process.env.FRONTEND_ORIGIN;

  if (envOrigin && envOrigin !== "") {
    return envOrigin;
  }

  return DEV ? "http://localhost:3000" : "http://remora_web:3000";
}

/**
 * 🧩 Выводим сводку окружения при старте фронта (в dev только один раз).
 */
if (DEV) {
  console.log("🧩 Remora env summary →", {
    DEV,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    resolvedApi: getApiUrl(),
    frontend: getFrontendOrigin(),
  });
}
