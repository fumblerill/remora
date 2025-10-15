// ✅ Централизованное управление переменными окружения Remora

const FRONT_PORT =
  process.env.NEXT_PUBLIC_FRONT_PORT || process.env.FRONT_PORT || "3000";
const RUST_PORT =
  process.env.NEXT_PUBLIC_RUST_PORT || process.env.RUST_PORT || "8080";

const DEFAULT_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.BASE_URL ||
  "http://localhost";

const API_URL_OVERRIDE =
  process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "";

const FRONTEND_ORIGIN_OVERRIDE =
  process.env.NEXT_PUBLIC_FRONTEND_ORIGIN ||
  process.env.FRONTEND_ORIGIN ||
  "";

function appendPort(origin: string, port: string): string {
  if (!port || port === "0") {
    return origin;
  }

  // Если хост уже содержит порт (например, https://example.com:3000) — оставляем как есть
  if (/:[0-9]+$/.test(origin)) {
    return origin;
  }

  return `${origin}:${port}`;
}

/**
 * 🌍 URL Rust-бэкенда
 */
export function getApiUrl(): string {
  if (API_URL_OVERRIDE) {
    return API_URL_OVERRIDE;
  }

  return appendPort(DEFAULT_BASE_URL, RUST_PORT);
}

/**
 * 🌐 Origin фронтенда (для логов и CORS)
 */
export function getFrontendOrigin(): string {
  if (FRONTEND_ORIGIN_OVERRIDE) {
    return FRONTEND_ORIGIN_OVERRIDE;
  }

  return appendPort(DEFAULT_BASE_URL, FRONT_PORT);
}

/**
 * 🔐 JWT-секрет
 */
export function getJwtSecret(): string {
  return process.env.JWT_SECRET || "dev_secret";
}

/**
 * 🧩 Лог окружения при старте
 */
console.log("🧩 Remora env summary →", {
  NODE_ENV: process.env.NODE_ENV,
  FRONT_PORT,
  RUST_PORT,
  API_URL: getApiUrl(),
  FRONTEND_ORIGIN: getFrontendOrigin(),
  BASE_URL: DEFAULT_BASE_URL,
});
