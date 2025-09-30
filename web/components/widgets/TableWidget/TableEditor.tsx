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

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const newConfig: PivotConfig = {
      available: [...pivotConfig.available],
      rows: [...pivotConfig.rows],
      cols: [...pivotConfig.cols],
      values: [...pivotConfig.values],
    };

    let moved: any;

    // --- источник ---
    if (source.droppableId === "available") {
      moved = pivotConfig.available[source.index];
    } else if (source.droppableId === "values") {
      if (destination.droppableId === "available") {
        // удаление
        [moved] = newConfig.values.splice(source.index, 1);
      } else {
        // копирование
        moved = pivotConfig.values[source.index];
      }
    } else {
      // rows / cols → перенос
      const section = (newConfig as any)[source.droppableId] as string[];
      [moved] = section.splice(source.index, 1);
    }

    // --- назначение ---
    if (destination.droppableId === "values") {
      if (typeof moved === "string") {
        newConfig.values.splice(destination.index, 0, {
          field: moved,
          agg: "sum" as const,
        });
      } else {
        newConfig.values.splice(destination.index, 0, moved);
      }
    } else if (destination.droppableId === "rows" || destination.droppableId === "cols") {
      const section = (newConfig as any)[destination.droppableId] as string[];
      if (typeof moved === "string") {
        section.splice(destination.index, 0, moved);
      } else {
        section.splice(destination.index, 0, moved.field);
      }
    } else if (destination.droppableId === "available") {
      const fieldName = typeof moved === "string" ? moved : moved.field;
      if (!newConfig.available.includes(fieldName)) {
        newConfig.available.splice(destination.index, 0, fieldName);
      }
    }

    updateConfig(newConfig);
  };

  const Section = ({
    droppableId,
    title,
    items,
  }: {
    droppableId: keyof PivotConfig;
    title: string;
    items: any[];
  }) => (
    <div>
      <h4 className="font-semibold mb-2">{title}</h4>
      <Droppable droppableId={droppableId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`border rounded p-2 min-h-[80px] transition-colors ${
              droppableId === "available" && snapshot.isDraggingOver
                ? "bg-red-50 border-red-400"
                : "bg-gray-50"
            }`}
          >
            {items.length === 0 && <span className="text-gray-400">Перетащи поле сюда</span>}
            {items.map((item, index) => (
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
                    className="flex items-center justify-between px-2 py-1 mb-1 bg-white border rounded shadow-sm"
                  >
                    <span>
                      {typeof item === "string" ? item : `${item.field} (${item.agg})`}
                    </span>
                    {droppableId === "values" && typeof item !== "string" ? (
                      <select
                        value={item.agg}
                        onChange={(e) => {
                          const agg = e.target.value as PivotConfig["values"][0]["agg"];
                          const updated = [...pivotConfig.values];
                          updated[index] = { ...item, agg };
                          updateConfig({ ...pivotConfig, values: updated });
                        }}
                        className="ml-2 border rounded px-1 py-0.5 text-sm"
                      >
                        <option value="sum">SUM</option>
                        <option value="count">COUNT</option>
                        <option value="avg">AVG</option>
                      </select>
                    ) : null}
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
    <div className="space-y-4">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-1">
            <Section droppableId="available" title="Доступные поля" items={pivotConfig.available} />
          </div>
          <div className="col-span-3 grid grid-cols-3 gap-4">
            <Section droppableId="rows" title="Строки" items={pivotConfig.rows} />
            <Section droppableId="cols" title="Колонки" items={pivotConfig.cols} />
            <Section droppableId="values" title="Значения" items={pivotConfig.values} />
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
