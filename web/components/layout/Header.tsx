"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

type HeaderProps = {
  isAdmin?: boolean;
  onLogout?: () => void;
};

export default function Header({ isAdmin = true, onLogout }: HeaderProps) {
  const pathname = usePathname();

  let sectionName = "Главная";
  if (pathname.startsWith("/admin")) sectionName = "Админ-панель";
  if (pathname.startsWith("/login")) sectionName = "Авторизация";
  if (pathname.startsWith("/configurator")) sectionName = "Конфигуратор";
  if (pathname.startsWith("/settings")) sectionName = "Настройки";

  return (
    <header className="flex items-center justify-between bg-brand px-6 py-4 shadow-sm rounded-lg">
      {/* Левая часть */}
      <div className="flex items-center gap-6">
        <h1 className="text-lg font-bold text-white">
          <a href="/">Remora</a>{" "}
          <span className="font-normal">| {sectionName}</span>
        </h1>
      </div>

      {/* Правая часть */}
      {pathname !== "/login" && (
        <div className="flex items-center gap-3">
          {isAdmin && (
            <>
              <Link
                href="/settings"
                className="border border-white text-white px-3 py-1.5 rounded-lg hover:bg-white/20"
              >
                Настройки
              </Link>
              <Link
                href="/configurator"
                className="border border-white text-white px-3 py-1.5 rounded-lg hover:bg-white/20"
              >
                Конфигуратор
              </Link>
            </>
          )}
          <button
            onClick={onLogout}
            className="border border-white text-white px-3 py-1.5 rounded-lg hover:bg-white/20"
          >
            Выйти
          </button>
        </div>
      )}
    </header>
  );
}
