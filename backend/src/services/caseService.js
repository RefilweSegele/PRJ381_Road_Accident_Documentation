const pool = require("../config/db");

// Groups the stat-card "quick filter" values map to on the frontend —
// clicking "In Progress" sends status=inProgress, which isn't a real
// column value, so it needs expanding into the raw statuses it covers.
const STATUS_GROUPS = {
  inProgress: ["uploaded", "processing"],
  processed: ["processed", "reviewed"],
  failed: ["failed"],
};

// Only these columns may be sorted on — prevents SQL injection via sortField.
const SORTABLE_COLUMNS = {
  incidentDate: "incident_date",
  updatedAt: "updated_at",
  caseReference: "case_reference",
  status: "status",
};

// Converts a DB row (snake_case) into the shape the frontend expects (camelCase).
// vehicleCount is hardcoded to 0 until vehicles table exists —
// once it does, this becomes a COUNT() join instead.
function toApiCase(row) {
  return {
    id: row.id,
    caseReference: row.case_reference,
    incidentAddress: row.incident_address,
    location: { lat: row.latitude, lng: row.longitude },
    incidentDate: row.incident_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    assignedInvestigator: row.assigned_investigator,
    vehicleCount: 0, // TODO: replace with real count once vehicles table exists
  };
}

// Builds the WHERE clause + params shared by list, count, and stats queries.
function buildFilters({ status, search }) {
  const conditions = [];
  const params = [];

  if (status) {
    const group = STATUS_GROUPS[status];
    if (group) {
      // status is a group key (e.g. "inProgress") — match any status in the group.
      params.push(group);
      conditions.push(`status = ANY($${params.length})`);
    } else {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
  }

  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    conditions.push(
      `(case_reference ILIKE $${idx} OR incident_address ILIKE $${idx})`,
    );
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";
  return { whereClause, params };
}

// Fetches one page of cases matching the filters, plus the total count for pagination.
async function listCases({
  status,
  search,
  page = 1,
  pageSize = 10,
  sortField,
  sortOrder,
}) {
  const { whereClause, params } = buildFilters({ status, search });

  const column = SORTABLE_COLUMNS[sortField] || "updated_at";
  const direction = sortOrder === "ascend" ? "ASC" : "DESC";

  const offset = (page - 1) * pageSize;
  const dataParams = [...params, pageSize, offset];

  const dataQuery = `
    SELECT * FROM cases
    ${whereClause}
    ORDER BY ${column} ${direction}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  const countQuery = `SELECT COUNT(*) FROM cases ${whereClause}`;

  const [dataResult, countResult] = await Promise.all([
    pool.query(dataQuery, dataParams),
    pool.query(countQuery, params),
  ]);

  return {
    data: dataResult.rows.map(toApiCase),
    total: parseInt(countResult.rows[0].count, 10),
    page,
    pageSize,
  };
}

// Fetches every case matching the filters, no pagination — used for
// CSV export and the map view on the frontend.
async function listAllFilteredCases({ status, search, sortField, sortOrder }) {
  const { whereClause, params } = buildFilters({ status, search });
  const column = SORTABLE_COLUMNS[sortField] || "updated_at";
  const direction = sortOrder === "ascend" ? "ASC" : "DESC";

  const query = `SELECT * FROM cases ${whereClause} ORDER BY ${column} ${direction}`;
  const result = await pool.query(query, params);

  return { data: result.rows.map(toApiCase), total: result.rows.length };
}

// Aggregate counts for the dashboard's 4 stat cards.
async function getCaseStats() {
  const result = await pool.query(
    "SELECT status, COUNT(*) FROM cases GROUP BY status",
  );
  const counts = Object.fromEntries(
    result.rows.map((r) => [r.status, parseInt(r.count, 10)]),
  );

  const sum = (statuses) =>
    statuses.reduce((total, s) => total + (counts[s] || 0), 0);

  return {
    total: Object.values(counts).reduce((a, b) => a + b, 0),
    inProgress: sum(STATUS_GROUPS.inProgress),
    processed: sum(STATUS_GROUPS.processed),
    failed: sum(STATUS_GROUPS.failed),
  };
}

// Fetches a single case by id, or null if it doesn't exist.
async function getCaseById(id) {
  const result = await pool.query("SELECT * FROM cases WHERE id = $1", [id]);
  return result.rows[0] ? toApiCase(result.rows[0]) : null;
}

// Generates the next human-readable case reference, e.g. CASE-2026-0001.
async function generateCaseReference() {
  const { rows } = await pool.query("SELECT nextval('case_reference_seq') AS n");
  const year = new Date().getFullYear();
  const n = String(rows[0].n).padStart(4, '0');
  return `CASE-${year}-${n}`;
}

// Inserts a new case row.
async function createCase({
  incidentAddress,
  incidentDate,
  latitude,
  longitude,
  assignedInvestigator,
}) {
  const caseReference = await generateCaseReference();

  const result = await pool.query(
    `INSERT INTO cases (case_reference, incident_address, incident_date, latitude, longitude, assigned_investigator)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      caseReference,
      incidentAddress,
      incidentDate,
      latitude ?? null,
      longitude ?? null,
      assignedInvestigator ?? null,
    ],
  );

  return toApiCase(result.rows[0]);
}

// Updates only the fields provided — untouched fields keep their current value.
async function updateCase(id, updates) {
  const fieldMap = {
    incidentAddress: "incident_address",
    incidentDate: "incident_date",
    status: "status",
    assignedInvestigator: "assigned_investigator",
  };

  const setClauses = [];
  const params = [];

  for (const [key, column] of Object.entries(fieldMap)) {
    if (updates[key] !== undefined) {
      params.push(updates[key]);
      setClauses.push(`${column} = $${params.length}`);
    }
  }

  if (updates.location?.lat !== undefined) {
    params.push(updates.location.lat);
    setClauses.push(`latitude = $${params.length}`);
  }
  if (updates.location?.lng !== undefined) {
    params.push(updates.location.lng);
    setClauses.push(`longitude = $${params.length}`);
  }

  if (setClauses.length === 0) {
    return getCaseById(id); // nothing to update, just return current state
  }

  setClauses.push("updated_at = NOW()");
  params.push(id);

  const result = await pool.query(
    `UPDATE cases SET ${setClauses.join(", ")} WHERE id = $${params.length} RETURNING *`,
    params,
  );

  return result.rows[0] ? toApiCase(result.rows[0]) : null;
}

// Deletes a case by id. Returns true if a row was actually deleted.
async function deleteCase(id) {
  const result = await pool.query("DELETE FROM cases WHERE id = $1", [id]);
  return result.rowCount > 0;
}

module.exports = {
  listCases,
  listAllFilteredCases,
  getCaseStats,
  getCaseById,
  createCase,
  updateCase,
  deleteCase,
};
