"use client";

import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { PivotConfig } from "@/lib/types";

interface TableEditorProps {
  data: any[];
  config?: PivotConfig;
  onConfigChange?: (config: PivotConfig) => void;
}

export default function TableEditor({ data, config, onConfigChange }: TableEditorProps) {
  if (!data || data.length === 0) return <div>Нет данных для конфигурации</div>;

  const fields = Object.keys(data[0]);

  const [pivotConfig, setPivotConfig] = useState<PivotConfig>({
    available: config?.available ?? fields,
    rows: config?.rows ?? [],
    cols: config?.cols ?? [],
    values: config?.values ?? [],
  });

  const updateConfig = (newConfig: PivotConfig) => {
    setPivotConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  const handleDragEnd = (result: any) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newConfig: PivotConfig = {
      available: [...pivotConfig.available],
      rows: [...pivotConfig.rows],
      cols: [...pivotConfig.cols],
      values: [...pivotConfig.values],
    };

    let moved: any;
    if (source.droppableId === "available") {
      moved = pivotConfig.available[source.index];
    } else if (source.droppableId === "values") {
      [moved] = newConfig.values.splice(source.index, 1);
    } else {
      const section = (newConfig as any)[source.droppableId] as any[];
      [moved] = section.splice(source.index, 1);
    }

    // --- назначение ---
    if (destination.droppableId === "values") {
      const obj =
        typeof moved === "string"
          ? { field: moved, agg: "sum" as const }
          : { field: moved.field, agg: moved.agg ?? "sum" };
      newConfig.values.splice(destination.index, 0, obj);
    } else if (destination.droppableId === "rows" || destination.droppableId === "cols") {
      const section = (newConfig as any)[destination.droppableId] as string[];
      if (typeof moved === "string") section.splice(destination.index, 0, moved);
      else if (moved?.field) section.splice(destination.index, 0, moved.field);
    } else if (destination.droppableId === "available") {
      const fieldName = typeof moved === "string" ? moved : moved.field;
      if (!newConfig.available.includes(fieldName)) {
        newConfig.available.splice(destination.index, 0, fieldName);
      }
    }

    updateConfig(newConfig);
  };

  // 🔧 нормализация values
  const normalizedValues = pivotConfig.values.map((v: any) =>
    typeof v === "string" ? { field: v, agg: "sum" as const } : { field: v.field, agg: v.agg ?? "sum" }
  );

  const Section = ({
    droppableId,
    title,
    items,
    scrollable = false,
  }: {
    droppableId: keyof PivotConfig;
    title: string;
    items: any[];
    scrollable?: boolean;
  }) => (
    <div className="bg-white rounded border shadow-sm p-2 h-full flex flex-col">
      <h4 className="font-semibold mb-2 text-sm text-gray-700">{title}</h4>
      <Droppable droppableId={droppableId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 rounded border p-2 min-h-[60px] transition-colors ${
              snapshot.isDraggingOver ? "bg-blue-50 border-blue-400" : "bg-gray-50"
            } ${scrollable ? "max-h-96 overflow-y-auto" : ""}`}
          >
            {items.length === 0 && (
              <span className="block text-gray-400 text-sm">Перетащи поле сюда</span>
            )}
            {droppableId === "values"
              ? (items as { field: string; agg: string }[]).map((item, index) => (
                  <Draggable
                    key={`val-${item.field}-${index}`}
                    draggableId={`val-${item.field}-${index}`}
                    index={index}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="flex items-center justify-between px-2 py-1 mb-1 bg-white border rounded shadow-sm"
                      >
                        <span className="truncate text-sm">
                          {item.field} ({item.agg})
                        </span>
                        <select
                          value={item.agg}
                          onChange={(e) => {
                            const agg = e.target.value as PivotConfig["values"][0]["agg"];
                            const updated = [...normalizedValues];
                            updated[index] = { ...item, agg };
                            updateConfig({ ...pivotConfig, values: updated });
                          }}
                          className="ml-2 border rounded px-1 py-0.5 text-sm"
                        >
                          <option value="sum">SUM</option>
                          <option value="count">COUNT</option>
                          <option value="avg">AVG</option>
                        </select>
                      </div>
                    )}
                  </Draggable>
                ))
              : items.map((item, index) => (
                  <Draggable
                    key={`${droppableId}-${typeof item === "string" ? item : item.field}-${index}`}
                    draggableId={`${droppableId}-${typeof item === "string" ? item : item.field}-${index}`}
                    index={index}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="px-2 py-1 mb-1 bg-white border rounded shadow-sm text-sm truncate"
                      >
                        {typeof item === "string" ? item : item.field}
                      </div>
                    )}
                  </Draggable>
                ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );

  return (
    <div className="w-full">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-4 gap-4">
          {/* Левая панель */}
          <div className="col-span-1">
            <Section droppableId="available" title="Доступные поля" items={pivotConfig.available} scrollable />
          </div>

          {/* Правая рабочая область */}
          <div className="col-span-3 bg-gray-100 rounded-lg p-3 flex flex-col gap-3">
            <div className="shrink-0">
              <Section droppableId="cols" title="Столбцы" items={pivotConfig.cols} />
            </div>

            <div className="flex flex-1 gap-3">
              <div className="w-1/3">
                <Section droppableId="rows" title="Строки" items={pivotConfig.rows} />
              </div>
              <div className="flex-1">
                <Section droppableId="values" title="Значения" items={normalizedValues} />
              </div>
            </div>
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
