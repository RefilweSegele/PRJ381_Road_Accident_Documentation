/**
 * Mock data layer for the Investigator Case Dashboard.
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
  { name: "N1 Highway, Pretoria", lat: -25.7069, lng: 28.2294 },
  { name: "M1 Off-ramp, Sandton", lat: -26.1076, lng: 28.0567 },
  { name: "R21, Kempton Park", lat: -26.1015, lng: 28.2294 },
  { name: "Church Street, Pretoria CBD", lat: -25.7461, lng: 28.1881 },
  { name: "William Nicol Drive, Fourways", lat: -26.0175, lng: 28.0106 },
  { name: "N4 Toll Road, Witbank", lat: -25.8768, lng: 29.2044 },
  { name: "Voortrekker Road, Bellville", lat: -33.8952, lng: 18.6293 },
];

// Groups the stat cards filter by — a stat card sets `status` to one of
// these keys, and matching cases can have ANY of the raw statuses listed.
export const STATUS_GROUPS = {
  inProgress: ["uploaded", "processing"],
  processed: ["processed", "reviewed"],
  failed: ["failed"],
};

function buildMockCases(total = 47) {
  const now = Date.now();
  const DAY = 86_400_000;

  return Array.from({ length: total }, (_, i) => {
    const daysAgo = total - i;
    const incidentDate = new Date(now - daysAgo * DAY).toISOString();
    const updatedAt = new Date(
      now - Math.max(daysAgo - 1, 0) * DAY - i * 3_600_000,
    ).toISOString();

    const base = LOCATIONS[i % LOCATIONS.length];
    const jitter = (i % 5) * 0.008 - 0.016;

    return {
      id: `c-${1000 + i}`,
      caseReference: `PRJ381-2026-${String(1000 + i).padStart(4, "0")}`,
      incidentAddress: base.name,
      location: { lat: base.lat + jitter, lng: base.lng + jitter },
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

function applyFilters({ status, search }) {
  let results = MOCK_CASES;

  if (status) {
    const group = STATUS_GROUPS[status];
    results = group
      ? results.filter((c) => group.includes(c.status))
      : results.filter((c) => c.status === status);
  }

  if (search) {
    const term = search.toLowerCase();
    results = results.filter(
      (c) =>
        c.caseReference.toLowerCase().includes(term) ||
        c.incidentAddress.toLowerCase().includes(term),
    );
  }

  return results;
}

export async function getMockCases({
  status,
  search,
  page = 1,
  pageSize = 10,
  sortField = "updatedAt",
  sortOrder = "descend",
} = {}) {
  await new Promise((resolve) => setTimeout(resolve, 350));

  const results = sortCases(
    applyFilters({ status, search }),
    sortField,
    sortOrder,
  );

  const total = results.length;
  const start = (page - 1) * pageSize;
  const data = results.slice(start, start + pageSize);

  return { data, total, page, pageSize };
}

export async function getMockAllFilteredCases({
  status,
  search,
  sortField = "updatedAt",
  sortOrder = "descend",
} = {}) {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const data = sortCases(
    applyFilters({ status, search }),
    sortField,
    sortOrder,
  );
  return { data, total: data.length };
}

export async function getMockCaseStats() {
  await new Promise((resolve) => setTimeout(resolve, 250));

  const total = MOCK_CASES.length;
  const inProgress = MOCK_CASES.filter((c) =>
    STATUS_GROUPS.inProgress.includes(c.status),
  ).length;
  const processed = MOCK_CASES.filter((c) =>
    STATUS_GROUPS.processed.includes(c.status),
  ).length;
  const failed = MOCK_CASES.filter((c) =>
    STATUS_GROUPS.failed.includes(c.status),
  ).length;

  return { total, inProgress, processed, failed };
}
