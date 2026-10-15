import apiClient from "./client";
import {
  getMockCases,
  getMockAllFilteredCases,
  getMockCaseStats,
  getMockCaseById,
} from "./mocks/casesMockData";

// Toggle: true = read from local mock data, false = call the real backend.
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== "false";

export async function fetchCases(params) {
  if (USE_MOCK_API) return getMockCases(params);
  const { data } = await apiClient.get("/cases", { params });
  return data;
}

export async function fetchCaseStats() {
  if (USE_MOCK_API) return getMockCaseStats();
  const { data } = await apiClient.get("/cases/stats");
  return data;
}

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

// Single case by id. Used by the status page.
export async function fetchCase(id) {
  if (USE_MOCK_API) return getMockCaseById(id);
  const { data } = await apiClient.get(`/cases/${id}`);
  return data;
}

// Creates a case. Returns the saved case, including the server-generated
// id and caseReference (e.g. CASE-2026-0001).
export async function createCase(payload) {
  if (USE_MOCK_API) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return { id: `c-${Date.now()}`, caseReference: "MOCK-REF", ...payload };
  }
  const { data } = await apiClient.post("/cases", payload);
  return data;
}