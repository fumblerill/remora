"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/i18n/LocaleProvider";

type StatusState = {
  message: string;
  tone: "success" | "error";
} | null;

export default function SetupPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<StatusState>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch(`/api/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        setStatus({ message: t("setup.status.success"), tone: "success" });
        setTimeout(() => router.push("/login"), 700);
      } else {
        setStatus({
          message: data.error || t("setup.status.failure"),
          tone: "error",
        });
      }
    } catch (err) {
      console.error("Setup failed:", err);
      setStatus({ message: t("setup.status.connection"), tone: "error" });
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-brand">
          {t("setup.title")}
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder={t("setup.loginPlaceholder")}
            className="border px-3 py-2 rounded focus:ring-2 focus:ring-brand outline-none"
            autoFocus
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder={t("setup.passwordPlaceholder")}
            className="border px-3 py-2 rounded focus:ring-2 focus:ring-brand outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-brand text-white py-2 rounded-lg hover:bg-brand/90 transition disabled:opacity-60"
          >
            {loading ? t("setup.submitLoading") : t("setup.submitIdle")}
          </button>
        </form>

        {status && (
          <p
            className={`mt-4 text-center text-sm ${
              status.tone === "error" ? "text-red-500" : "text-gray-600"
            }`}
          >
            {status.message}
          </p>
        )}
      </div>
    </div>
  );
}
