"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // Когда компонент смонтировался на клиенте → можно показывать UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Заглушка во время гидратации
    return (
      <div className="flex h-screen w-full items-center justify-center text-gray-500">
        Загрузка...
      </div>
    );
  }

  // Если это /login → без Sidebar
  if (pathname === "/login") {
    return <main className="flex-1 flex items-center justify-center">{children}</main>;
  }

  // Иначе — обычный layout с Sidebar
  return (
    <>
      <main className="flex-1 p-6 overflow-y-auto">{children}</main>
    </>
  );
}
