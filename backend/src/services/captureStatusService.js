const pool = require("../config/db");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const uploadConfig = require("../config/upload");

const ESTIMATED_GCP_SOURCE = "AUTO_GENERATED_ESTIMATE_NOT_SURVEY_CONTROL";

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

  const lat = Number(location.latitude);
  const lon = Number(location.longitude);
  const offsets = [[0.00018, -0.00028], [0.00018, 0.00028], [0, -0.00034],
    [0, 0], [0, 0.00034], [-0.00018, -0.00028], [-0.00018, -0.00028]];
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

// Copies template.glb into uploads/cases/{caseId}/models/{caseId}.glb and upserts scene_models
async function ensureSceneModelForCase(caseId) {
  try {
    const templateDir = path.join(__dirname, "../../template_model");
    let templatePath = path.join(templateDir, "template.glb");

    // Fallback in case the file is still named cube.glb
    if (!fsSync.existsSync(templatePath)) {
      const cubePath = path.join(templateDir, "cube.glb");
      if (fsSync.existsSync(cubePath)) {
        templatePath = cubePath;
      }
    }

    const storageRoot = uploadConfig.LOCAL_ROOT || path.join(__dirname, "../../uploads");
    const caseModelsDir = path.join(storageRoot, "cases", String(caseId), "models");
    const destPath = path.join(caseModelsDir, `${caseId}.glb`);

    await fs.mkdir(caseModelsDir, { recursive: true });
    await fs.copyFile(templatePath, destPath);

    const stats = await fs.stat(destPath);
    const modelUrl = `http://localhost:5000/static/uploads/cases/${caseId}/models/${caseId}.glb`;

    await pool.query(
      `INSERT INTO scene_models (case_id, model_key, format, file_size_bytes)
       VALUES ($1, $2, 'glb', $3)
       ON CONFLICT (case_id)
       DO UPDATE SET
         model_key = EXCLUDED.model_key,
         format = EXCLUDED.format,
         file_size_bytes = EXCLUDED.file_size_bytes,
         updated_at = NOW()`,
      [caseId, modelUrl, stats.size],
    );

    return modelUrl;
  } catch (error) {
    console.error(`Failed to provision 3D model for case ${caseId}:`, error.message);
    return null;
  }
}

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

  await pool.query(
    `UPDATE cases
     SET status = $1, updated_at = NOW()
     WHERE id = $2 AND status NOT IN ('reviewed', 'failed')`,
    [status, caseId],
  );

  if (status === "processed") {
    await ensureSceneModelForCase(caseId);
  }

  return { status, ready, generatedEstimatedGcps: generatedGcpIds.length, ...artefacts };
}

module.exports = { refreshCaptureStatus, ensureSceneModelForCase };