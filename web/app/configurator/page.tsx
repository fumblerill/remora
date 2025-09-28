"use client";

import { useState } from "react";
import Header from "../../components/layout/Header";
import PivotRenderer from "../../components/pivot/PivotRenderer";

export default function AdminPage() {
  const [pivotData, setPivotData] = useState<any | null>(null);

  return (
    <div>
      <Header onUploadComplete={setPivotData} />

      <div className="mt-6">
        {!pivotData ? (
          <p className="text-gray-500">
            Загрузите CSV/XLSX, чтобы сформировать сводную таблицу.
          </p>
        ) : (
          <>
            {console.log("Отрисовываем PivotRenderer с данными:", pivotData)}
            <PivotRenderer data={pivotData} />
          </>
        )}
      </div>
    </div>
  );
}
