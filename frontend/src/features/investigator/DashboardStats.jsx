import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "antd";
import { AlertTriangle, CheckCircle2, Files, Loader2 } from "lucide-react";
import { fetchCaseStats } from "../../api/cases";
import "./DashboardStats.css";

// filterValue is what gets written to the shared `status` URL param when clicked.
// '' (empty) on the "Total" card means "no filter" / show everything.
const STAT_CARDS = [
  {
    key: "total",
    filterValue: "",
    label: "Total Cases",
    icon: Files,
    tone: "primary",
  },
  {
    key: "inProgress",
    filterValue: "inProgress",
    label: "In Progress",
    icon: Loader2,
    tone: "warning",
  },
  {
    key: "processed",
    filterValue: "processed",
    label: "Processed",
    icon: CheckCircle2,
    tone: "success",
  },
  {
    key: "failed",
    filterValue: "failed",
    label: "Failed",
    icon: AlertTriangle,
    tone: "danger",
  },
];

// Summary strip above the table/grid/map. Cards are clickable filters —
// clicking one sets the shared status filter that all three views read from.
function DashboardStats({ activeStatus, onSelectStatus }) {
  const { data, isLoading } = useQuery({
    queryKey: ["case-stats"],
    queryFn: fetchCaseStats,
    staleTime: 30_000,
  });

  return (
    <div className="dd-stats-grid">
      {STAT_CARDS.map((card) => {
        const Icon = card.icon;
        const isActive = activeStatus === card.filterValue;
        return (
          <button
            key={card.key}
            type="button"
            className={`dd-stat-card dd-stat-card--${card.tone} ${isActive ? "dd-stat-card--active" : ""}`}
            // Clicking the already-active card clears the filter instead of re-applying it.
            onClick={() => onSelectStatus(isActive ? "" : card.filterValue)}
          >
            {isLoading ? (
              <Skeleton active title={false} paragraph={{ rows: 2 }} />
            ) : (
              <>
                <div className="dd-stat-card__icon">
                  <Icon size={18} />
                </div>
                <div className="dd-stat-card__value">
                  {data ? data[card.key] : "—"}
                </div>
                <div className="dd-stat-card__label">{card.label}</div>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default DashboardStats;
