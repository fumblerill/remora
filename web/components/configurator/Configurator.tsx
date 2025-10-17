"use client";

import RGL, { WidthProvider, Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useState } from "react";
import WidgetContainer, { Widget } from "../widgets/hooks/WidgetContainer";

const GridLayout = WidthProvider(RGL);

interface ConfiguratorProps {
  widgets: Widget[];
  data: any[] | null;
  setWidgets: React.Dispatch<React.SetStateAction<Widget[]>>;
  isReadonly?: boolean;
}

export default function Configurator({
  widgets,
  data,
  setWidgets,
  isReadonly = false,
}: ConfiguratorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const TRASH_WIDTH = 30;

  const handleDragStart = () => {
    if (isReadonly) return;
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
    if (isReadonly) return;
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
    if (isReadonly) return;

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
    if (isReadonly) return;
    setWidgets((prev) =>
      prev.map((w) => {
        const updated = newLayout.find((l) => l.i === String(w.id));
        return updated ? { ...w, layout: updated } : w;
      })
    );
  };

  // обновление конфига или названия внутри виджета
  const handleWidgetUpdate = (id: string, updates: Partial<Widget>) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...updates } : w))
    );
  };

  return (
    <div className="h-full w-full bg-gray-50 relative">
      {!isReadonly && isDragging && (
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
        isResizable={!isReadonly}
        isDraggable={!isReadonly}
        draggableHandle=".drag-handle"
        autoSize
        useCSSTransforms={false}
        onDragStart={!isReadonly ? handleDragStart : undefined}
        onDrag={!isReadonly ? handleDrag : undefined}
        onDragStop={!isReadonly ? handleDragStop : undefined}
        onLayoutChange={!isReadonly ? handleLayoutChange : undefined}
        margin={[16, 16]}
        containerPadding={[0, 0]}
      >
        {widgets.map((w) => (
          <div
            key={w.id}
            data-grid={{ ...w.layout, i: String(w.id) }}
            className="bg-white border shadow rounded flex p-3 flex-col h-full"
          >
            <WidgetContainer
              widget={w}
              data={data}
              onUpdate={(id, updates) =>
                setWidgets((prev) =>
                  prev.map((item) =>
                    item.id === id ? { ...item, ...updates } : item
                  )
                )
              }
              isReadonly={isReadonly}
            />
          </div>
        ))}
      </GridLayout>
    </div>
  );
}
