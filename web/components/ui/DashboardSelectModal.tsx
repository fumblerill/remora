"use client";

import { useEffect, useState } from "react";
import Modal from "./Modal";
import { LayoutDashboard } from "lucide-react";

type ConfigOption = {
  name: string;
  file: string;
  createdAt: string;
};

type DashboardSelectModalProps = {
  isOpen: boolean;
  login: string;
  configs: ConfigOption[];
  selected: string[];
  onClose: () => void;
  onSubmit: (updated: string[]) => void;
};

export default function DashboardSelectModal({
  isOpen,
  login,
  configs,
  selected,
  onClose,
  onSubmit,
}: DashboardSelectModalProps) {
  const [localSelection, setLocalSelection] = useState<string[]>(selected);

  useEffect(() => {
    if (isOpen) {
      setLocalSelection(selected);
    }
  }, [isOpen, selected]);

  const toggle = (name: string) => {
    setLocalSelection((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex items-center gap-2 text-brand mb-4">
        <LayoutDashboard size={18} />
        <h3 className="text-lg font-semibold">
          Дашборды для <span className="font-mono text-gray-700">{login}</span>
        </h3>
      </div>

      <div className="border rounded-md max-h-64 overflow-y-auto divide-y">
        {configs.length === 0 ? (
          <p className="p-3 text-sm text-gray-500">Нет сохранённых дашбордов.</p>
        ) : (
          configs.map((cfg) => {
            const checked = localSelection.includes(cfg.name);
            return (
              <label
                key={cfg.file}
                className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(cfg.name)}
                />
                <span className="flex-1">{cfg.name}</span>
              </label>
            );
          })
        )}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm border rounded hover:bg-gray-100"
        >
          Отмена
        </button>
        <button
          onClick={() => onSubmit(localSelection)}
          className="px-4 py-2 text-sm bg-brand text-white rounded hover:bg-brand/90 transition"
        >
          Сохранить
        </button>
      </div>
    </Modal>
  );
}

