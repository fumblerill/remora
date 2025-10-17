"use client";

import React, { useRef, useLayoutEffect, useState } from "react";
import TableWidget from "@/components/widgets/TableWidget";
import ChartWidget from "@/components/widgets/ChartWidget";
import ReportWidget from "@/components/widgets/ReportWidget";

export type Widget = {
  id: string;
  type: "table" | "chart" | "report";
  title?: string;
  config?: any;
  layout: any;
};

interface WidgetContainerProps {
  widget: Widget;
  data: any[] | null;
  onUpdate: (id: string, updates: Partial<Widget>) => void;
  isReadonly?: boolean;
}

export default function WidgetContainer({
  widget,
  data,
  onUpdate,
  isReadonly = false,
}: WidgetContainerProps) {
  const { id, type, title, config } = widget;
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;

    const observer = new ResizeObserver(() => {
      setHeight(el.clientHeight - 40);
    });

    observer.observe(el);
    setHeight(el.clientHeight - 40);

    return () => observer.disconnect();
  }, []);

  const widgetsMap: Record<Widget["type"], React.ReactElement> = {
    table: (
      <TableWidget
        data={data ?? []}
        config={config}
        height={height}
        title={title || "Table Widget"}
        onConfigChange={(newConfig: any) => onUpdate(id, { config: newConfig })}
        onTitleChange={(newTitle: string) => onUpdate(id, { title: newTitle })}
        isReadonly={isReadonly}
      />
    ),
    chart: (
      <ChartWidget
        data={data ?? []}
        config={config}
        height={height}
        title={title || "Chart Widget"}
        onConfigChange={(newConfig: any) => onUpdate(id, { config: newConfig })}
        onTitleChange={(newTitle: string) => onUpdate(id, { title: newTitle })}
        isReadonly={isReadonly}
      />
    ),
    report: (
      <ReportWidget
        data={data ?? []}
        config={config ?? null}
        title={title || "Отчёт"}
        onTitleChange={(newTitle) => onUpdate(id, { title: newTitle })}
        onConfigChange={(nextConfig) => onUpdate(id, { config: nextConfig })}
        isReadonly={isReadonly}
      />
    ),
  };

  const widgetElement = widgetsMap[type] ?? (
    <span className="text-red-500 m-auto">❓ Неизвестный виджет</span>
  );

  return (
    <div ref={containerRef} className="flex flex-col h-full">
      {data && data.length > 0 ? (
        widgetElement
      ) : (
        <span className="text-gray-500 m-auto">Нет данных</span>
      )}
    </div>
  );
}
