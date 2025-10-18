"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import { LayoutDashboard } from "lucide-react";
import { useTranslation } from "@/components/i18n/LocaleProvider";

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
  const { t, locale } = useTranslation();

  useEffect(() => {
    if (isOpen) {
      setLocalSelection(selected);
    }
  }, [isOpen, selected]);

  const options = useMemo(() => {
    const merged: Array<ConfigOption & { missing?: boolean }> = [];
    const seen = new Set<string>();

    configs.forEach((cfg) => {
      if (cfg.name && !seen.has(cfg.name)) {
        merged.push(cfg);
        seen.add(cfg.name);
      }
    });

    [...selected, ...localSelection].forEach((name) => {
      if (!name || seen.has(name)) return;
      merged.push({
        name,
        file: name,
        createdAt: "",
        missing: true,
      });
      seen.add(name);
    });

    return merged.sort((a, b) => a.name.localeCompare(b.name, locale, { sensitivity: "base" }));
  }, [configs, locale, localSelection, selected]);

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
          {t("dashboardSelect.title")}{" "}
          <span className="font-mono text-gray-700">{login}</span>
        </h3>
      </div>

      <div className="border rounded-md max-h-64 overflow-y-auto divide-y">
        {options.length === 0 ? (
          <p className="p-3 text-sm text-gray-500">{t("dashboardSelect.empty")}</p>
        ) : (
          options.map((cfg) => {
            const checked = localSelection.includes(cfg.name);
            return (
              <label
                key={`${cfg.file}-${cfg.name}`}
                className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(cfg.name)}
                />
                <span className={`flex-1 ${cfg.missing ? "text-gray-500 italic" : ""}`}>
                  {cfg.name}
                  {cfg.missing && (
                    <span className="ml-2 inline-flex items-center rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
                      {t("dashboardSelect.missingBadge")}
                    </span>
                  )}
                </span>
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
          {t("dashboardSelect.cancel")}
        </button>
        <button
          onClick={() => onSubmit(localSelection)}
          className="px-4 py-2 text-sm bg-brand text-white rounded hover:bg-brand/90 transition"
        >
          {t("dashboardSelect.save")}
        </button>
      </div>
    </Modal>
  );
}
