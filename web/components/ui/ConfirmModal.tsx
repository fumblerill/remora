"use client";

import { useTranslation } from "@/components/i18n/LocaleProvider";
import Modal from "./Modal";

type ConfirmModalProps = {
  isOpen: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
};

export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmModalProps) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t("common.confirm.title");
  const resolvedCancel = cancelText ?? t("common.cancel");
  const resolvedConfirm = confirmText ?? t("common.confirm.yes");
  const loadingLabel = t("common.confirm.removing");

  return (
    <Modal isOpen={isOpen} onClose={onCancel}>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-brand">{resolvedTitle}</h3>
        {description && <p className="text-sm text-gray-600">{description}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm border rounded hover:bg-gray-100"
            disabled={loading}
          >
            {resolvedCancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-60"
            disabled={loading}
          >
            {loading ? loadingLabel : resolvedConfirm}
          </button>
        </div>
      </div>
    </Modal>
  );
}
