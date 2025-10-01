"use client";

import RGL, { WidthProvider, Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useState } from "react";
import WidgetContainer from "../widgets/hooks/WidgetContainer";

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
  setWidgets: React.Dispatch<React.SetStateAction<Widget[]>>;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isOverTrash, setIsOverTrash] = useState(false);

  const TRASH_WIDTH = 80;

  const handleDragStart = () => {
    setIsDragging(true);
    document.body.style.overflow = "hidden";
    document.body.style.width = `${window.innerWidth}px`;
  };

  const handleDrag = (
    _layout: Layout[],
    _oldItem: Layout,
    _newItem: Layout,
    _placeholder: any,
    e: MouseEvent
  ) => {
    if (e) {
      const winW = window.innerWidth;
      setIsOverTrash(e.clientX >= winW - TRASH_WIDTH);
    }
  };

  const handleDragStop = (
    _layout: Layout[],
    oldItem: Layout,
    _newItem: Layout,
    _placeholder: any,
    e: MouseEvent | undefined
  ) => {
    const idToRemove = String(oldItem.i);
    const winW = window.innerWidth;

    const shouldRemove = (e && e.clientX >= winW - TRASH_WIDTH) || isOverTrash;

    if (shouldRemove) {
      setWidgets((prev) => prev.filter((w) => String(w.id) !== idToRemove));
    }

    setIsOverTrash(false);
    setIsDragging(false);
    document.body.style.overflow = "";
    document.body.style.width = "";
  };

  const handleLayoutChange = (newLayout: Layout[]) => {
    setWidgets((prev) =>
      prev.map((w) => {
        const updated = newLayout.find((l) => l.i === String(w.id));
        return updated ? { ...w, layout: updated } : w;
      })
    );
  };

  return (
    <div className="h-full w-full bg-gray-50 relative">
      {isDragging && (
        <div
          className={`fixed top-0 right-0 h-full w-[${TRASH_WIDTH}px] z-[10000] pointer-events-none transition-all ${
            isOverTrash
              ? "animate-[glow-breathe_1.5s_ease-in-out_infinite] bg-red-200/40"
              : "bg-gray-200/10"
          }`}
        />
      )}

      <GridLayout
        className="layout"
        layout={widgets.map((w) => ({ ...w.layout, i: String(w.id) }))}
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
        margin={[16, 16]}
        containerPadding={[0, 0]}
      >
        {widgets.map((w) => (
          <div
            key={w.id}
            data-grid={{ ...w.layout, i: String(w.id) }}
            className="bg-white border shadow rounded flex p-3 flex-col h-full"
          >
            <WidgetContainer type={w.type} data={data} />
          </div>
        ))}
      </GridLayout>
    </div>
  );
}
