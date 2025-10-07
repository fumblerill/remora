"use client";

import { useEffect, useState, useCallback } from "react";
import { getApiUrl } from "@/lib/env"; // ✅ единая точка для API URL

export function useUserRole() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const API = getApiUrl(); // 🌍 определяем API адрес

  const fetchRole = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/me`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        setRole(null);
      } else {
        const data = await res.json();
        setRole(data.role || null);
      }
    } catch (err) {
      console.error("useUserRole error:", err);
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, [API]);

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  return { role, loading, refresh: fetchRole };
}
