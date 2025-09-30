"use client";

import RGL, { WidthProvider, Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useState } from "react";
import TableWidget from "@/components/widgets/TableWidget";

const GridLayout = WidthProvider(RGL);

type Widget = {
  id: string;
  type: "table" | "chart";
  layout: Layout;
};

export default function Configurator({
  widgets,
  data,
  setWidgets,
}: {
  widgets: Widget[];
  data: any[] | null;
  setWidgets: (widgets: Widget[]) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isOverTrash, setIsOverTrash] = useState(false);

  const TRASH_WIDTH = 40;

  const handleDragStart = () => {
    setIsDragging(true);
    document.body.style.overflow = "hidden";
    document.body.style.width = `${window.innerWidth}px`;
  };

  const handleDrag = (
    _layout: Layout[],
    oldItem: Layout,
    newItem: Layout,
    _placeholder: any,
    e: MouseEvent
  ) => {
    if (!e) return;
    const mouseX = e.clientX;
    const winW = window.innerWidth;
    setIsOverTrash(mouseX >= winW - TRASH_WIDTH);
  };

  const handleDragStop = (
    _layout: Layout[],
    oldItem: Layout,
    newItem: Layout,
    _placeholder: any,
    _e: MouseEvent
  ) => {
    if (isOverTrash) {
      setWidgets(widgets.filter((w) => w.id !== oldItem.i));
    }
    setIsOverTrash(false);
    setIsDragging(false);
    document.body.style.overflow = "";
    document.body.style.width = "";
  };

  // сохраняем размеры/позиции
  const handleLayoutChange = (newLayout: Layout[]) => {
    setWidgets(
      widgets.map((w) => {
        const updated = newLayout.find((l) => l.i === w.id);
        return updated ? { ...w, layout: updated } : w;
      })
    );
  };

  return (
    <div className="h-full w-full bg-gray-50 relative">
      {/* Зона удаления */}
      {isDragging && (
        <div
          className={`fixed top-0 right-0 h-full w-[12px] z-[10000] pointer-events-none transition-all ${
            isOverTrash
              ? "animate-[glow-breathe_1.5s_ease-in-out_infinite]"
              : ""
          }`}
        />
      )}

      <GridLayout
        className="layout"
        cols={12}
        rowHeight={30}
        isResizable
        isDraggable
        draggableHandle=".drag-handle"
        autoSize
        useCSSTransforms={false}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragStop={handleDragStop}
        onLayoutChange={handleLayoutChange}
      >
        {widgets.map((w) => (
          <div
            key={w.id}
            data-grid={w.layout}
            className="bg-white border shadow rounded p-2 flex flex-col"
          >
            {/* Контент */}
            {w.type === "table" ? (
              data && data.length > 0 ? (
                <TableWidget data={data} />
              ) : (
                <span className="text-gray-500 m-auto">Нет данных</span>
              )
            ) : (
              <span className="text-purple-600 font-bold m-auto">📈 График</span>
            )}
          </div>
        ))}
      </GridLayout>
    </div>
  );
}
