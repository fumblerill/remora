import type { NextConfig } from "next";
import path from "path";
import dotenv from "dotenv";

// Загружаем общий .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    PROD_API_URL: process.env.PROD_API_URL,
    JWT_SECRET: process.env.JWT_SECRET,
  },
};

export default nextConfig;
