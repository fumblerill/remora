import React from "react";

interface Props {
  data: any[];
  config: { x: string; y: string };
}

export default function ChartWidget({ data, config }: Props) {
  return (
    <pre className="bg-gray-100 p-2 rounded">
      {JSON.stringify({ data, config }, null, 2)}
    </pre>
  );
}
