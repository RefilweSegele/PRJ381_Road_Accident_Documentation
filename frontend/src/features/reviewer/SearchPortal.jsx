/*
 -Page 5 - Reviewer Case Search Portal
 -Route: /review/cases
*/


import React, { useMemo, useState } from "react";
// TanStack Query for server state management (caching, loading states, refetching)
import { useQuery } from "@tanstack/react-query";
// Ant Design UI components for a polished, consistent layout
import { Alert, Button, Card, DatePicker, Empty, Input, Segmented, Skeleton, Table, Tag } from "antd";
import { SearchOutlined, DownloadOutlined } from "@ant-design/icons";
import { LayoutGrid, Table as TableIcon } from "lucide-react";
// React Router hook for programmatic navigation
import { useNavigate } from "react-router-dom";
// PapaParse for converting JavaScript arrays/objects into CSV format
import { unparse } from "papaparse";

import apiClient from "../../api/client";

// Destructure RangePicker from AntD's DatePicker for selecting start and end dates
const { RangePicker } = DatePicker;
function formatIncidentDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function renderOptionalValue(value) {
  return value == null || value === "" ? (
    <span style={{ color: "#999" }}>—</span>
  ) : (
    value
  );
}

// apiClient already includes the /api base path.
async function fetchCases({ search, dateRange }) {
  // Format the parameters to send to the backend
  const params = {
    search: search || undefined,
    dateFrom: dateRange?.[0]?.format("YYYY-MM-DD"),
    dateTo: dateRange?.[1]?.format("YYYY-MM-DD"),
  };

  const { data } = await apiClient.get("/review/cases", { params });
  return data;
}
// Dynamic Table Columns (Role-Based Access Control)
/*
  Constructs the column array required by Ant Design's <Table> component.
  Shapes data mapping using `dataIndex` and custom UI rendering using `render`.
 */
function buildColumns(role, navigate) {
  // Base columns that all users can see, regardless of their role
  const base = [
    { title: "Case ID", dataIndex: "caseId", key: "caseId" },
    { title: "Location", dataIndex: "location", key: "location" },
    {
      title: "Incident Date",
      dataIndex: "incidentDate",
      key: "incidentDate",
      render: formatIncidentDate,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      // Custom render function to display the status inside a green AntD Tag
      render: (value) => <Tag color="green">{value}</Tag>,
    },
  ];

  // Conditionally define extra columns based on the user's role
  const roleColumns =
    role === "insurer"
      ? [
          {
            title: "Claim Number",
            dataIndex: "claimNumber",
            key: "claimNumber",
            render: renderOptionalValue,
          },
          {
            title: "Insurer",
            dataIndex: "insurerName",
            key: "insurerName",
            render: renderOptionalValue,
          },
        ]
      : [
          {
            title: "Charge / Citation Ref",
            dataIndex: "chargeReference",
            key: "chargeReference",
            render: renderOptionalValue,
          },
        ];

  // Merge and return the base columns with the role-specific columns
  return [
    ...base,
    ...roleColumns,
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Button type="link" onClick={() => navigate(`/review/cases/${record.id}`)}>
          View Details
        </Button>
      ),
    },
  ];
}

// Main Component


export default function SearchPortal() {
  const navigate = useNavigate();
  
  // Read the role and token keys written by the login page.
  const role = localStorage.getItem("user_role");
  const isAuthenticated = Boolean(localStorage.getItem("authToken"));
  // Fallback to "insurer" for demo purposes if the user isn't logged in yet
  const effectiveRole = role || "insurer"; 

  // Local UI state for search filters
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState(null);
  const [view, setView] = useState("table");

  // TanStack Query hook to handle data fetching
  const { data, isLoading, isError } = useQuery({
    // queryKey acts as a dependency array; when search or dateRange changes, it refetches automatically
    queryKey: ["reviewerCases", search, dateRange, effectiveRole],
    queryFn: () => fetchCases({ search, dateRange }),
    keepPreviousData: true, // Keeps current data on screen while fetching new data to prevent flickering
  });

  // Memoize the columns so they are only recalculated if the user's role actually changes
  const columns = useMemo(
    () => buildColumns(effectiveRole, navigate),
    [effectiveRole, navigate],
  );
  const cases = data?.cases ?? [];

 
   // Transforms the current table data into a CSV file and triggers a browser download.
   
  function handleExportCsv() {
    // 1. Map over the fetched data to format it for the CSV based on the current role
    const rows = (data?.cases ?? []).map((c) => {
      const row = {
        "Case ID": c.caseId,
        Location: c.location,
        "Incident Date": c.incidentDate,
        Status: c.status,
      };
      
      if (effectiveRole === "insurer") {
        row["Claim Number"] = c.claimNumber;
        row["Insurer"] = c.insurerName;
      } else {
        row["Charge / Citation Ref"] = c.chargeReference;
      }
      return row;
    });

    // 2. Convert the array of objects into a raw CSV string using PapaParse
    const csv = unparse(rows);
    
    // 3. Create a Blob (binary large object) from the CSV string
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    // 4. Create a temporary hidden link, click it to trigger download, and clean it up
    const a = document.createElement("a");
    a.href = url;
    a.download = `reviewer-cases-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

 // JSX Rendering
 
  return (
    <div style={{ padding: 24 }}>
      <h1>Reviewer Case Search</h1>
      
      {/* Warning banner shown if JWT logic is bypassed/missing */}
      {!isAuthenticated && (
        <p style={{ color: "#a66", fontSize: 13 }}>
          No JWT found - showing demo data as an "insurer" role. Log in via Page 0 to see the real
          role-driven columns.
        </p>
      )}

      {/* Top Metrics Section */}
      <div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
        <StatCard label="Pending review" value={data?.pendingReviewCount ?? "—"} />
        <StatCard label="Total Results" value={cases.length} />
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <Segmented
          aria-label="Case view"
          value={view}
          onChange={setView}
          options={[
            { label: "Table", value: "table", icon: <TableIcon size={14} /> },
            { label: "Grid", value: "grid", icon: <LayoutGrid size={14} /> },
          ]}
        />
      </div>

      {/* Filter and Action Bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <Input
          placeholder="Search by Case ID or Location..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 320 }}
        />
        <RangePicker value={dateRange} onChange={setDateRange} />
        <span>Showing processed and reviewed cases</span>
        <Button icon={<DownloadOutlined />} onClick={handleExportCsv}>
          Export CSV
        </Button>
      </div>

      {isError ? (
        <Alert
          type="error"
          showIcon
          message="Failed to load cases. Try again."
          style={{ marginBottom: 16 }}
        />
      ) : view === "table" ? (
        <Table
          loading={isLoading}
          rowKey="id"
          dataSource={cases}
          columns={columns}
          pagination={{ pageSize: 10 }}
          locale={{
            emptyText:
              !isLoading && cases.length === 0 ? (
                <Empty description="No cases found matching your search. Try adjusting the date range or keywords." />
              ) : (
                <span />
              ),
          }}
        />
      ) : (
        isLoading ? (
          <Skeleton active paragraph={{ rows: 5 }} />
        ) : cases.length === 0 ? (
          <Empty description="No cases found matching your search. Try adjusting the date range or keywords." />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {cases.map((caseRecord) => (
              <Card
                key={caseRecord.id}
                title={caseRecord.caseId}
                extra={<Tag color="green">{caseRecord.status}</Tag>}
                actions={[
                  <Button
                    key="details"
                    type="link"
                    onClick={() => navigate(`/review/cases/${caseRecord.id}`)}
                  >
                    View Details
                  </Button>,
                ]}
              >
                <p>{renderOptionalValue(caseRecord.location)}</p>
                <p>Incident: {formatIncidentDate(caseRecord.incidentDate)}</p>
                {effectiveRole === "insurer" ? (
                  <>
                    <p>Claim Number: {renderOptionalValue(caseRecord.claimNumber)}</p>
                    <p>Insurer: {renderOptionalValue(caseRecord.insurerName)}</p>
                  </>
                ) : (
                  <p>
                    Charge / Citation Ref: {renderOptionalValue(caseRecord.chargeReference)}
                  </p>
                )}
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// Subcomponents



 // Reusable small card for displaying top-level metrics.

function StatCard({ label, value }) {
  return (
    <div style={{ border: "1px solid #e5e5e5", borderRadius: 6, padding: "12px 20px", minWidth: 160 }}>
      <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
