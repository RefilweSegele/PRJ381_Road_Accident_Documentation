import apiClient from "./client";

export async function fetchCases(params) {
  const { data } = await apiClient.get("/cases", { params });
  return data;
}

export async function fetchCaseStats() {
  const { data } = await apiClient.get("/cases/stats");
  return data;
}

export async function fetchAllFilteredCases({
  status,
  search,
  sortField,
  sortOrder,
} = {}) {
  const { data } = await apiClient.get("/cases", {
    params: { status, search, sortField, sortOrder, page: 1, pageSize: 10000 },
  });
  return data;
}

// Single case by id. Used by the status page.
export async function fetchCase(id) {
  const { data } = await apiClient.get(`/cases/${id}`);
  return data;
}

// Creates a case. Returns the saved case, including the server-generated
// id and caseReference (e.g. CASE-2026-0001).
export async function createCase(payload) {
  const { data } = await apiClient.post("/cases", payload);
  return data;
}
