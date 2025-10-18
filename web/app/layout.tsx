import "./globals.css";
import { cookies } from "next/headers";
import LayoutWrapper from "../components/layout/LayoutWrapper";
import ClientProviders from "../components/layout/ClientProviders";
import { DEFAULT_LOCALE, Locale, isLocale } from "@/lib/i18n/dictionaries";
import Footer from "@/components/layout/Footer";

export const metadata = {
  title: "Remora",
  description: "Self-hosted pivot table generator",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("remora_locale")?.value;
  const initialLocale: Locale = isLocale(cookieLocale) ? (cookieLocale as Locale) : DEFAULT_LOCALE;

  return (
    <html lang={initialLocale}>
      <body className="flex h-screen bg-gray-50 text-gray-900 overflow-x-hidden">
        <ClientProviders initialLocale={initialLocale}>
          <LayoutWrapper>{children}</LayoutWrapper>
        </ClientProviders>
      </body>
    </html>
  );
}
