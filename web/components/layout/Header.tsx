"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useUserRole } from "@/lib/useUserRole";
import { useState } from "react";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, loading, refresh } = useUserRole();
  const [logoutLoading, setLogoutLoading] = useState(false);

  let sectionName = "Главная";
  if (pathname.startsWith("/admin")) sectionName = "Админ-панель";
  if (pathname.startsWith("/login")) sectionName = "Авторизация";
  if (pathname.startsWith("/configurator")) sectionName = "Конфигуратор";
  if (pathname.startsWith("/settings")) sectionName = "Настройки";

  const isAdmin = role === "Admin" || role === "SuperAdmin";

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/logout`, {
        method: "POST",
        credentials: "include",
      });
      setLogoutLoading(false);
      if (res.ok) {
        await refresh();
        router.push("/login");
      }
    } catch (err) {
      console.error("Logout failed:", err);
      setLogoutLoading(false);
    }
  };

  // 🔒 если не авторизован — не показываем приватные кнопки
  if (pathname === "/login" || loading) {
    return null;
  }

  return (
    <header className="flex items-center justify-between bg-brand px-6 py-4 shadow-sm rounded-lg">
      <div className="flex items-center gap-6">
        <h1 className="text-lg font-bold text-white">
          <Link href="/">Remora</Link>{" "}
          <span className="font-normal">| {sectionName}</span>
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {isAdmin && (
          <>
            <Link
              href="/settings"
              className="border border-white text-white px-3 py-1.5 rounded-lg hover:bg-white/20 transition"
            >
              Настройки
            </Link>
            <Link
              href="/configurator"
              className="border border-white text-white px-3 py-1.5 rounded-lg hover:bg-white/20 transition"
            >
              Конфигуратор
            </Link>
          </>
        )}
        <button
          onClick={handleLogout}
          disabled={logoutLoading}
          className="border border-white text-white px-3 py-1.5 rounded-lg hover:bg-white/20 transition disabled:opacity-60"
        >
          {logoutLoading ? "Выходим..." : "Выйти"}
        </button>
      </div>
    </header>
  );
}
