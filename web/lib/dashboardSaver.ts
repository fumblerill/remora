import { Layout } from "react-grid-layout";

export interface DashboardWidget {
  id: string;
  type: "table" | "chart";
  title: string;
  config: any;
  layout: Layout;
}

export interface Dashboard {
  name: string;
  createdAt: string;
  widgets: DashboardWidget[];
}

export function createDashboardJSON(widgets: DashboardWidget[], name: string): Dashboard {
  return {
    name,
    createdAt: new Date().toISOString(),
    widgets,
  };
}
