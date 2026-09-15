import { Button, Empty, Skeleton, Table } from "antd";
import { Box, Eye } from "lucide-react";
import StatusTag from "../../../components/common/StatusTag";
import { formatDate, formatDateTime } from "../../../utils/formatDate";
import "./CaseTableView.css";

function CaseTableView({
  data,
  total,
  isLoading,
  isFetching,
  page,
  pageSize,
  sortField,
  sortOrder,
  hasActiveFilters,
  onClearFilters,
  onTableChange,
  onQuickView,
}) {
  const columns = [
    {
      title: "Case",
      dataIndex: "caseReference",
      key: "caseReference",
      fixed: "left",
      // Reference + location combined into one cell to reduce table clutter.
      render: (text, record) => (
        <div className="dd-cell-case">
          <div className="dd-case-icon">
            <Box size={17} />
          </div>
          <div>
            <div className="dd-cell-case__ref">{text}</div>
            <div className="dd-cell-case__loc">{record.incidentAddress}</div>
          </div>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value) => <StatusTag status={value} />,
    },
    {
      title: "Incident Date",
      dataIndex: "incidentDate",
      key: "incidentDate",
      sorter: true,
      sortOrder: sortField === "incidentDate" ? sortOrder : null,
      render: formatDate,
      responsive: ["sm"], // hidden on very small screens
    },
    {
      title: "Vehicles",
      dataIndex: "vehicleCount",
      key: "vehicleCount",
      align: "center",
      width: 100,
      responsive: ["md"],
    },
    {
      title: "Last Updated",
      dataIndex: "updatedAt",
      key: "updatedAt",
      sorter: true,
      sortOrder: sortField === "updatedAt" ? sortOrder : null,
      render: formatDateTime,
      responsive: ["lg"],
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      align: "center",
      width: 90,
      render: (_, record) => (
        <Button
          type="text"
          icon={<Eye size={16} />}
          aria-label={`Quick view ${record.caseReference}`}
          onClick={() => onQuickView(record)}
        />
      ),
    },
  ];

  // Shown when the table has zero rows — different message if filters are active.
  const emptyState = (
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

  // First-load skeleton (no cached data yet at all).
  if (isLoading && !data) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }

  return (
    <div className="dd-surface-panel">
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data || []}
        loading={isFetching} // spinner overlay on refetches after first load
        onChange={onTableChange}
        scroll={{ x: 760 }} // horizontal scroll on narrow screens instead of squashing columns
        locale={{ emptyText: emptyState }}
        pagination={{
          current: page,
          pageSize,
          total: total || 0,
          showSizeChanger: true,
          showTotal: (t) => `${t} case${t === 1 ? "" : "s"}`,
        }}
      />
    </div>
  );
}

export default CaseTableView;
