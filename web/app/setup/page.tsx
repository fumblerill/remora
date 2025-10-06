"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    // 🔎 Проверяем, инициализирована ли система
    (async () => {
      try {
        const res = await fetch("http://127.0.0.1:8080/api/setup/status", {
          method: "POST",
        });
        const data = await res.json();
        if (data.initialized) {
          console.log("System already initialized → redirect");
          router.push("/login"); // можно заменить на "/" если хочешь
        }
      } catch (err) {
        console.error("Status check failed:", err);
      }
    })();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    const res = await fetch(`${API}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ login, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setStatus("SuperAdmin created!");
      setTimeout(() => router.push("/"), 700);
    } else {
      setStatus(data.error || "Error");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-2xl font-bold">Initial setup</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-64">
        <input
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          placeholder="Login"
          className="border p-2 rounded"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Password"
          className="border p-2 rounded"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create SuperAdmin"}
        </button>
      </form>
      {status && <p>{status}</p>}
    </div>
  );
}
