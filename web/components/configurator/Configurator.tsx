"use client";

import RGL, { WidthProvider, Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const GridLayout = WidthProvider(RGL);

type Widget = {
  id: string;
  type: "table" | "chart";
  layout: Layout;
};

export default function Configurator({ widgets }: { widgets: Widget[] }) {
  return (
    <div className="h-full w-full bg-gray-50">
      <GridLayout
        className="layout"
        cols={12}
        rowHeight={30}
        isResizable
        isDraggable
        autoSize
      >
        {widgets.map((w) => (
          <div
            key={w.id}
            data-grid={w.layout}
            className="bg-white border shadow rounded p-2 flex items-center justify-center"
          >
            {w.type === "table" ? (
              <span className="text-green-600 font-bold">📊 Таблица</span>
            ) : (
              <span className="text-purple-600 font-bold">📈 График</span>
            )}
          </div>
        ))}
      </GridLayout>
    </div>
  );
}
