"use client";

import TableWidget from "@/components/widgets/TableWidget";

export default function PlaygroundPage() {
  const mockData = [
    { name: "Alice", sales: 120, region: "North" },
    { name: "Bob", sales: 95, region: "South" },
    { name: "Charlie", sales: 150, region: "North" },
    { name: "Diana", sales: 200, region: "South" },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">TableWidget Playground</h1>
      <TableWidget data={mockData} />
    </div>
  );
}
