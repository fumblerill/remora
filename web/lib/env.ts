// ✅ Централизованное управление переменными окружения Remora

const DEFAULT_FRONT_PORT = "3000";
const DEFAULT_RUST_PORT = "8080";

const DEFAULT_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.BASE_URL ||
  "http://localhost";

const API_URL_OVERRIDE =
  process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "";

const API_BASE_PATH =
  process.env.NEXT_PUBLIC_API_BASE && process.env.NEXT_PUBLIC_API_BASE.trim().length > 0
    ? process.env.NEXT_PUBLIC_API_BASE
    : "";

const INTERNAL_API_URL =
  process.env.INTERNAL_API_URL ||
  process.env.API_URL ||
  `http://127.0.0.1:${DEFAULT_RUST_PORT}`;

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
export function getApiUrl(options: { internal?: boolean } = {}): string {
  if (options.internal) {
    return INTERNAL_API_URL;
  }

  if (API_URL_OVERRIDE) {
    return API_URL_OVERRIDE;
  }

  if (process.env.NEXT_PUBLIC_API_BASE) {
    return process.env.NEXT_PUBLIC_API_BASE;
  }

  return API_BASE_PATH;
}

/**
 * 🌐 Origin фронтенда (для логов и CORS)
 */
export function getFrontendOrigin(): string {
  if (FRONTEND_ORIGIN_OVERRIDE) {
    return FRONTEND_ORIGIN_OVERRIDE;
  }

  return appendPort(DEFAULT_BASE_URL, DEFAULT_FRONT_PORT);
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
  API_URL: getApiUrl(),
  INTERNAL_API_URL: getApiUrl({ internal: true }),
  FRONTEND_ORIGIN: getFrontendOrigin(),
  BASE_URL: DEFAULT_BASE_URL,
});
