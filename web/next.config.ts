import path from "path";
import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import type { NextConfig } from "next";

// Загружаем и расширяем .env (чтобы поддерживались ссылки вида ${FRONT_PORT})
const envPath = path.resolve(__dirname, "../.env");
const envConfig = dotenv.config({ path: envPath });
dotenvExpand.expand(envConfig);

const nextConfig: NextConfig = {
  env: {
    RUST_PORT: process.env.RUST_PORT,
    FRONT_PORT: process.env.FRONT_PORT,
    JWT_SECRET: process.env.JWT_SECRET,
  },
  reactStrictMode: true,
};

export default nextConfig;
