import apiClient from './client';
import { getMockCases, getMockCaseStats } from './mocks/casesMockData';

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false';

export async function fetchCases(params) {
  if (USE_MOCK_API) {
    return getMockCases(params);
  }
  const { data } = await apiClient.get('/cases', { params });
  return data;
}

export async function fetchCaseStats() {
  if (USE_MOCK_API) {
    return getMockCaseStats();
  }
  const { data } = await apiClient.get('/cases/stats');
  return data;
}

/**
 * Fetches every case matching the current filters (ignoring pagination) —
 * used for the CSV export button, which should export the full filtered
 * result set, not just the current page.
 */
export async function fetchAllCasesForExport({ status, search, sortField, sortOrder } = {}) {
  if (USE_MOCK_API) {
    return getMockCases({ status, search, sortField, sortOrder, page: 1, pageSize: 10000 });
  }
  const { data } = await apiClient.get('/cases', {
    params: { status, search, sortField, sortOrder, page: 1, pageSize: 10000 },
  });
  return data;
}