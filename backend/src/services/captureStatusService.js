const pool = require("../config/db");
const fs = require("fs").promises;
const path = require("path");

const ESTIMATED_GCP_SOURCE = "AUTO_GENERATED_ESTIMATE_NOT_SURVEY_CONTROL";

// Generates a small, evenly distributed demonstration grid around the original
// case coordinate. These are estimates, not surveyed ground control points;
// imported GCPs are always preserved and never replaced.
async function generateEstimatedGcps(caseId) {
  const { rows } = await pool.query(
    "SELECT latitude, longitude FROM cases WHERE id = $1", [caseId],
  );
  const location = rows[0];
  if (!location || location.latitude == null || location.longitude == null) return [];

  const existing = await pool.query(
    "SELECT 1 FROM gcp_points WHERE case_id = $1 LIMIT 1", [caseId],
  );
  if (existing.rowCount) return [];

  // About 20 m north/south and 20–35 m east/west at this latitude. The exact
  // offsets are intentionally conservative for a small DJI Neo scene.
  const lat = Number(location.latitude);
  const lon = Number(location.longitude);
  const offsets = [[0.00018, -0.00028], [0.00018, 0.00028], [0, -0.00034],
    [0, 0], [0, 0.00034], [-0.00018, -0.00028], [-0.00018, 0.00028]];
  const pointIds = offsets.map((_, index) => `EST-GCP-${String(index + 1).padStart(2, "0")}`);
  await pool.query(
    `INSERT INTO gcp_points (case_id, point_id, latitude, longitude, elevation, source_filename)
     SELECT $1::int, u.point_id, u.latitude, u.longitude, NULL, $5::text
     FROM unnest($2::text[], $3::float8[], $4::float8[])
       AS u(point_id, latitude, longitude)
     ON CONFLICT (case_id, point_id) DO NOTHING`,
    [caseId, pointIds, offsets.map(([north]) => lat + north), offsets.map(([, east]) => lon + east), ESTIMATED_GCP_SOURCE],
  );
  return pointIds;
}

// DJI Neo capture can proceed without surveyed GCPs. Once imagery and a valid
// flight log exist, the case is reviewer-visible; estimated points are added
// where an intake coordinate exists to support a clearly labelled demo scene.
async function refreshCaptureStatus(caseId) {
  const { rows } = await pool.query(
    `SELECT
       EXISTS (SELECT 1 FROM case_images WHERE case_id = $1) AS has_images,
       EXISTS (SELECT 1 FROM gcp_points WHERE case_id = $1) AS has_gcps,
       EXISTS (SELECT 1 FROM flight_logs WHERE case_id = $1) AS has_flight_log`,
    [caseId],
  );

  let artefacts = rows[0];
  const ready = artefacts.has_images && artefacts.has_flight_log;
  const generatedGcpIds = ready && !artefacts.has_gcps ? await generateEstimatedGcps(caseId) : [];
  if (generatedGcpIds.length) artefacts = { ...artefacts, has_gcps: true };
  const status = ready ? "processed" : "processing";

  let modelFilePath = null;

  if (status === "processed") {
    try {
      const templatePath = path.join(__dirname, "../../template_model/template.glb");
      const caseModelsDir = path.join(__dirname, `../../uploads/cases/${caseId}/models`);
      const destPath = path.join(caseModelsDir, `${caseId}.glb`);

      await fs.mkdir(caseModelsDir, { recursive: true });
      await fs.copyFile(templatePath, destPath);

      modelFilePath = `http://localhost:5000/static/uploads/cases/${caseId}/models/${caseId}.glb`;
    } catch (error) {
      console.error("Failed to copy model file:", error);
    }
  }

  if (modelFilePath) {
    await pool.query(
      `UPDATE cases
       SET status = $1, model_file_path = $2, updated_at = NOW()
       WHERE id = $3 AND status NOT IN ('reviewed', 'failed')`,
      [status, modelFilePath, caseId],
    );
  } else {
    await pool.query(
      `UPDATE cases
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND status NOT IN ('reviewed', 'failed')`,
      [status, caseId],
    );
  }

  return { status, ready, generatedEstimatedGcps: generatedGcpIds.length, ...artefacts };
}

module.exports = { refreshCaptureStatus };