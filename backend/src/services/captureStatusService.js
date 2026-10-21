const pool = require("../config/db");

// A case becomes reviewer-visible only after all capture artefacts exist in
// PostgreSQL. The check runs after every image, GCP, or flight-log mutation so
// the status never depends on a browser-provided value.
async function refreshCaptureStatus(caseId) {
  const { rows } = await pool.query(
    `SELECT
       EXISTS (SELECT 1 FROM case_images WHERE case_id = $1) AS has_images,
       EXISTS (SELECT 1 FROM gcp_points WHERE case_id = $1) AS has_gcps,
       EXISTS (SELECT 1 FROM flight_logs WHERE case_id = $1) AS has_flight_log`,
    [caseId],
  );

  const artefacts = rows[0];
  const ready = artefacts.has_images && artefacts.has_gcps && artefacts.has_flight_log;
  const status = ready ? "processed" : "processing";

  // A reviewer decision or explicit failure must not be overwritten by an
  // investigator adding capture data later.
  await pool.query(
    `UPDATE cases
     SET status = $1, updated_at = NOW()
     WHERE id = $2 AND status NOT IN ('reviewed', 'failed')`,
    [status, caseId],
  );

  return { status, ready, ...artefacts };
}

module.exports = { refreshCaptureStatus };
