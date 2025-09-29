import React, { ReactNode } from "react";

interface Props {
  title: string;
  children: ReactNode;
}

export default function WidgetWrapper({ title, children }: Props) {
  return (
    <div className="border rounded shadow p-4 bg-white">
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-semibold">{title}</h2>
        <button className="text-sm text-red-500">✕</button>
      </div>
      {children}
    </div>
  );
}
