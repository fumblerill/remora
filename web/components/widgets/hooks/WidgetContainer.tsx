//TODO Сделать WidgetContainer более универсальным — через словарь (widgetsMap[type]) вместо if/switch
"use client";

import { useRef, useLayoutEffect, useState } from "react";
import TableWidget from "@/components/widgets/TableWidget";
import ChartWidget from "@/components/widgets/ChartWidget";

export default function WidgetContainer({
  type,
  data,
}: {
  type: "table" | "chart";
  data: any[] | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const el = containerRef.current;

    const observer = new ResizeObserver(() => {
      // -40px под шапку (кнопки/титул)
      setHeight(el.clientHeight - 40);
    });

    observer.observe(el);

    // сразу выставляем высоту
    setHeight(el.clientHeight - 40);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col h-full">
      {type === "table" ? (
        data && data.length > 0 ? (
          <TableWidget data={data} height={height} />
        ) : (
          <span className="text-gray-500 m-auto">Нет данных</span>
        )
      ) : type === "chart" ? (
        data && data.length > 0 ? (
          <ChartWidget data={data} height={height} />
        ) : (
          <span className="text-gray-500 m-auto">Нет данных</span>
        )
      ) : (
        <span className="text-red-500 m-auto">❓ Неизвестный виджет</span>
      )}
    </div>
  );
}
