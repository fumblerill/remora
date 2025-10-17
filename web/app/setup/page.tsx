"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
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
        setStatus("✅ SuperAdmin создан успешно");
        setTimeout(() => router.push("/login"), 700);
      } else {
        setStatus(data.error || "Ошибка инициализации");
      }
    } catch (err) {
      console.error("Setup failed:", err);
      setStatus("Ошибка соединения с сервером");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-brand">
          Первичная настройка Remora
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="Логин"
            className="border px-3 py-2 rounded focus:ring-2 focus:ring-brand outline-none"
            autoFocus
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Пароль"
            className="border px-3 py-2 rounded focus:ring-2 focus:ring-brand outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-brand text-white py-2 rounded-lg hover:bg-brand/90 transition disabled:opacity-60"
          >
            {loading ? "Создаём..." : "Создать SuperAdmin"}
          </button>
        </form>

        {status && (
          <p
            className={`mt-4 text-center text-sm ${
              status.includes("Ошибка") ? "text-red-500" : "text-gray-600"
            }`}
          >
            {status}
          </p>
        )}
      </div>
    </div>
  );
}
