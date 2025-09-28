import "./globals.css";
import LayoutWrapper from "../components/layout/LayoutWrapper";
import ClientProviders from "../components/layout/ClientProviders";

export const metadata = {
  title: "Remora",
  description: "Self-hosted pivot table generator",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="flex h-screen bg-gray-50 text-gray-900 overflow-x-hidden">
        <LayoutWrapper>
          <ClientProviders>{children}</ClientProviders>
        </LayoutWrapper>
      </body>
    </html>
  );
}
