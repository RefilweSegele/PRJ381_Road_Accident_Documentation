import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  ConfigProvider,
  message,
  Segmented,
  Select,
} from "antd";
import {
  Download,
  LayoutGrid,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Table as TableIcon,
} from "lucide-react";

import { fetchAllFilteredCases, fetchCases } from "../../api/cases";
import { STATUS_CONFIG } from "../../components/common/StatusTag";
import DashboardStats from "./DashboardStats";
import CaseTableView from "./views/CaseTableView";
import CaseCardGrid from "./views/CaseCardGrid";
import CaseMapView from "./views/CaseMapView";
import CaseQuickViewDrawer from "./CaseQuickViewDrawer";
import { downloadCasesAsCsv } from "../../utils/exportCsv";
import { useCaseViewStore } from "./store/useCaseViewStore";
import "./CaseDashboard.css";

const DEFAULT_PAGE_SIZE = 10;
const GRID_PAGE_SIZE = 9; // fixed 3x3 grid, no size-changer for this view

// Dropdown options built from the same STATUS_CONFIG the badges use, so
// labels never drift out of sync between the filter and the table.
const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(
  ([value, { label }]) => ({
    value,
    label,
  }),
);

const VIEW_OPTIONS = [
  { label: "Table", value: "table", icon: <TableIcon size={14} /> },
  { label: "Grid", value: "grid", icon: <LayoutGrid size={14} /> },
  { label: "Map", value: "map", icon: <MapPin size={14} /> },
];

// Scoped Ant Design theme override — only affects components inside this page.
const ANTD_THEME = {
  token: {
    colorPrimary: "#3b82f6",
    borderRadius: 10,
  },
};

// Delays reacting to a fast-changing value (keystrokes) until it settles.
function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);
  return debounced;
}

// Page 1: Investigator Dashboard (/investigator/cases)
function CaseDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isExporting, setIsExporting] = useState(false);
  const [quickViewCase, setQuickViewCase] = useState(null); // case shown in the eye-icon drawer

  // View choice (table/grid/map) is the one thing kept in a persisted store —
  // everything else below lives in the URL instead.
  const view = useCaseViewStore((state) => state.view);
  const setView = useCaseViewStore((state) => state.setView);

  // Filters/sort/pagination read straight from the URL query string so they
  // survive refreshes and are shareable via link.
  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";
  const page = Number(searchParams.get("page") || 1);
  const tablePageSize = Number(
    searchParams.get("pageSize") || DEFAULT_PAGE_SIZE,
  );
  const sortField = searchParams.get("sortField") || "updatedAt";
  const sortOrder = searchParams.get("sortOrder") || "descend";

  // Grid always uses a fixed page size regardless of what's stored for the table.
  const effectivePageSize = view === "grid" ? GRID_PAGE_SIZE : tablePageSize;

  const [searchInput, setSearchInput] = useState(search); // local, instant-typing state
  const debouncedSearch = useDebouncedValue(searchInput);
  const hasActiveFilters = Boolean(status || search);

  // A stat card can set a "group" filter value (e.g. "inProgress") that
  // doesn't match any single Select option — in that case just show the
  // placeholder instead of an incorrect selection.
  const selectValue = STATUS_OPTIONS.some((o) => o.value === status)
    ? status
    : undefined;

  // Merges partial updates into the URL query string (removing empty values).
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

  // Pushes the debounced search text into the URL once typing settles.
  useEffect(() => {
    if (debouncedSearch !== search) {
      updateParams({ search: debouncedSearch, page: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Shared by all three views (table, grid, map) so they stay in sync.
  const filterParams = useMemo(
    () => ({ status, search, sortField, sortOrder }),
    [status, search, sortField, sortOrder],
  );

  // Paginated query — powers table and grid views.
  const pagedQuery = useQuery({
    queryKey: ["cases", { ...filterParams, page, pageSize: effectivePageSize }],
    queryFn: () =>
      fetchCases({ ...filterParams, page, pageSize: effectivePageSize }),
    placeholderData: (previous) => previous, // keep old rows visible while refetching
    staleTime: 30_000,
    enabled: view !== "map", // don't fetch this when on the map view
  });

  // Full unpaginated query — powers the map view (plots every match at once).
  const mapQuery = useQuery({
    queryKey: ["cases-map", filterParams],
    queryFn: () => fetchAllFilteredCases(filterParams),
    staleTime: 30_000,
    enabled: view === "map",
  });

  const handleClearFilters = () => {
    setSearchInput("");
    updateParams({ status: "", search: "", page: 1 });
  };

  // Stat card click → sets (or clears) the shared status filter.
  const handleSelectStatCard = (filterValue) => {
    updateParams({ status: filterValue, page: 1 });
  };

  // Fetches the full filtered set and triggers a CSV download.
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await fetchAllFilteredCases(filterParams);
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

  // antd Table's onChange handler — syncs pagination/sort back into the URL.
  const handleTableChange = (pagination, _filters, sorter) => {
    updateParams({
      page: pagination.current,
      pageSize: pagination.pageSize,
      sortField: sorter.order ? sorter.field : "updatedAt",
      sortOrder: sorter.order || "descend",
    });
  };

  const handleGridPageChange = (nextPage) => {
    updateParams({ page: nextPage });
  };

  return (
    <ConfigProvider theme={ANTD_THEME}>
      <div className="case-dashboard">
        <div className="case-dashboard__header">
          <div>
            <h2 className="case-dashboard__title">My Cases</h2>
            <p className="case-dashboard__title-sub">
              {pagedQuery.data?.total ?? mapQuery.data?.total ?? 0} case
              {(pagedQuery.data?.total ?? mapQuery.data?.total) === 1
                ? ""
                : "s"}{" "}
              shown
            </p>
          </div>
          <div className="case-dashboard__header-actions">
            <Button
              icon={<Download size={14} />}
              onClick={handleExport}
              loading={isExporting}
            >
              Export CSV
            </Button>
            <Button
              icon={<RefreshCw size={14} />}
              // Refetch whichever query is actually powering the current view.
              onClick={() =>
                view === "map" ? mapQuery.refetch() : pagedQuery.refetch()
              }
              loading={pagedQuery.isFetching || mapQuery.isFetching}
            >
              Refresh
            </Button>
            <Link to="/investigator/cases/new">
              <Button type="primary" icon={<Plus size={14} />}>
                New Case
              </Button>
            </Link>
          </div>
        </div>

        {/* 4 clickable stat cards — filter table/grid/map when clicked */}
        <DashboardStats
          activeStatus={status}
          onSelectStatus={handleSelectStatCard}
        />

        {/* Search + status filter + view switcher, all in one toolbar */}
        <div className="dd-toolbar">
          <div className="dd-search">
            <Search size={15} className="dd-search__icon" />
            <input
              type="text"
              placeholder="Search by reference or location…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Select
            allowClear
            placeholder="Filter by status"
            className="dd-status-select"
            value={selectValue}
            onChange={(value) => updateParams({ status: value, page: 1 })}
            options={STATUS_OPTIONS}
          />
          {hasActiveFilters && (
            <Button type="link" onClick={handleClearFilters}>
              Clear filters
            </Button>
          )}
          <div className="dd-toolbar__spacer" />
          <Segmented options={VIEW_OPTIONS} value={view} onChange={setView} />
        </div>

        {(pagedQuery.isError || mapQuery.isError) && (
          <Alert
            type="error"
            showIcon
            message="Could not load cases"
            description={
              pagedQuery.error?.message ||
              mapQuery.error?.message ||
              "Please try again."
            }
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Only one of these three renders at a time, based on the view toggle */}
        {view === "table" && (
          <CaseTableView
            data={pagedQuery.data?.data}
            total={pagedQuery.data?.total}
            isLoading={pagedQuery.isLoading}
            isFetching={pagedQuery.isFetching}
            page={page}
            pageSize={tablePageSize}
            sortField={sortField}
            sortOrder={sortOrder}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
            onTableChange={handleTableChange}
            onQuickView={setQuickViewCase}
          />
        )}

        {view === "grid" && (
          <CaseCardGrid
            data={pagedQuery.data?.data}
            total={pagedQuery.data?.total}
            isLoading={pagedQuery.isLoading}
            page={page}
            pageSize={GRID_PAGE_SIZE}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
            onPageChange={handleGridPageChange}
            onQuickView={setQuickViewCase}
          />
        )}

        {view === "map" && (
          <CaseMapView
            cases={mapQuery.data?.data}
            isLoading={mapQuery.isLoading}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
            onQuickView={setQuickViewCase}
          />
        )}
      </div>

      {/* Eye-icon quick view drawer, shared across all three views */}
      <CaseQuickViewDrawer
        open={Boolean(quickViewCase)}
        caseRecord={quickViewCase}
        onClose={() => setQuickViewCase(null)}
      />
    </ConfigProvider>
  );
}

export default CaseDashboard;
