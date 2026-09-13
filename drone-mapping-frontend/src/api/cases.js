import apiClient from "./client";
import {
  getMockCases,
  getMockAllFilteredCases,
  getMockCaseStats,
} from "./mocks/casesMockData";

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== "false";

export async function fetchCases(params) {
  if (USE_MOCK_API) {
    return getMockCases(params);
  }
  const { data } = await apiClient.get("/cases", { params });
  return data;
}

export async function fetchCaseStats() {
  if (USE_MOCK_API) {
    return getMockCaseStats();
  }
  const { data } = await apiClient.get("/cases/stats");
  return data;
}

/*
 Fetches every case matching the current filters, ignoring pagination.
 Used by the CSV export button and the map view (which wants to plot
 all matching cases at once, not just the current page).
 */
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
