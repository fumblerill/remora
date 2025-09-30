"use client";

import RGL, { WidthProvider, Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useState } from "react";

const GridLayout = WidthProvider(RGL);

type Widget = {
  id: string;
  type: "table" | "chart";
  layout: Layout;
};

type FileData = {
  columns: string[];
  rows: string[][];
};

export default function Configurator({
  widgets,
  fileData,
  setWidgets,
}: {
  widgets: Widget[];
  fileData: FileData | null;
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
    _layout: any,
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
    _layout: any,
    oldItem: Layout,
    newItem: Layout,
    _placeholder: any,
    e: MouseEvent
  ) => {
    if (isOverTrash) {
      setWidgets(widgets.filter((w) => w.id !== oldItem.i));
    }
    setIsOverTrash(false);
    setIsDragging(false);
    document.body.style.overflow = "";
    document.body.style.width = "";
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
        autoSize
        useCSSTransforms={false}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragStop={handleDragStop}
      >
        {widgets.map((w) => (
          <div
            key={w.id}
            data-grid={w.layout}
            className="bg-white border shadow rounded p-2 flex flex-col"
          >
            {w.type === "table" ? (
              fileData ? (
                <div className="flex-1 overflow-auto">
                  <table className="table-auto border-collapse border border-gray-300 w-full text-sm">
                    <thead className="sticky top-0 bg-gray-100">
                      <tr>
                        {fileData.columns.map((col, idx) => (
                          <th key={idx} className="border px-2 py-1">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {fileData.rows.map((row, rIdx) => (
                        <tr key={rIdx}>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="border px-2 py-1">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
