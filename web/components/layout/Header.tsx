"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import FileUploadModal from "@/components/ui/FileUploadModal";

type HeaderProps = {
  isAdmin?: boolean;
  onLogout?: () => void;
  onUploadComplete?: (data: any) => void;
};

export default function Header({
  isAdmin = true,
  onLogout,
  onUploadComplete,
}: HeaderProps) {
  const pathname = usePathname();
  const [isModalOpen, setModalOpen] = useState(false);

  let sectionName = "Главная";
  if (pathname.startsWith("/admin")) sectionName = "Админ-панель";
  if (pathname.startsWith("/login")) sectionName = "Авторизация";
  if (pathname.startsWith("/configurator")) sectionName = "Конфигуратор";
  if (pathname.startsWith("/settings")) sectionName = "Настройки";

  return (
    <>
      <header className="flex items-center justify-between bg-brand px-6 py-4 shadow-sm rounded-lg">
        {/* Левая часть */}
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-bold text-white">
            Remora <span className="font-normal">| {sectionName}</span>
          </h1>

          {pathname !== "/login" && (
            <button
              onClick={() => setModalOpen(true)}
              className="bg-white text-brand px-4 py-2 rounded-lg hover:bg-gray-100 transition"
            >
              Загрузить файл
            </button>
          )}
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

      {/* Модалка */}
      <FileUploadModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onUploadComplete={onUploadComplete}
      />
    </>
  );
}
