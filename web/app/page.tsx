"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Link from "next/link";

interface DashboardConfig {
  name: string;
  file: string;
  createdAt: string;
}

export default function HomePage() {
  const [configs, setConfigs] = useState<DashboardConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConfigs() {
      try {
        const res = await fetch("/configs/configs.json", { cache: "no-store" });
        if (!res.ok) throw new Error("Не удалось загрузить список конфигураций");
        const data = await res.json();
        setConfigs(data);
      } catch (err) {
        console.error("Ошибка при загрузке configs.json:", err);
      } finally {
        setLoading(false);
      }
    }
    loadConfigs();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-6">Доступные дашборды</h1>

        {loading ? (
          <p className="text-gray-500">Загрузка...</p>
        ) : configs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {configs.map((cfg) => (
              <div
                key={cfg.file}
                className="bg-white border shadow-sm rounded-lg p-4 flex flex-col justify-between hover:shadow-md transition"
              >
                <div>
                  <h2 className="text-lg font-semibold text-brand mb-1">{cfg.name}</h2>
                  <p className="text-sm text-gray-500">Обновлён: {new Date(cfg.createdAt).toLocaleString()}</p>
                </div>
                <Link
                  href={`/viewer/${encodeURIComponent(cfg.file.replace(".json", ""))}`}
                  className="mt-4 inline-block text-center px-3 py-2 bg-brand text-white rounded hover:bg-brand/90 transition"
                >
                  Открыть
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center mt-6">
            Пока нет доступных конфигураций.
          </p>
        )}
      </main>
    </div>
  );
}
