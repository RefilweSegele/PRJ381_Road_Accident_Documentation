const pool = require("../config/db");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const uploadConfig = require("../config/upload");

const ESTIMATED_GCP_SOURCE = "AUTO_GENERATED_ESTIMATE_NOT_SURVEY_CONTROL";
const ODM_API_URL = process.env.ODM_API_URL || "http://localhost:3000";

async function generateEstimatedGcps(caseId) {
  const { rows } = await pool.query(
    "SELECT latitude, longitude FROM cases WHERE id = $1",
    [caseId],
  );
  const location = rows[0];
  if (!location || location.latitude == null || location.longitude == null) return [];

  const existing = await pool.query(
    "SELECT 1 FROM gcp_points WHERE case_id = $1 LIMIT 1",
    [caseId],
  );
  if (existing.rowCount) return [];

  const lat = Number(location.latitude);
  const lon = Number(location.longitude);
  const offsets = [
    [0.00018, -0.00028], [0.00018, 0.00028], [0, -0.00034],
    [0, 0], [0, 0.00034], [-0.00018, -0.00028], [-0.00018, 0.00028],
  ];
  const pointIds = offsets.map((_, index) => `EST-GCP-${String(index + 1).padStart(2, "0")}`);
  await pool.query(
    `INSERT INTO gcp_points (case_id, point_id, latitude, longitude, elevation, source_filename)
     SELECT $1::int, u.point_id, u.latitude, u.longitude, NULL, $5::text
     FROM unnest($2::text[], $3::float8[], $4::float8[])
       AS u(point_id, latitude, longitude)
     ON CONFLICT (case_id, point_id) DO NOTHING`,
    [
      caseId,
      pointIds,
      offsets.map(([north]) => lat + north),
      offsets.map(([, east]) => lon + east),
      ESTIMATED_GCP_SOURCE,
    ],
  );
  return pointIds;
}

// Upserts the final .glb model into scene_models so reviewerService.js can read it
async function saveSceneModelRecord(caseId, destPath) {
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
}

// Fallback: copies backend/template_model/template.glb into the case models folder
async function copyFallbackTemplateModel(caseId, destPath) {
  const templateDir = path.join(__dirname, "../../template_model");
  let templatePath = path.join(templateDir, "template.glb");

  if (!fsSync.existsSync(templatePath)) {
    const cubePath = path.join(templateDir, "cube.glb");
    if (fsSync.existsSync(cubePath)) {
      templatePath = cubePath;
    }
  }

  await fs.copyFile(templatePath, destPath);
  return saveSceneModelRecord(caseId, destPath);
}

// Attempts real photogrammetry via NodeODM (port 3000) if online and >= 5 images exist
async function runNodeOdmPipeline(caseId, destPath, storageRoot) {
  const { rows: imageRows } = await pool.query(
    "SELECT storage_key, original_filename FROM case_images WHERE case_id = $1",
    [caseId],
  );

  // Photogrammetry requires overlapping images; fall back to template if < 5 images
  if (imageRows.length < 5) {
    return null;
  }

  // Check if NodeODM is reachable
  const infoRes = await fetch(`${ODM_API_URL}/info`, {
    signal: AbortSignal.timeout(2500),
  });
  if (!infoRes.ok) return null;

  // Build multipart form payload using Node's built-in FormData
  const form = new FormData();
  const options = JSON.stringify([
    { name: "gltf", value: true },
    { name: "pc-quality", value: "low" },
    { name: "resize-to", value: 1280 },
  ]);
  form.append("options", options);

  for (const row of imageRows) {
    const filePath = path.resolve(storageRoot, ...String(row.storage_key).split("/"));
    if (fsSync.existsSync(filePath)) {
      const buffer = await fs.readFile(filePath);
      const blob = new Blob([buffer]);
      form.append("images", blob, row.original_filename || path.basename(filePath));
    }
  }

  const createRes = await fetch(`${ODM_API_URL}/task/new`, {
    method: "POST",
    body: form,
  });
  if (!createRes.ok) return null;

  const { uuid } = await createRes.json();
  if (!uuid) return null;

  // Poll NodeODM until status.code === 40 (COMPLETED) or 30/50 (FAILED/CANCELED)
  while (true) {
    await new Promise((r) => setTimeout(r, 4000));
    const statusRes = await fetch(`${ODM_API_URL}/task/${uuid}/info`);
    if (!statusRes.ok) break;
    const info = await statusRes.json();
    const code = info?.status?.code;

    if (code === 40) {
      // The GLB is created in ODM's odm_texturing directory. Do not request
      // fast-orthophoto above: it deliberately skips dense reconstruction and
      // 3D model generation, leaving only an orthophoto and point cloud.
      const modelPaths = [
        "odm_texturing/odm_textured_model_geo.glb",
        "odm_texturing/odm_textured_model.glb",
      ];

      for (const modelPath of modelPaths) {
        const glbRes = await fetch(
          `${ODM_API_URL}/task/${uuid}/download/${modelPath}`,
        );
        if (!glbRes.ok) continue;

        const arrayBuffer = await glbRes.arrayBuffer();
        const glb = Buffer.from(arrayBuffer);
        if (
          glb.length >= 12 &&
          glb.readUInt32LE(0) === 0x46546c67 &&
          glb.readUInt32LE(4) === 2 &&
          glb.readUInt32LE(8) === glb.length
        ) {
          await fs.writeFile(destPath, glb);
          return saveSceneModelRecord(caseId, destPath);
        }
      }

      console.warn(`NodeODM task ${uuid} completed without a valid GLB for case ${caseId}.`);
      return null;
    }

    if (code === 30 || code === 50) {
      console.warn(`NodeODM task ${uuid} failed for case ${caseId}. Using fallback model.`);
      return null;
    }
  }

  return null;
}

async function ensureSceneModelForCase(caseId) {
  try {
    const storageRoot = uploadConfig.LOCAL_ROOT || path.join(__dirname, "../../uploads");
    const caseModelsDir = path.join(storageRoot, "cases", String(caseId), "models");
    const destPath = path.join(caseModelsDir, `${caseId}.glb`);

    await fs.mkdir(caseModelsDir, { recursive: true });

    // 1. Try live NodeODM processing first
    try {
      const odmModelUrl = await runNodeOdmPipeline(caseId, destPath, storageRoot);
      if (odmModelUrl) return odmModelUrl;
    } catch (odmErr) {
      console.log(`NodeODM offline or skipped for case ${caseId} (${odmErr.message}). Using template fallback.`);
    }

    // 2. Fallback to template.glb so the 3D Viewer always has a valid GLB binary
    return await copyFallbackTemplateModel(caseId, destPath);
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
