"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Footer from "@/components/layout/Footer";

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 🔎 Проверяем, есть ли токен в cookie
  useEffect(() => {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("remora_token="));
    if (token) {
      console.log("🔐 Already logged in → redirect");
      router.push("/");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch(`/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ login, password }),
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        setStatus("Вход выполнен");
        setTimeout(() => router.push("/"), 600);
      } else {
        setStatus(data.error || "Неверный логин или пароль");
      }
    } catch (err) {
      console.error("Login failed:", err);
      setStatus("Ошибка соединения с сервером");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <main className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h2 className="text-2xl font-bold text-brand mb-6 text-center">Вход в Remora</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="Логин"
            className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-brand"
            autoFocus
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
            className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-brand"
          />

          <button
            type="submit"
            disabled={loading}
            className="bg-brand text-white py-2 rounded-lg hover:bg-brand/90 transition disabled:opacity-60"
          >
            {loading ? "Входим..." : "Войти"}
          </button>
        </form>

        {status && (
          <p
            className={`mt-4 text-center text-sm ${
              status.includes("Ошибка") || status.includes("Неверный")
                ? "text-red-500"
                : "text-gray-600"
            }`}
          >
            {status}
          </p>
        )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
