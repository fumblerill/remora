"use client";

import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r flex flex-col p-6">
      {/* Заголовок Remora + версия */}
      <div>
        <h1 className="text-2xl font-bold text-brand flex items-baseline gap-2">
          Remora
          <span className="text-sm text-gray-400 font-normal">v1.1</span>
        </h1>

        {/* Кнопка загрузки */}
        <button className="mt-4 w-full bg-brand text-white py-2 px-4 rounded-lg hover:bg-brand/90 transition">
          Загрузить файл
        </button>
      </div>

      {/* Навигация */}
      <nav className="flex flex-col gap-3 mt-8">
        <Link href="/" className="text-gray-700 hover:text-black">
          Конфиги
        </Link>
        <Link href="/admin" className="text-gray-700 hover:text-black">
          Админ
        </Link>
        <Link href="/login" className="text-gray-700 hover:text-black">
          Логин
        </Link>
      </nav>
    </aside>
  );
}
