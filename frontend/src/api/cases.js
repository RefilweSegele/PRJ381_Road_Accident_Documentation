import apiClient from "./client";
import {
  getMockCases,
  getMockAllFilteredCases,
  getMockCaseStats,
} from "./mocks/casesMockData";

// Toggle: true = read from local mock data, false = call the real backend.
// Flip to false (or set VITE_USE_MOCK_API=false) once GET /cases exists.
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== "false";

// Fetches one page of cases for the table/grid views.
export async function fetchCases(params) {
  if (USE_MOCK_API) {
    return getMockCases(params);
  }
  const { data } = await apiClient.get("/cases", { params });
  return data;
}

// Fetches aggregate counts (total / in progress / processed / failed) for the stat cards.
export async function fetchCaseStats() {
  if (USE_MOCK_API) {
    return getMockCaseStats();
  }
  const { data } = await apiClient.get("/cases/stats");
  return data;
}

// Fetches every case matching the filters, ignoring pagination —
// used by CSV export and the map view, which both need the full result set.
export async function fetchAllFilteredCases({
  status,
  search,
  sortField,
  sortOrder,
} = {}) {
  if (USE_MOCK_API) {
    return getMockAllFilteredCases({ status, search, sortField, sortOrder });
  }
  const { data } = await apiClient.get("/cases", {
    params: { status, search, sortField, sortOrder, page: 1, pageSize: 10000 },
  });
  return data;
}
