"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "@/components/i18n/LocaleProvider";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation();

  // Когда компонент смонтировался на клиенте → можно показывать UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Заглушка во время гидратации
    return (
      <div className="flex h-screen w-full items-center justify-center text-gray-500">
        {t("layout.loading")}
      </div>
    );
  }

  // Если это /login → без header
  if (pathname === "/login") {
    return <main className="flex-1 flex items-center justify-center">{children}</main>;
  }

  // Иначе — обычный layout с header
  return (
    <>
      <main className="flex-1 p-6 overflow-y-auto">{children}</main>
    </>
  );
}
