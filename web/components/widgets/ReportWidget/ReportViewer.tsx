"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ReportConfig } from "@/lib/types";
import { evaluateReport } from "@/lib/report";
import { useTranslation } from "@/components/i18n/LocaleProvider";

type ReportViewerProps = {
  config: ReportConfig | null;
  data: Record<string, unknown>[] | null;
};

export default function ReportViewer({ config, data }: ReportViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [fontSize, setFontSize] = useState(14);
  const { t } = useTranslation();

  const { rendered, values } = useMemo(() => {
    if (!config || !data) return { rendered: "", values: {} };
    return evaluateReport(config, data);
  }, [config, data]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const computeSize = (width: number) => Math.round(Math.min(Math.max(width / 28, 14), 20));
    const updateSize = (width: number) =>
      setFontSize((prev) => {
        const next = computeSize(width);
        return prev === next ? prev : next;
      });

    updateSize(node.clientWidth);

    let frame = 0;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      let width = entry.contentRect.width;
      const boxSize = entry.contentBoxSize;
      if (boxSize) {
        if (Array.isArray(boxSize)) {
          width = boxSize[0]?.inlineSize ?? width;
        } else {
          const contentBox = boxSize as unknown as ResizeObserverSize;
          if (typeof contentBox?.inlineSize === "number") {
            width = contentBox.inlineSize;
          }
        }
      }

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => updateSize(width));
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  if (!config) {
    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-4 text-sm text-gray-500">
        {t("widgets.report.viewer.notConfigured")}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="rounded-lg border border-brand/20 bg-gradient-to-br from-white via-white to-brand/5 p-6 shadow-sm"
    >
      {config.title && (
        <h3
          className="mb-4 font-semibold text-brand"
          style={{ fontSize: `${Math.round(fontSize * 1.2)}px`, lineHeight: 1.3 }}
        >
          {config.title}
        </h3>
      )}
      <div
        className="mx-auto max-w-3xl space-y-3 text-gray-800 whitespace-pre-wrap select-text"
        style={{
          fontSize: `${fontSize}px`,
          lineHeight: fontSize >= 18 ? 1.7 : 1.55,
        }}
      >
        {rendered || (
          <span className="text-gray-500">
            {t("widgets.report.viewer.emptyTemplate", { example: "{{total}}" })}
          </span>
        )}
      </div>
      <details className="mt-5 text-xs text-gray-400 select-text">
        <summary className="cursor-pointer">{t("widgets.report.viewer.showValues")}</summary>
        <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
          {Object.entries(values).map(([id, value]) => (
            <li key={id} className="font-mono bg-white/80 px-2 py-1 rounded border text-gray-600">
              {id}: <span className="font-semibold text-brand">{String(value)}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
