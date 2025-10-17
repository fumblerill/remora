"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { Trash2, X, ArrowUpLeft } from "lucide-react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import Modal from "@/components/ui/Modal";
import {
  fetchUploadedDataset,
  handleFileUpload,
  normalizeDataset,
  type UploadedDataset,
} from "@/lib/fileUpload";

type FileUploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: (data: any) => void;
};

type ValidationRow = {
  cells: string[];
};

export default function FileUploadModal({
  isOpen,
  onClose,
  onUploadComplete,
}: FileUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [requiresValidation, setRequiresValidation] = useState(false);
  const [validationDataset, setValidationDataset] = useState<UploadedDataset | null>(null);
  const [originalDataset, setOriginalDataset] = useState<UploadedDataset | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [headerMovedToRows, setHeaderMovedToRows] = useState(false);

  const isValidationMode = Boolean(validationDataset);
  const validationColumns = validationDataset?.columns.length ?? 0;

  const resetState = useCallback(() => {
    setFile(null);
    setUploading(false);
    setRequiresValidation(false);
    setValidationDataset(null);
    setOriginalDataset(null);
    setUploadedFileName("");
    setHeaderMovedToRows(false);
  }, []);

  const handleModalClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const startOver = useCallback(() => {
    setFile(null);
    setValidationDataset(null);
    setOriginalDataset(null);
    setUploadedFileName("");
    setHeaderMovedToRows(false);
  }, []);

  const resetValidationChanges = useCallback(() => {
    if (!originalDataset) return;
    setValidationDataset({
      columns: [...originalDataset.columns],
      rows: originalDataset.rows.map((row) => [...row]),
    });
    setHeaderMovedToRows(false);
  }, [originalDataset]);

  const removeColumn = useCallback((index: number) => {
    setValidationDataset((current) => {
      if (!current || index < 0 || index >= current.columns.length) return current;
      const nextColumns = current.columns.filter((_, i) => i !== index);
      const nextRows = current.rows.map((row) => row.filter((_, i) => i !== index));
      return {
        columns: nextColumns,
        rows: nextRows,
      };
    });
  }, []);

  const removeRow = useCallback((index: number) => {
    setValidationDataset((current) => {
      if (!current || index < 0 || index >= current.rows.length) return current;
      const nextRows = current.rows.filter((_, i) => i !== index);
      return {
        columns: [...current.columns],
        rows: nextRows,
      };
    });
  }, []);

  const moveHeaderToRow = useCallback(() => {
    let updated = false;
    setValidationDataset((current) => {
      if (!current) return current;

      const maxCols = Math.max(
        current.columns.length,
        ...current.rows.map((row) => row.length),
      );

      const headerRow = [...current.columns];
      if (headerRow.length < maxCols) {
        headerRow.push(...Array(maxCols - headerRow.length).fill(""));
      }

      const normalizedRows = current.rows.map((row) => {
        const copy = [...row];
        if (copy.length < maxCols) {
          copy.push(...Array(maxCols - copy.length).fill(""));
        }
        return copy;
      });

      updated = true;

      return {
        columns: Array.from({ length: maxCols }, (_, idx) => `Колонка ${idx + 1}`),
        rows: [headerRow, ...normalizedRows],
      };
    });

    if (updated) {
      setHeaderMovedToRows(true);
    }
  }, []);

  const promoteRowToHeader = useCallback((rowIndex: number) => {
    let updated = false;
    setValidationDataset((current) => {
      if (!current || rowIndex < 0 || rowIndex >= current.rows.length) return current;

      const candidate = current.rows[rowIndex] ?? [];
      const maxCols = Math.max(candidate.length, current.columns.length);

      const nextColumns = Array.from({ length: maxCols }, (_, idx) => {
        const candidateValue = (candidate[idx] ?? "").trim();
        if (candidateValue) return candidateValue;
        const existing = current.columns[idx];
        if (existing && existing.trim().length > 0) return existing;
        return `Колонка ${idx + 1}`;
      });

      const nextRows = current.rows
        .filter((_, idx) => idx !== rowIndex)
        .map((row) => {
          const copy = [...row];
          if (copy.length < maxCols) {
            copy.push(...Array(maxCols - copy.length).fill(""));
          }
          return copy;
        });

      updated = true;

      return {
        columns: nextColumns,
        rows: nextRows,
      };
    });

    if (updated) {
      setHeaderMovedToRows(false);
    }
  }, []);

  const completeValidation = useCallback(() => {
    if (!validationDataset || validationDataset.columns.length === 0) return;

    const normalized = normalizeDataset(validationDataset);
    if (onUploadComplete) onUploadComplete(normalized);
    handleModalClose();
  }, [handleModalClose, onUploadComplete, validationDataset]);

  const onPrimaryAction = useCallback(async () => {
    if (validationDataset) {
      completeValidation();
      return;
    }

    if (!file) return;
    if (requiresValidation) {
      setUploading(true);
      try {
        const uploaded = await fetchUploadedDataset(file);
        setOriginalDataset(uploaded);
        setValidationDataset({
          columns: [...uploaded.columns],
          rows: uploaded.rows.map((row) => [...row]),
        });
        setUploadedFileName(file.name);
        setFile(null);
        setHeaderMovedToRows(false);
      } catch (err) {
        console.error(err);
        alert("Не удалось загрузить файл");
      } finally {
        setUploading(false);
      }
      return;
    }

    setUploading(true);
    try {
      await handleFileUpload(file, {
        onUploadComplete,
        onClose: handleModalClose,
      });
    } finally {
      setUploading(false);
    }
  }, [
    completeValidation,
    file,
    handleModalClose,
    onUploadComplete,
    requiresValidation,
    validationDataset,
  ]);

  const primaryLabel = isValidationMode
    ? "Импортировать данные"
    : uploading
      ? "Загрузка..."
      : "Сохранить";

  const primaryDisabled = isValidationMode
    ? validationColumns === 0
    : uploading || !file;

  if (!isOpen) return null;

  if (isValidationMode && validationDataset) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleModalClose}
        contentClassName="max-w-6xl w-[95vw] h-[80vh] p-0 flex flex-col"
      >
        <div className="flex flex-col h-full">
          <div className="px-6 pt-6">
            <h2 className="text-lg font-semibold">Проверка данных</h2>
            <p className="text-sm text-gray-600 mt-1">
              Удалите лишние строки и столбцы перед импортом данных в дашборд.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Файл:{" "}
              <span className="font-medium text-gray-700">{uploadedFileName || "—"}</span> · Строк:{" "}
              {validationDataset.rows.length} · Столбцов: {validationColumns}
            </p>

            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={resetValidationChanges}
                className="text-sm text-brand hover:underline disabled:text-gray-400 disabled:no-underline"
                disabled={!originalDataset}
              >
                Сбросить изменения
              </button>
              <button
                type="button"
                onClick={startOver}
                className="text-sm text-gray-500 hover:underline"
              >
                Выбрать другой файл
              </button>
              <button
                type="button"
                onClick={moveHeaderToRow}
                className="text-sm text-gray-600 hover:underline disabled:text-gray-400 disabled:no-underline"
                disabled={headerMovedToRows}
              >
                Перенести заголовок в строки
              </button>
              <button
                type="button"
                onClick={() => promoteRowToHeader(0)}
                className="text-sm text-gray-600 hover:underline disabled:text-gray-400 disabled:no-underline"
                disabled={validationDataset.rows.length === 0}
              >
                Сделать первую строку заголовками
              </button>
            </div>

            {validationColumns === 0 && (
              <p className="mt-3 text-sm text-red-500">
                Нельзя импортировать данные без столбцов. Сбросьте изменения или выберите другой
                файл.
              </p>
            )}
          </div>

          <div className="flex-1 px-6 pb-4 pt-4 overflow-hidden">
            <ValidationTable
              dataset={validationDataset}
              onRemoveColumn={removeColumn}
              onRemoveRow={removeRow}
              onPromoteRowToHeader={promoteRowToHeader}
            />
          </div>

          <div className="px-6 pb-6">
            <button
              onClick={onPrimaryAction}
              disabled={primaryDisabled}
              className="w-full bg-brand text-white py-2 rounded-lg hover:bg-brand/90 transition disabled:opacity-50"
            >
              {primaryLabel}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleModalClose}>
      <h2 className="text-lg font-semibold mb-4">Загрузить файл</h2>

      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-brand transition"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
          }
        }}
      >
        <input
          type="file"
          accept=".csv,.xlsx,.ods"
          id="fileInput"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setFile(e.target.files[0]);
            }
          }}
        />
        {!file ? (
          <label htmlFor="fileInput" className="cursor-pointer block">
            <p className="text-gray-600">Перетащите CSV/XLSX/ODS сюда</p>
            <p className="text-sm text-gray-400 mt-2">или нажмите для выбора файла</p>
          </label>
        ) : (
          <div>
            <p className="font-medium">{file.name}</p>
            <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="mt-2 text-sm text-red-500 hover:underline"
            >
              Удалить
            </button>
          </div>
        )}
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={requiresValidation}
          onChange={(e) => setRequiresValidation(e.target.checked)}
        />
        Данные требуют валидации (удаление строк и столбцов перед импортом)
      </label>

      <button
        onClick={onPrimaryAction}
        disabled={primaryDisabled}
        className="mt-4 w-full bg-brand text-white py-2 rounded-lg hover:bg-brand/90 transition disabled:opacity-50"
      >
        {primaryLabel}
      </button>
    </Modal>
  );
}

type ValidationTableProps = {
  dataset: UploadedDataset;
  onRemoveColumn: (index: number) => void;
  onRemoveRow: (index: number) => void;
  onPromoteRowToHeader: (index: number) => void;
};

function ValidationTable({
  dataset,
  onRemoveColumn,
  onRemoveRow,
  onPromoteRowToHeader,
}: ValidationTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const tableData = useMemo<ValidationRow[]>(
    () =>
      dataset.rows.map((cells) => ({
        cells,
      })),
    [dataset.rows],
  );

  const columns = useMemo<ColumnDef<ValidationRow>[]>(() => {
    const defs: ColumnDef<ValidationRow>[] = [
      {
        id: "actions",
        size: 150,
        header: () => <span>Действия</span>,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onRemoveRow(row.index)}
              className="inline-flex items-center justify-center rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
              title="Удалить строку"
            >
              <Trash2 size={14} />
            </button>
            <button
              type="button"
              onClick={() => onPromoteRowToHeader(row.index)}
              className="inline-flex items-center justify-center rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
              title="Сделать заголовком"
            >
              <ArrowUpLeft size={14} />
            </button>
          </div>
        ),
      },
      {
        id: "rowNumber",
        header: () => "#",
        size: 64,
        cell: ({ row }) => (
          <span className="text-xs text-gray-500">{row.index + 1}</span>
        ),
      },
    ];

    dataset.columns.forEach((header, columnIndex) => {
      defs.push({
        id: `col-${columnIndex}`,
        size: 160,
        header: () => (
          <div className="flex items-center gap-1">
            <span
              className="truncate max-w-[12rem]"
              title={header || `Колонка ${columnIndex + 1}`}
            >
              {header || `Колонка ${columnIndex + 1}`}
            </span>
            <button
              type="button"
              onClick={() => onRemoveColumn(columnIndex)}
              className="inline-flex items-center justify-center rounded p-1 text-red-500 hover:bg-red-100"
              title="Удалить столбец"
            >
              <X size={14} />
            </button>
          </div>
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-gray-700">
            {row.original.cells[columnIndex] ?? ""}
          </span>
        ),
      });
    });

    return defs;
  }, [dataset.columns, onPromoteRowToHeader, onRemoveColumn, onRemoveRow]);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange",
  });

  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 36,
    overscan: 12,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0;

  const leafColumns = table.getVisibleLeafColumns();
  const noRows = table.getRowModel().rows.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col border border-gray-200 rounded-lg">
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-auto"
      >
        <table className="min-w-max w-full text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2 border-b text-left text-xs font-medium text-gray-600 bg-gray-50"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {paddingTop > 0 && (
              <tr>
                <td style={{ height: `${paddingTop}px` }} colSpan={leafColumns.length} />
              </tr>
            )}

            {virtualRows.map((virtualRow) => {
              const row = table.getRowModel().rows[virtualRow.index];
              return (
                <tr
                  key={row.id}
                  className={virtualRow.index % 2 === 1 ? "bg-gray-50" : ""}
                  style={{ height: `${virtualRow.size}px` }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-3 py-2 border-b align-top"
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}

            {paddingBottom > 0 && (
              <tr>
                <td style={{ height: `${paddingBottom}px` }} colSpan={leafColumns.length} />
              </tr>
            )}

            {noRows && (
              <tr>
                <td
                  colSpan={leafColumns.length}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  Все строки удалены. Чтобы начать заново, выберите другой файл или сбросьте
                  изменения.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
