const pool = require("../config/db");

async function getCompleteCases({ search, dateFrom, dateTo } = {}) {
  const conditions = ["status = $1"];
  const params = ["Complete"];
  const keyword = search?.trim();

  if (keyword) {
    params.push(`%${keyword}%`);
    // Use a parameter for the keyword rather than interpolating user input into SQL.
    conditions.push(
      `(case_reference ILIKE $${params.length} OR incident_address ILIKE $${params.length})`,
    );
  }

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`incident_date::date >= $${params.length}::date`);
  }

  if (dateTo) {
    params.push(dateTo);
    conditions.push(`incident_date::date <= $${params.length}::date`);
  }

  const result = await pool.query(
    `SELECT id, case_reference, incident_address, incident_date, status
     FROM cases
     WHERE ${conditions.join(" AND ")}
     ORDER BY incident_date DESC NULLS LAST`,
    params,
  );

  return result.rows;
}

module.exports = { getCompleteCases };
