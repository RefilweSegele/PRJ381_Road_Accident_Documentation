import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Input, Select, Space, Table, Typography } from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";

import { fetchCases } from "../../api/cases";
import StatusTag, { STATUS_CONFIG } from "../../components/common/StatusTag";
import { formatDate, formatDateTime } from "../../utils/formatDate";
import "./CaseDashboard.css";

const { Title } = Typography;
const DEFAULT_PAGE_SIZE = 10;

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(
  ([value, { label }]) => ({
    value,
    label,
  }),
);

/*
 Debounces a fast-changing value (e.g. keystrokes) so we don't refetch on
 * every character typed into the search box.
 */
function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);
  return debounced;
}

/*
 Page 1: Investigator Dashboard (/investigator/cases)
 
  - TanStack Query drives fetching/caching of the case list.
  - Filters (status, search, page, pageSize, sort) live in the URL query
    string via useSearchParams, so they persist across refreshes and are
    shareable/bookmarkable — this is the "persistent filter state"
    requirement from the task spec.
 */

function CaseDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();

  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("pageSize") || DEFAULT_PAGE_SIZE);
  const sortField = searchParams.get("sortField") || "updatedAt";
  const sortOrder = searchParams.get("sortOrder") || "descend";

  // Local input state so typing feels instant; the URL (and the query) only
  // update once the user pauses typing.
  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebouncedValue(searchInput);

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
    placeholderData: (previousData) => previousData, // keep old rows visible while refetching
    staleTime: 30_000,
  });

  const columns = [
    {
      title: "Case Reference",
      dataIndex: "caseReference",
      key: "caseReference",
      render: (text, record) => (
        <Link to={`/investigator/cases/${record.id}/upload`}>{text}</Link>
      ),
    },
    {
      title: "Incident Location",
      dataIndex: "incidentAddress",
      key: "incidentAddress",
      ellipsis: true,
    },
    {
      title: "Incident Date",
      dataIndex: "incidentDate",
      key: "incidentDate",
      sorter: true,
      sortOrder: sortField === "incidentDate" ? sortOrder : null,
      render: formatDate,
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
    },
    {
      title: "Assigned Investigator",
      dataIndex: "assignedInvestigator",
      key: "assignedInvestigator",
    },
    {
      title: "Last Updated",
      dataIndex: "updatedAt",
      key: "updatedAt",
      sorter: true,
      sortOrder: sortField === "updatedAt" ? sortOrder : null,
      render: formatDateTime,
    },
    {
      title: "Actions",
      key: "actions",
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

  return (
    <div className="case-dashboard">
      <div className="case-dashboard__header">
        <Title level={3} style={{ margin: 0 }}>
          Investigator Case Dashboard
        </Title>
        <Space>
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

      <Space className="case-dashboard__filters" wrap>
        <Input
          allowClear
          placeholder="Search by reference or location"
          prefix={<SearchOutlined />}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{ width: 280 }}
        />
        <Select
          allowClear
          placeholder="Filter by status"
          style={{ width: 200 }}
          value={status || undefined}
          onChange={(value) => updateParams({ status: value, page: 1 })}
          options={STATUS_OPTIONS}
        />
      </Space>

      {isError && (
        <Alert
          type="error"
          showIcon
          message="Could not load cases"
          description={error?.message || "Please try again."}
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.data || []}
        loading={isLoading}
        onChange={handleTableChange}
        pagination={{
          current: page,
          pageSize,
          total: data?.total || 0,
          showSizeChanger: true,
          showTotal: (total) => `${total} case${total === 1 ? "" : "s"}`,
        }}
      />
    </div>
  );
}

export default CaseDashboard;
