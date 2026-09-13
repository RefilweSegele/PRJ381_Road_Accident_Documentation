import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  ConfigProvider,
  Empty,
  Input,
  message,
  Select,
  Skeleton,
  Space,
  Table,
  Typography,
} from "antd";
import {
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";

import { fetchAllCasesForExport, fetchCases } from "../../api/cases";
import StatusTag, { STATUS_CONFIG } from "../../components/common/StatusTag";
import { formatDate, formatDateTime } from "../../utils/formatDate";
import { downloadCasesAsCsv } from "../../utils/exportCsv";
import DashboardStats from "./DashboardStats";
import "./CaseDashboard.css";

const { Title, Text } = Typography;
const DEFAULT_PAGE_SIZE = 10;

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(
  ([value, { label }]) => ({
    value,
    label,
  }),
);

const PAGE_THEME = {
  token: {
    colorPrimary: "#2f6fed",
    borderRadius: 10,
  },
};

function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);
  return debounced;
}

function CaseDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isExporting, setIsExporting] = useState(false);

  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("pageSize") || DEFAULT_PAGE_SIZE);
  const sortField = searchParams.get("sortField") || "updatedAt";
  const sortOrder = searchParams.get("sortOrder") || "descend";

  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebouncedValue(searchInput);

  const hasActiveFilters = Boolean(status || search);

  const updateParams = useCallback(
    (updates) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, val]) => {
        if (val === undefined || val === null || val === "") {
          next.delete(key);
        } else {
          next.set(key, String(val));
        }
      });
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    if (debouncedSearch !== search) {
      updateParams({ search: debouncedSearch, page: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const queryParams = useMemo(
    () => ({ status, search, page, pageSize, sortField, sortOrder }),
    [status, search, page, pageSize, sortField, sortOrder],
  );

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["cases", queryParams],
    queryFn: () => fetchCases(queryParams),
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
  });

  const handleClearFilters = () => {
    setSearchInput("");
    updateParams({ status: "", search: "", page: 1 });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await fetchAllCasesForExport({
        status,
        search,
        sortField,
        sortOrder,
      });
      if (!result.data.length) {
        message.warning("No cases to export for the current filters.");
        return;
      }
      downloadCasesAsCsv(result.data, `cases-export-${Date.now()}.csv`);
      message.success(`Exported ${result.data.length} case(s).`);
    } catch (err) {
      message.error("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const columns = [
    {
      title: "Case Reference",
      dataIndex: "caseReference",
      key: "caseReference",
      fixed: "left",
      render: (text, record) => (
        <Link to={`/investigator/cases/${record.id}/upload`}>{text}</Link>
      ),
    },
    {
      title: "Incident Location",
      dataIndex: "incidentAddress",
      key: "incidentAddress",
      ellipsis: true,
      responsive: ["md"],
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
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value) => <StatusTag status={value} />,
    },
    {
      title: "Vehicles",
      dataIndex: "vehicleCount",
      key: "vehicleCount",
      align: "center",
      width: 100,
      responsive: ["lg"],
    },
    {
      title: "Assigned Investigator",
      dataIndex: "assignedInvestigator",
      key: "assignedInvestigator",
      responsive: ["lg"],
    },
    {
      title: "Last Updated",
      dataIndex: "updatedAt",
      key: "updatedAt",
      sorter: true,
      sortOrder: sortField === "updatedAt" ? sortOrder : null,
      render: formatDateTime,
      responsive: ["md"],
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      render: (_, record) => (
        <Space size="middle">
          <Link to={`/investigator/cases/${record.id}/upload`}>Continue</Link>
          <Link to={`/investigator/cases/${record.id}/status`}>Status</Link>
        </Space>
      ),
    },
  ];

  const handleTableChange = (pagination, _filters, sorter) => {
    updateParams({
      page: pagination.current,
      pageSize: pagination.pageSize,
      sortField: sorter.order ? sorter.field : "updatedAt",
      sortOrder: sorter.order || "descend",
    });
  };

  const emptyState = (
    <Empty
      description={
        hasActiveFilters
          ? "No cases match your current filters."
          : "No cases have been created yet."
      }
    >
      {hasActiveFilters && (
        <Button onClick={handleClearFilters}>Clear filters</Button>
      )}
    </Empty>
  );

  return (
    <ConfigProvider theme={PAGE_THEME}>
      <div className="case-dashboard">
        <div className="case-dashboard__header">
          <Title level={3} style={{ margin: 0 }}>
            Investigator Case Dashboard
          </Title>
          <Space wrap>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              loading={isExporting}
            >
              Export CSV
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => refetch()}
              loading={isFetching}
            >
              Refresh
            </Button>
            <Link to="/investigator/cases/new">
              <Button type="primary" icon={<PlusOutlined />}>
                New Case
              </Button>
            </Link>
          </Space>
        </div>

        <DashboardStats />

        <div className="case-dashboard__filters-row">
          <Space className="case-dashboard__filters" wrap>
            <Input
              allowClear
              placeholder="Search by reference or location"
              prefix={<SearchOutlined />}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="case-dashboard__search-input"
            />
            <Select
              allowClear
              placeholder="Filter by status"
              className="case-dashboard__status-select"
              value={status || undefined}
              onChange={(value) => updateParams({ status: value, page: 1 })}
              options={STATUS_OPTIONS}
            />
            {hasActiveFilters && (
              <Button type="link" onClick={handleClearFilters}>
                Clear filters
              </Button>
            )}
          </Space>
          {data && (
            <Text type="secondary" className="case-dashboard__result-count">
              {data.total} case{data.total === 1 ? "" : "s"} found
            </Text>
          )}
        </div>

        {isError && (
          <Alert
            type="error"
            showIcon
            message="Could not load cases"
            description={error?.message || "Please try again."}
            style={{ marginBottom: 16 }}
          />
        )}

        {isLoading && !data ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : (
          <Table
            className="case-dashboard__table"
            rowKey="id"
            columns={columns}
            dataSource={data?.data || []}
            loading={isFetching}
            onChange={handleTableChange}
            rowClassName="case-dashboard__row"
            onRow={(_, index) => ({
              style: { "--row-delay": `${(index ?? 0) * 40}ms` },
            })}
            scroll={{ x: 900 }}
            locale={{ emptyText: emptyState }}
            pagination={{
              current: page,
              pageSize,
              total: data?.total || 0,
              showSizeChanger: true,
              showTotal: (total) => `${total} case${total === 1 ? "" : "s"}`,
            }}
          />
        )}
      </div>
    </ConfigProvider>
  );
}

export default CaseDashboard;
