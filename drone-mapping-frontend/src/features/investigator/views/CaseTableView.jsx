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
      responsive: ["sm"],
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

  if (isLoading && !data) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }

  return (
    <div className="dd-surface-panel">
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data || []}
        loading={isFetching}
        onChange={onTableChange}
        scroll={{ x: 760 }}
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
