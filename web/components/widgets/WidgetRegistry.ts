import TableWidget from "./TableWidget/index";
import ChartWidget from "./ChartWidget";

export const widgetRegistry: Record<string, React.FC<any>> = {
  table: TableWidget,
  chart: ChartWidget,
};
