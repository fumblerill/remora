"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import Modal from "./Modal";
import { errorToast, successToast } from "@/lib/toast";
import ConfirmModal from "./ConfirmModal";

type ConfigItem = { name: string; file: string; createdAt: string };

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
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<ConfigItem | null>(null);

  const loadConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/list-dashboards?ts=" + Date.now(), {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Не удалось загрузить список конфигов");
      const json = await res.json();
      setConfigs(json.configs ?? []);
    } catch (err) {
      console.error(err);
      errorToast("Не удалось загрузить конфигурации");
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadConfigs();
    }
  }, [isOpen, loadConfigs]);

  const handleDelete = async (target: ConfigItem) => {
    const { file, name } = target;
    const safeName = file.replace(/\.json$/i, "");
    try {
      setDeleting(file);
      const res = await fetch(`/api/dashboard/${encodeURIComponent(safeName)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Ошибка удаления");
      }

      successToast(`Конфигурация «${name}» удалена`);
      setConfigs((prev) => prev.filter((cfg) => cfg.file !== file));
      setConfirmTarget(null);
    } catch (err) {
      console.error("Delete config failed:", err);
      errorToast("Не удалось удалить конфигурацию");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
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
            <div
              key={cfg.file}
              className="flex items-center gap-2 border rounded px-3 py-2"
            >
              <button
                onClick={() => {
                  onSelect(cfg.file);
                  onClose();
                }}
                className="flex-1 text-left"
                type="button"
              >
                <div className="font-medium">{cfg.name}</div>
                <div className="text-xs text-gray-500">
                  {new Date(cfg.createdAt).toLocaleString()}
                </div>
              </button>

              <button
                onClick={() => setConfirmTarget(cfg)}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                title="Удалить конфигурацию"
                disabled={deleting === cfg.file}
                type="button"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(confirmTarget)}
        title="Удаление конфигурации"
        description={
          confirmTarget
            ? `Удалить конфигурацию «${confirmTarget.name}»? Действие нельзя отменить.`
            : ""
        }
        confirmText="Удалить"
        onCancel={() => {
          if (!deleting) {
            setConfirmTarget(null);
          }
        }}
        onConfirm={() => {
          if (confirmTarget) {
            void handleDelete(confirmTarget);
          }
        }}
        loading={Boolean(
          confirmTarget && deleting === confirmTarget.file
        )}
      />

      <div className="mt-4 text-right">
        <button
          onClick={onClose}
          className="text-sm border px-3 py-1 rounded hover:bg-gray-100"
          type="button"
        >
          Отмена
        </button>
      </div>
    </Modal>
  );
}
