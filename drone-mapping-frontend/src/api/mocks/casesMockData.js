/**
 * Mock data layer for the Investigator Case Dashboard.
 *
 * This exists so the dashboard is demoable (Milestone 2 requires a working
 * prototype video) before the real GET /cases backend endpoint exists.
 * Once that endpoint is ready, delete this file and flip USE_MOCK_API to
 * false in ../cases.js.
 */

const STATUSES = [
  "draft",
  "uploaded",
  "processing",
  "processed",
  "reviewed",
  "failed",
];

const INVESTIGATORS = [
  "T. Nkosi",
  "S. van Wyk",
  "M. Pudikabekwa",
  "L. Dlamini",
  "R. Mokoene",
];

const LOCATIONS = [
  "N1 Highway, Pretoria",
  "M1 Off-ramp, Sandton",
  "R21, Kempton Park",
  "Church Street, Pretoria CBD",
  "William Nicol Drive, Fourways",
  "N4 Toll Road, Witbank",
  "Voortrekker Road, Bellville",
];

function buildMockCases(total = 47) {
  const now = Date.now();
  const DAY = 86_400_000;

  return Array.from({ length: total }, (_, i) => {
    const daysAgo = total - i;
    const incidentDate = new Date(now - daysAgo * DAY).toISOString();
    const updatedAt = new Date(
      now - Math.max(daysAgo - 1, 0) * DAY - i * 3_600_000,
    ).toISOString();

    return {
      id: `c-${1000 + i}`,
      caseReference: `2026-${String(1000 + i).padStart(4, "0")}`,
      incidentAddress: LOCATIONS[i % LOCATIONS.length],
      incidentDate,
      createdAt: incidentDate,
      updatedAt,
      status: STATUSES[i % STATUSES.length],
      assignedInvestigator: INVESTIGATORS[i % INVESTIGATORS.length],
      vehicleCount: (i % 4) + 1,
    };
  });
}

const MOCK_CASES = buildMockCases();

function sortCases(cases, field, order) {
  const sorted = [...cases].sort((a, b) => {
    if (a[field] < b[field]) return -1;
    if (a[field] > b[field]) return 1;
    return 0;
  });
  return order === "ascend" ? sorted : sorted.reverse();
}

/**
 * Simulates GET /cases?status=&search=&page=&pageSize=&sortField=&sortOrder=
 */
export async function getMockCases({
  status,
  search,
  page = 1,
  pageSize = 10,
  sortField = "updatedAt",
  sortOrder = "descend",
} = {}) {
  await new Promise((resolve) => setTimeout(resolve, 350));

  let results = MOCK_CASES;

  if (status) {
    results = results.filter((c) => c.status === status);
  }

  if (search) {
    const term = search.toLowerCase();
    results = results.filter(
      (c) =>
        c.caseReference.toLowerCase().includes(term) ||
        c.incidentAddress.toLowerCase().includes(term),
    );
  }

  results = sortCases(results, sortField, sortOrder);

  const total = results.length;
  const start = (page - 1) * pageSize;
  const data = results.slice(start, start + pageSize);

  return { data, total, page, pageSize };
}

/**
 * Aggregates counts across the full (unfiltered) mock dataset for the
 * summary stat cards. Mirrors what a real /cases/stats endpoint would do
 * with a SQL COUNT/GROUP BY on the backend.
 */
export async function getMockCaseStats() {
  await new Promise((resolve) => setTimeout(resolve, 250));

  const total = MOCK_CASES.length;
  const inProgress = MOCK_CASES.filter(
    (c) => c.status === "uploaded" || c.status === "processing",
  ).length;
  const processed = MOCK_CASES.filter(
    (c) => c.status === "processed" || c.status === "reviewed",
  ).length;
  const failed = MOCK_CASES.filter((c) => c.status === "failed").length;

  return { total, inProgress, processed, failed };
}
