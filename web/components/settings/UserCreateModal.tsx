"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";

interface UserCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (login: string, password: string, role: string) => Promise<void>;
}

export default function UserCreateModal({ isOpen, onClose, onCreate }: UserCreateModalProps) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("User");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!login.trim() || !password.trim()) return;
    setLoading(true);
    await onCreate(login, password, role);
    setLoading(false);
    setLogin("");
    setPassword("");
    setRole("User");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-lg font-semibold text-brand mb-4">Новый пользователь</h2>

      <input
        type="text"
        placeholder="Логин"
        value={login}
        onChange={(e) => setLogin(e.target.value)}
        className="border w-full px-3 py-2 rounded mb-3 focus:outline-none focus:ring-2 focus:ring-brand"
      />
      <input
        type="password"
        placeholder="Пароль"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border w-full px-3 py-2 rounded mb-3 focus:outline-none focus:ring-2 focus:ring-brand"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="border w-full px-3 py-2 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-brand"
      >
        <option value="User">User</option>
        <option value="Admin">Admin</option>
        <option value="SuperAdmin">SuperAdmin</option>
      </select>

      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          disabled={loading}
          className="border px-4 py-2 rounded-lg hover:bg-gray-100"
        >
          Отмена
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand/90 transition disabled:opacity-50"
        >
          {loading ? "Создание..." : "Создать"}
        </button>
      </div>
    </Modal>
  );
}
