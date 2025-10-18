"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useUserRole } from "@/lib/useUserRole";
import { useState } from "react";
import { useTranslation } from "@/components/i18n/LocaleProvider";
import LocaleSwitcher from "@/components/i18n/LocaleSwitcher";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, loading, refresh } = useUserRole();
  const [logoutLoading, setLogoutLoading] = useState(false);
  const { t } = useTranslation();

  let sectionName = t("header.sections.home");
  if (pathname.startsWith("/admin")) sectionName = t("header.sections.admin");
  if (pathname.startsWith("/login")) sectionName = t("header.sections.login");
  if (pathname.startsWith("/configurator")) sectionName = t("header.sections.configurator");
  if (pathname.startsWith("/settings")) sectionName = t("header.sections.settings");

  const isAdmin = role === "Admin" || role === "SuperAdmin";

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      const res = await fetch(`/api/logout`, {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        await refresh();
        router.push("/login");
      } else {
        console.error("Logout error:", await res.text());
      }
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setLogoutLoading(false);
    }
  };

  // 🔒 Если не авторизован или в процессе загрузки — не показываем шапку
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
        <LocaleSwitcher />
        {isAdmin && (
          <>
            <Link
              href="/settings"
              className="border border-white text-white px-3 py-1.5 rounded-lg hover:bg-white/20 transition"
            >
              {t("header.links.settings")}
            </Link>
            <Link
              href="/configurator"
              className="border border-white text-white px-3 py-1.5 rounded-lg hover:bg-white/20 transition"
            >
              {t("header.links.configurator")}
            </Link>
          </>
        )}

        <button
          onClick={handleLogout}
          disabled={logoutLoading}
          className="border border-white text-white px-3 py-1.5 rounded-lg hover:bg-white/20 transition disabled:opacity-60"
        >
          {logoutLoading ? t("header.logout.loading") : t("header.logout.default")}
        </button>
      </div>
    </header>
  );
}
