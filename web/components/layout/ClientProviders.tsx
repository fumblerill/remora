"use client";

import { Locale } from "@/lib/i18n/dictionaries";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { Toaster } from "sonner";

export default function ClientProviders({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
}) {
  return (
    <LocaleProvider initialLocale={initialLocale}>
      {children}
      <Toaster position="bottom-right" />
    </LocaleProvider>
  );
}
