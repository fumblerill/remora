// ✅ Централизованное управление переменными окружения Remora

const FRONT_PORT = process.env.FRONT_PORT || "3000";
const RUST_PORT = process.env.RUST_PORT || "8080";
const BASE_HOST = "http://localhost";

/**
 * 🌍 URL Rust-бэкенда
 */
export function getApiUrl(): string {
  return `${BASE_HOST}:${RUST_PORT}`;
}

/**
 * 🌐 Origin фронтенда (для логов и CORS)
 */
export function getFrontendOrigin(): string {
  return `${BASE_HOST}:${FRONT_PORT}`;
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
});
