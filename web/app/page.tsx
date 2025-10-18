"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Link from "next/link";
import { useTranslation } from "@/components/i18n/LocaleProvider";

interface DashboardConfig {
  name: string;
  file: string;
  createdAt: string;
}

interface UserData {
  id?: number;
  login?: string;
  role?: string;
  dashboards?: string[];
}

export default function HomePage() {
  const [configs, setConfigs] = useState<DashboardConfig[]>([]);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const { t, locale } = useTranslation();

  useEffect(() => {
    async function loadData() {
      try {
        // 1️⃣ Получаем текущего пользователя
        const meRes = await fetch(`/api/me`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (!meRes.ok) throw new Error("Unauthorized");
        const meData: UserData = await meRes.json();
        setUser(meData);

        // 2️⃣ Загружаем список всех конфигов
        const cfgRes = await fetch("/api/list-dashboards", { cache: "no-store" });
        if (!cfgRes.ok) throw new Error("Failed to load dashboards");
        const cfgData = await cfgRes.json();
        const allConfigs: DashboardConfig[] = cfgData.configs || [];

        // 3️⃣ Фильтруем только выданные пользователю
        const allowed = Array.isArray(meData.dashboards) ? meData.dashboards : [];
        const filtered =
          allowed.length > 0
            ? allConfigs.filter((cfg) => allowed.includes(cfg.name))
            : [];

        setConfigs(filtered);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-6">{t("home.title")}</h1>

        {loading ? (
          <p className="text-gray-500">{t("common.loading")}</p>
        ) : !user ? (
          <p className="text-red-500">{t("home.unauthorized")}</p>
        ) : configs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {configs.map((cfg) => (
              <div
                key={cfg.file}
                className="bg-white border shadow-sm rounded-lg p-4 flex flex-col justify-between hover:shadow-md transition"
              >
                <div>
                  <h2 className="text-lg font-semibold text-brand mb-1">{cfg.name}</h2>
                  <p className="text-sm text-gray-500">
                    {t("home.updated", { date: new Date(cfg.createdAt).toLocaleString(locale) })}
                  </p>
                </div>
                <Link
                  href={`/viewer/${encodeURIComponent(cfg.file.replace(".json", ""))}`}
                  className="mt-4 inline-block text-center px-3 py-2 bg-brand text-white rounded hover:bg-brand/90 transition"
                >
                  {t("home.openButton")}
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center mt-6">
            {t("home.empty")}
          </p>
        )}
      </main>
    </div>
  );
}
