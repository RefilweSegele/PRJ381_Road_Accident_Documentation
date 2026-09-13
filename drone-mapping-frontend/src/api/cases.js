import apiClient from "./client";
import { getMockCases } from "./mocks/casesMockData";

// Flip to false (or set VITE_USE_MOCK_API=false in .env) once the backend
// team exposes a real GET /cases endpoint returning:
//   { data: Case[], total: number, page: number, pageSize: number }
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== "false";

/**
 * Fetch a page of cases for the Investigator Dashboard.
 * @param {{status?: string, search?: string, page?: number, pageSize?: number, sortField?: string, sortOrder?: 'ascend'|'descend'}} params
 */
export async function fetchCases(params) {
  if (USE_MOCK_API) {
    return getMockCases(params);
  }

  const { data } = await apiClient.get("/cases", { params });
  return data;
}
