import path from "path";
import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import type { NextConfig } from "next";

// Загружаем и расширяем .env (поддержка ${VAR})
const envPath = path.resolve(__dirname, "../.env");
const envConfig = dotenv.config({ path: envPath });
dotenvExpand.expand(envConfig);

const INTERNAL_API_URL = process.env.INTERNAL_API_URL;
const INTERNAL_DEFAULT = "http://127.0.0.1:8080";

if (!INTERNAL_API_URL) {
  console.warn(
    "⚠️ INTERNAL_API_URL is not set. API requests will not be proxied in production."
  );
}

function withInternal(path: string) {
  const base = INTERNAL_API_URL ?? INTERNAL_DEFAULT;
  return `${base.replace(/\/$/, "")}${path}`;
}

const backendRewrites =
  INTERNAL_API_URL || process.env.NODE_ENV !== "production"
    ? [
        {
          source: "/api/upload",
          destination: withInternal("/api/upload"),
        },
        {
          source: "/api/setup",
          destination: withInternal("/api/setup"),
        },
        {
          source: "/api/setup/status",
          destination: withInternal("/api/setup/status"),
        },
        {
          source: "/api/login",
          destination: withInternal("/api/login"),
        },
        {
          source: "/api/export-table",
          destination: withInternal("/api/export-table"),
        },
        {
          source: "/api/logout",
          destination: withInternal("/api/logout"),
        },
        {
          source: "/api/me",
          destination: withInternal("/api/me"),
        },
        {
          source: "/api/users/:path*",
          destination: withInternal("/api/users/:path*"),
        },
      ]
    : [];

const nextConfig: NextConfig = {
  env: {
    JWT_SECRET: process.env.JWT_SECRET,
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
  },
  reactStrictMode: true,
  async rewrites() {
    return backendRewrites;
  },
  experimental: {
    proxyClientMaxBodySize: '50mb',
  },
};

export default nextConfig;
