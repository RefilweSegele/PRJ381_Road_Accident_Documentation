import { Button, Empty, Pagination, Skeleton } from "antd";
import { Box, Eye } from "lucide-react";
import StatusTag from "../../../components/common/StatusTag";
import { formatDate, formatDateTime } from "../../../utils/formatDate";
import "./CaseCardGrid.css";

function CaseCardGrid({
  data,
  total,
  isLoading,
  page,
  pageSize,
  hasActiveFilters,
  onClearFilters,
  onPageChange,
  onQuickView,
}) {
  if (isLoading && !data) {
    return <Skeleton active paragraph={{ rows: 6 }} />;
  }

  if (!data || data.length === 0) {
    return (
      <Empty
        description={
          hasActiveFilters
            ? "No cases match your current filters."
            : "No cases have been created yet."
        }
      >
        {hasActiveFilters && (
          <Button onClick={onClearFilters}>Clear filters</Button>
        )}
      </Empty>
    );
  }

  return (
    <>
      <div className="dd-cards-grid">
        {data.map((c) => (
          <div key={c.id} className="dd-case-card">
            <div className="dd-case-card__top">
              <div className="dd-cell-case">
                <div className="dd-case-icon">
                  <Box size={17} />
                </div>
                <div>
                  <div className="dd-cell-case__ref">{c.caseReference}</div>
                  <div className="dd-cell-case__loc">{c.incidentAddress}</div>
                </div>
              </div>
              <StatusTag status={c.status} />
            </div>
            <div className="dd-case-card__meta">
              Incident: {formatDate(c.incidentDate)} · {c.vehicleCount} vehicle
              {c.vehicleCount === 1 ? "" : "s"}
            </div>
            <div className="dd-case-card__footer">
              <span>Updated {formatDateTime(c.updatedAt)}</span>
              <Button
                type="text"
                size="small"
                icon={<Eye size={14} />}
                aria-label={`Quick view ${c.caseReference}`}
                onClick={() => onQuickView(c)}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="dd-cards-grid__pagination">
        <Pagination
          current={page}
          pageSize={pageSize}
          total={total || 0}
          showSizeChanger={false}
          showTotal={(t) => `${t} case${t === 1 ? "" : "s"}`}
          onChange={onPageChange}
        />
      </div>
    </>
  );
}

export default CaseCardGrid;
