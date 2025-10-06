"use client";

import { useEffect, useState } from "react";

interface ConfigSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (file: string) => void;
}

export default function ConfigSelectModal({
  isOpen,
  onClose,
  onSelect,
}: ConfigSelectModalProps) {
  const [configs, setConfigs] = useState<
    { name: string; file: string; createdAt: string }[]
  >([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchConfigs = async () => {
      try {
        setLoading(true);
        const res = await fetch("/configs/configs.json?ts=" + Date.now());
        if (!res.ok) throw new Error("Не удалось загрузить список конфигов");
        const json = await res.json();
        setConfigs(json);
      } catch (err) {
        console.error(err);
        setConfigs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchConfigs();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-[400px] max-h-[80vh] overflow-auto">
        <h2 className="text-lg font-semibold mb-4">Выберите конфигурацию</h2>

        {loading ? (
          <p className="text-gray-500 text-center">Загрузка...</p>
        ) : configs.length === 0 ? (
          <p className="text-gray-500 text-center">
            Сохранённые конфигурации отсутствуют
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {configs.map((cfg) => (
              <button
                key={cfg.file}
                onClick={() => {
                  onSelect(cfg.file);
                  onClose();
                }}
                className="text-left p-3 border rounded hover:bg-gray-50 transition"
              >
                <div className="font-medium">{cfg.name}</div>
                <div className="text-xs text-gray-500">
                  {new Date(cfg.createdAt).toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 text-right">
          <button
            onClick={onClose}
            className="text-sm border px-3 py-1 rounded hover:bg-gray-100"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
