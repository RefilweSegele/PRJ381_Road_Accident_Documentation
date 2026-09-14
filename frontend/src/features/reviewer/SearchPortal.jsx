/*
 -Page 5 — Reviewer Case Search Portal
 -Route: /review/cases
*/


import React, { useMemo, useState } from "react";
// TanStack Query for server state management (caching, loading states, refetching)
import { useQuery } from "@tanstack/react-query";
// Ant Design UI components for a polished, consistent layout
import { Input, DatePicker, Select, Button, Tag, Table } from "antd";
import { SearchOutlined, DownloadOutlined } from "@ant-design/icons";
// React Router hook for programmatic navigation
import { useNavigate } from "react-router-dom";
// PapaParse for converting JavaScript arrays/objects into CSV format
import { unparse } from "papaparse";

import apiClient from "../../api/client";
import useAuth from "../auth/useAuth";
import mockCases from "../../api/mocks/cases.json";

// Destructure RangePicker from AntD's DatePicker for selecting start and end dates
const { RangePicker } = DatePicker;

// API Interaction
/*
 -Fetches case data from the backend. 
  -Falls back to mock data if the backend endpoint fails or isn't live yet.
 */
async function fetchCases({ search, dateRange }) {
  // Format the parameters to send to the backend
  const params = {
    status: "Complete",
    search: search || undefined,
    // Safely extract and format dates to ISO strings if a range is selected
    dateFrom: dateRange?.[0]?.toISOString(),
    dateTo: dateRange?.[1]?.toISOString(),
  };
  
  try {
    // Attempt to hit the Node.js backend API
    const { data } = await apiClient.get("/api/cases", { params });
    return data;
  } catch {
    // If the API call fails (e.g., server offline), return the local JSON mock
    return mockCases;
  }
}
// Dynamic Table Columns (Role-Based Access Control)
/*
  Constructs the column array required by Ant Design's <Table> component.
  Shapes data mapping using `dataIndex` and custom UI rendering using `render`.
 */
function buildColumns(role) {
  // Base columns that all users can see, regardless of their role
  const base = [
    { title: "Case ID", dataIndex: "caseId", key: "caseId" },
    { title: "Location", dataIndex: "location", key: "location" },
    { title: "Incident Date", dataIndex: "incidentDate", key: "incidentDate" },
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
          { title: "Claim Number", dataIndex: "claimNumber", key: "claimNumber" },
          { title: "Insurer", dataIndex: "insurerName", key: "insurerName" },
        ]
      : [{ title: "Charge / Citation Ref", dataIndex: "chargeReference", key: "chargeReference" }];

  // Merge and return the base columns with the role-specific columns
  return [...base, ...roleColumns];
}

// Main Component


export default function SearchPortal() {
  const navigate = useNavigate();
  
  // Extract role and auth status from the custom hook (Member 1's JWT logic)
  const { role, isAuthenticated } = useAuth();
  // Fallback to "insurer" for demo purposes if the user isn't logged in yet
  const effectiveRole = role || "insurer"; 

  // Local UI state for search filters
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState(null);

  // TanStack Query hook to handle data fetching
  const { data, isLoading, isError } = useQuery({
    // queryKey acts as a dependency array; when search or dateRange changes, it refetches automatically
    queryKey: ["reviewerCases", search, dateRange, effectiveRole],
    queryFn: () => fetchCases({ search, dateRange }),
    keepPreviousData: true, // Keeps current data on screen while fetching new data to prevent flickering
  });

  // Memoize the columns so they are only recalculated if the user's role actually changes
  const columns = useMemo(() => buildColumns(effectiveRole), [effectiveRole]);

 
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
          No JWT found — showing demo data as an "insurer" role. Log in via Page 0 to see the real
          role-driven columns.
        </p>
      )}

      {/* Top Metrics Section */}
      <div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
        <StatCard label="Pending review" value={data?.pendingReviewCount ?? "—"} />
        <StatCard
          label="Avg. turnaround"
          value={data?.avgTurnaroundDays ? `${data.avgTurnaroundDays} days` : "—"}
        />
      </div>

      {/* Filter and Action Bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <Input
          placeholder="Search case ID, claim number, location"
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 320 }}
        />
        <RangePicker value={dateRange} onChange={setDateRange} />
        {/* Hardcoded to 'Complete' as this dashboard is for reviewing finished drone processing */}
        <Select
          value="Complete"
          style={{ width: 160 }}
          options={[{ value: "Complete", label: "Complete" }]}
          disabled
        />
        <Button icon={<DownloadOutlined />} onClick={handleExportCsv}>
          Export CSV
        </Button>
      </div>

      {/* Main Data Table */}
      <Table
        loading={isLoading}
        rowKey="caseId" // Tells AntD which property makes each row unique (prevents console warnings)
        dataSource={data?.cases ?? []}
        columns={columns}
        pagination={{ pageSize: 10 }}
        // Makes the entire row clickable, navigating to the specific Case Details page (Page 6)
        onRow={(record) => ({
          onClick: () => navigate(`/review/cases/${record.caseId}`),
          style: { cursor: "pointer" },
        })}
      />

      {/* Error State UI */}
      {isError && <p style={{ color: "red" }}>Failed to load cases. Try again.</p>}
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