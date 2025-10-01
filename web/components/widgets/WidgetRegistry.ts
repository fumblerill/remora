import TableWidget from "./TableWidget/index";
import ChartWidget from "./ChartWidget/ChartWidget";

export const widgetRegistry: Record<string, React.FC<any>> = {
  table: TableWidget,
  chart: ChartWidget,
};
