import { useQuery } from "@tanstack/react-query";
import { Card, Skeleton } from "antd";
import {
  FileSearchOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { fetchCaseStats } from "../../api/cases";

const STAT_CARDS = [
  {
    key: "total",
    label: "Total Cases",
    icon: <FileSearchOutlined />,
    accent: "#1677ff",
  },
  {
    key: "inProgress",
    label: "In Progress",
    icon: <LoadingOutlined />,
    accent: "#faad14",
  },
  {
    key: "processed",
    label: "Processed",
    icon: <CheckCircleOutlined />,
    accent: "#52c41a",
  },
  {
    key: "failed",
    label: "Failed",
    icon: <ExclamationCircleOutlined />,
    accent: "#ff4d4f",
  },
];

function DashboardStats() {
  const { data, isLoading } = useQuery({
    queryKey: ["case-stats"],
    queryFn: fetchCaseStats,
    staleTime: 30_000,
  });

  return (
    <div className="dashboard-stats">
      {STAT_CARDS.map((card, index) => (
        <Card
          key={card.key}
          className="dashboard-stats__card"
          style={{ "--accent": card.accent, "--delay": `${index * 60}ms` }}
          variant="borderless"
        >
          {isLoading ? (
            <Skeleton active title={false} paragraph={{ rows: 2 }} />
          ) : (
            <>
              <div className="dashboard-stats__icon">{card.icon}</div>
              <div className="dashboard-stats__value">
                {data ? data[card.key] : "—"}
              </div>
              <div className="dashboard-stats__label">{card.label}</div>
            </>
          )}
        </Card>
      ))}
    </div>
  );
}

export default DashboardStats;
