// The whole "drone images -> 3D model + damage detection" pipeline for one case.
//
//   UPLOADING        send the case's JPEGs to WebODM (partial upload + commit)
//   PHOTOGRAMMETRY   WebODM builds the textured 3D mesh (we poll its progress)
//   IMPORTING_MODEL  download the model, convert to .glb, store, save scene_models row
//   DAMAGE_DETECTION run the YOLO model on every drone image, save damage_detections
//   DONE             case.status = 'processed'  -> viewer + reports can use it
//
// One row per run in processing_jobs. The run happens in the background of the
// Node process; the browser just polls GET /api/cases/:id/process/status.
const fsp = require("fs/promises");
const path = require("path");
const pool = require("../config/db");
const uploadCfg = require("../config/upload");
const cfg = require("../config/webodm");
const webodm = require("./webodmClient");
const { importTexturedModel } = require("./modelImportService");
const { runDamageBatch } = require("./damageBatchService");
const { AppError } = require("../middleware/errorHandler");

const STAGE_RANGE = {
  UPLOADING: [0, 20],
  PHOTOGRAMMETRY: [20, 85],
  IMPORTING_MODEL: [85, 92],
  DAMAGE_DETECTION: [92, 99],
};

// Engine options per quality level. Only options the connected WebODM node
// actually reports are sent (see webodmClient.getNodeOptionNames).
const QUALITY_PRESETS = {
  draft: { "feature-quality": "medium", "pc-quality": "low", "mesh-octree-depth": 10, "mesh-size": 100000 },
  standard: { "feature-quality": "high", "pc-quality": "medium", "mesh-octree-depth": 11, "mesh-size": 200000 },
  high: { "feature-quality": "high", "pc-quality": "high", "mesh-octree-depth": 12, "mesh-size": 300000 },
};
const COMMON_OPTIONS = { "auto-boundary": true };

class CancelledError extends Error {}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const scale = (stage, fraction) => {
  const [lo, hi] = STAGE_RANGE[stage];
  return Math.round(lo + (hi - lo) * Math.min(1, Math.max(0, fraction)));
};

// ---------------------------------------------------------------- job helpers
const getJob = async (jobId) =>
  (await pool.query("SELECT * FROM processing_jobs WHERE id = $1", [jobId])).rows[0];

async function getLatestJob(caseId) {
  const { rows } = await pool.query(
    "SELECT * FROM processing_jobs WHERE case_id = $1 ORDER BY id DESC LIMIT 1", [caseId],
  );
  return rows[0] || null;
}

// Keys come from this file only (never from a request), so building SQL from them is safe.
async function updateJob(jobId, patch) {
  const keys = Object.keys(patch);
  if (!keys.length) return;
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
  await pool.query(`UPDATE processing_jobs SET ${sets} WHERE id = $1`, [jobId, ...keys.map((k) => patch[k])]);
}

// Conditional on status so a cancel that lands at this exact moment is never undone.
async function setStage(jobId, stage, progress) {
  await pool.query(
    "UPDATE processing_jobs SET stage = $2, progress = $3, status = 'running' WHERE id = $1 AND status <> 'failed'",
    [jobId, stage, progress],
  );
}

async function appendLog(jobId, lines) {
  const text = (Array.isArray(lines) ? lines : [lines]).join("\n");
  if (!text) return;
  await pool.query(
    "UPDATE processing_jobs SET log = right(log || $2 || E'\\n', 20000) WHERE id = $1", [jobId, text],
  );
}

async function assertNotCancelled(jobId) {
  const job = await getJob(jobId);
  if (!job || job.status === "failed") throw new CancelledError("Cancelled");
}

const setCaseStatus = (caseId, status) =>
  pool.query("UPDATE cases SET status = $2, updated_at = NOW() WHERE id = $1", [caseId, status]);

function toApiJob(row) {
  if (!row) return null;
  return {
    id: row.id,
    caseId: row.case_id,
    stage: row.stage,
    status: row.status,
    progress: row.progress,
    quality: row.quality,
    imageCount: row.image_count,
    error: row.error_message,
    warning: row.warning,
    log: (row.log || "").split("\n").filter(Boolean).slice(-40),
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    createdAt: row.created_at,
  };
}

// ------------------------------------------------------------------ public API
async function startProcessing(caseId, { quality = "standard", requestedBy = null } = {}) {
  if (uploadCfg.STORAGE_DRIVER !== "local") {
    throw new AppError("3D processing currently needs UPLOAD_STORAGE_DRIVER=local", 501, "STORAGE_UNSUPPORTED");
  }
  if (!QUALITY_PRESETS[quality]) {
    throw new AppError(`quality must be one of: ${Object.keys(QUALITY_PRESETS).join(", ")}`, 400, "INVALID_QUALITY");
  }

  const { rows: caseRows } = await pool.query("SELECT status FROM cases WHERE id = $1", [caseId]);
  if (caseRows[0]?.status === "reviewed") {
    throw new AppError("This case has already been reviewed and cannot be reprocessed", 409, "CASE_REVIEWED");
  }

  const { rows: cnt } = await pool.query("SELECT COUNT(*)::int AS n FROM case_images WHERE case_id = $1", [caseId]);
  const imageCount = cnt[0].n;
  if (imageCount < cfg.MIN_IMAGES) {
    throw new AppError(
      `At least ${cfg.MIN_IMAGES} drone images are needed for a 3D reconstruction (this case has ${imageCount})`,
      422, "NOT_ENOUGH_IMAGES",
    );
  }

  // Fail fast (and visibly) if WebODM is down or the credentials are wrong.
  let info;
  try {
    info = await webodm.health();
  } catch (e) {
    throw new AppError(e.message, e.status === 503 ? 503 : 502, "WEBODM_UNAVAILABLE");
  }
  if (!info.nodes.some((n) => n.online)) {
    throw new AppError(
      "WebODM is running but has no processing node online. Open WebODM > Processing Nodes and check it.",
      503, "WEBODM_NO_NODE",
    );
  }

  let job;
  try {
    const { rows } = await pool.query(
      `INSERT INTO processing_jobs (case_id, stage, status, progress, quality, image_count, requested_by, log)
       VALUES ($1, 'QUEUED', 'queued', 0, $2, $3, $4, '') RETURNING *`,
      [caseId, quality, imageCount, requestedBy],
    );
    job = rows[0];
  } catch (e) {
    if (e.code === "23505") throw new AppError("This case is already being processed", 409, "ALREADY_PROCESSING");
    throw e;
  }
  await setCaseStatus(caseId, "processing");

  setImmediate(() => {
    runPipeline(job.id).catch((e) => console.error("Pipeline crashed:", e));
  });
  return toApiJob(job);
}

async function cancelProcessing(caseId) {
  const { rows } = await pool.query(
    "SELECT * FROM processing_jobs WHERE case_id = $1 AND status IN ('queued','running') ORDER BY id DESC LIMIT 1",
    [caseId],
  );
  const job = rows[0];
  if (!job) throw new AppError("This case is not being processed", 409, "NOT_PROCESSING");

  await updateJob(job.id, { status: "failed", error_message: "Cancelled by user", finished_at: new Date() });
  // back to 'uploaded' (images + flight log present) or 'draft' - decided by the DB function from migration 015
  await setCaseStatus(caseId, "draft");
  await pool.query("SELECT refresh_case_capture_status($1)", [caseId]);
  if (job.webodm_project_id && job.webodm_task_id) {
    webodm.cancelTask(job.webodm_project_id, job.webodm_task_id).catch(() => {});
  }
  return toApiJob(await getJob(job.id));
}

async function getStatus(caseId) {
  const [job, caseRow, scene, det] = await Promise.all([
    getLatestJob(caseId),
    pool.query("SELECT status FROM cases WHERE id = $1", [caseId]),
    pool.query("SELECT format, file_size_bytes, georeferenced, updated_at FROM scene_models WHERE case_id = $1", [caseId]),
    pool.query("SELECT COUNT(*)::int AS n FROM damage_detections WHERE case_id = $1", [caseId]),
  ]);
  return {
    caseId,
    caseStatus: caseRow.rows[0]?.status,
    job: toApiJob(job),
    model: scene.rows[0]
      ? {
        ready: true,
        format: scene.rows[0].format,
        sizeBytes: scene.rows[0].file_size_bytes,
        georeferenced: scene.rows[0].georeferenced,
        updatedAt: scene.rows[0].updated_at,
      }
      : { ready: false },
    detectionCount: det.rows[0].n,
  };
}

// --------------------------------------------------------------------- pipeline
async function buildOptions(quality) {
  const wanted = { ...COMMON_OPTIONS, ...QUALITY_PRESETS[quality] };
  const known = await webodm.getNodeOptionNames();
  return Object.entries(wanted)
    .filter(([name]) => !known || known.has(name))
    .map(([name, value]) => ({ name, value }));
}

function absPathForKey(storageKey) {
  const root = path.resolve(uploadCfg.LOCAL_ROOT);
  const full = path.resolve(root, ...storageKey.split("/"));
  if (!full.startsWith(root + path.sep)) throw new Error(`Unsafe storage key: ${storageKey}`);
  return full;
}

async function loadCaseImages(caseId) {
  const { rows } = await pool.query(
    "SELECT id, storage_key, original_filename FROM case_images WHERE case_id = $1 ORDER BY uploaded_at, id", [caseId],
  );
  return rows.map((r) => ({ ...r, absPath: absPathForKey(r.storage_key) }));
}

async function stageUpload(job) {
  const { id: jobId, case_id: caseId } = job;
  await setStage(jobId, "UPLOADING", 0);

  const images = await loadCaseImages(caseId);
  for (const img of images) {
    await fsp.access(img.absPath).catch(() => {
      throw new Error(`Image file is missing on disk: ${img.original_filename} (${img.storage_key})`);
    });
  }

  // One WebODM project per case; reuse it when the case is processed again.
  const prev = await pool.query(
    `SELECT webodm_project_id, webodm_task_id FROM processing_jobs
      WHERE case_id = $1 AND id <> $2 AND webodm_project_id IS NOT NULL ORDER BY id DESC`,
    [caseId, jobId],
  );
  let projectId = null;
  if (prev.rows[0]) {
    projectId = prev.rows[0].webodm_project_id;
    await webodm.getProject(projectId).catch(() => { projectId = null; }); // deleted in WebODM?
  }
  if (projectId) {
    // free disk space in WebODM: drop tasks from earlier runs (best effort)
    for (const r of prev.rows) {
      if (r.webodm_task_id) webodm.removeTask(r.webodm_project_id, r.webodm_task_id).catch(() => {});
    }
  } else {
    const { rows } = await pool.query("SELECT case_reference FROM cases WHERE id = $1", [caseId]);
    projectId = (await webodm.createProject(`DAIAS ${rows[0].case_reference}`, "Created by DAIAS")).id;
  }

  const options = await buildOptions(job.quality);
  await appendLog(jobId, `WebODM project ${projectId}; options: ${JSON.stringify(options)}`);
  const task = await webodm.createPartialTask(projectId, { name: `Case ${caseId} run ${jobId}`, options });
  const taskId = task.id;

  for (let i = 0; i < images.length; i += cfg.UPLOAD_BATCH) {
    await assertNotCancelled(jobId);
    const batch = images.slice(i, i + cfg.UPLOAD_BATCH).map((img, k) => ({
      path: img.absPath,
      // index prefix keeps names unique when two flights reuse DJI_0001.JPG
      name: `${String(i + k + 1).padStart(4, "0")}_${img.original_filename}`,
    }));
    await webodm.uploadFiles(projectId, taskId, batch);
    const done = Math.min(images.length, i + batch.length);
    await updateJob(jobId, { progress: scale("UPLOADING", done / images.length) });
  }

  await assertNotCancelled(jobId);
  await webodm.commitTask(projectId, taskId);
  await updateJob(jobId, { webodm_project_id: projectId, webodm_task_id: String(taskId) });
  await appendLog(jobId, `Uploaded ${images.length} images; WebODM task ${taskId} started.`);
}

async function stagePhotogrammetry(job) {
  const jobId = job.id;
  const projectId = job.webodm_project_id;
  const taskId = job.webodm_task_id;
  await setStage(jobId, "PHOTOGRAMMETRY", STAGE_RANGE.PHOTOGRAMMETRY[0]);

  const deadline = Date.now() + cfg.MAX_MINUTES * 60 * 1000;
  let logLine = 0;
  let consecutiveErrors = 0;

  for (;;) {
    await assertNotCancelled(jobId);
    let task;
    try {
      task = await webodm.getTask(projectId, taskId);
      consecutiveErrors = 0;
    } catch (e) {
      consecutiveErrors += 1; // WebODM busy/restarting: tolerate a few failures in a row
      if (consecutiveErrors >= 6) throw e;
      await sleep(cfg.POLL_MS);
      continue;
    }

    const fraction = task.status === webodm.STATUS.COMPLETED ? 1 : Number(task.running_progress) || 0;
    await updateJob(jobId, { progress: scale("PHOTOGRAMMETRY", fraction) });

    try {
      const lines = await webodm.getOutputLines(projectId, taskId, logLine);
      if (lines.length) {
        logLine += lines.length;
        await appendLog(jobId, lines.slice(-25));
      }
    } catch { /* console output is optional */ }

    if (task.status === webodm.STATUS.COMPLETED) {
      if (!(task.available_assets || []).includes("textured_model.zip")) {
        throw new Error(
          "WebODM finished but produced no textured 3D model. Usually the photos do not overlap enough " +
          "(aim for ~80% front / 70% side overlap) or lack GPS/EXIF data.",
        );
      }
      return;
    }
    if (task.status === webodm.STATUS.FAILED) {
      throw new Error(`WebODM could not build the 3D model: ${task.last_error || "see the log for details"}`);
    }
    if (task.status === webodm.STATUS.CANCELED) {
      throw new Error("The WebODM task was cancelled");
    }
    if (Date.now() > deadline) {
      throw new Error(`WebODM did not finish within ${cfg.MAX_MINUTES} minutes (WEBODM_MAX_MINUTES)`);
    }
    await sleep(cfg.POLL_MS);
  }
}

async function stageImportModel(job) {
  const jobId = job.id;
  await setStage(jobId, "IMPORTING_MODEL", STAGE_RANGE.IMPORTING_MODEL[0]);
  const model = await importTexturedModel({
    caseId: job.case_id,
    projectId: job.webodm_project_id,
    taskId: job.webodm_task_id,
  });
  await pool.query(
    `INSERT INTO scene_models (case_id, model_key, format, scale_factor, file_size_bytes, georeferenced)
     VALUES ($1, $2, 'glb', $3, $4, $5)
     ON CONFLICT (case_id) DO UPDATE SET
       model_key = EXCLUDED.model_key, format = 'glb', scale_factor = EXCLUDED.scale_factor,
       file_size_bytes = EXCLUDED.file_size_bytes, georeferenced = EXCLUDED.georeferenced, updated_at = NOW()`,
    // Georeferenced WebODM meshes are in metres => scale 1. Otherwise the scale is unknown (NULL).
    [job.case_id, model.modelKey, model.georeferenced ? 1 : null, model.sizeBytes, model.georeferenced],
  );
  await appendLog(jobId, `3D model stored (${(model.sizeBytes / 1048576).toFixed(1)} MB, ${model.source}, ` +
    `${model.georeferenced ? "georeferenced - metres" : "NOT georeferenced - scale unknown"}).`);
}

async function stageDamageDetection(job) {
  const jobId = job.id;
  await setStage(jobId, "DAMAGE_DETECTION", STAGE_RANGE.DAMAGE_DETECTION[0]);
  try {
    const images = await loadCaseImages(job.case_id);
    const summary = await runDamageBatch({
      caseId: job.case_id,
      images,
      onProgress: (done, total) => updateJob(jobId, { progress: scale("DAMAGE_DETECTION", done / total) }),
    });
    await appendLog(
      jobId,
      `Damage detection: ${summary.detections} regions in ${summary.imagesProcessed} images ` +
      `(${summary.imagesFailed} failed). ${JSON.stringify(summary.byClass)}`,
    );
  } catch (e) {
    // The 3D model is still useful, so detection problems are a warning, not a failure.
    console.error("Damage detection failed:", e.message);
    await updateJob(jobId, { warning: `Damage detection did not run: ${e.message}`.slice(0, 1000) });
    await appendLog(jobId, `WARNING - damage detection skipped: ${e.message}`);
  }
}

async function runPipeline(jobId) {
  let job = await getJob(jobId);
  if (!job) return;
  try {
    await updateJob(jobId, { status: "running", started_at: job.started_at || new Date() });

    if (!job.webodm_task_id) {          // fresh run (a resumed run skips the upload)
      await stageUpload(job);
      job = await getJob(jobId);
    }
    await stagePhotogrammetry(job);
    await assertNotCancelled(jobId);
    await stageImportModel(job);
    await assertNotCancelled(jobId);
    await stageDamageDetection(job);
    await assertNotCancelled(jobId);

    await updateJob(jobId, { stage: "DONE", status: "completed", progress: 100, finished_at: new Date() });
    await setCaseStatus(job.case_id, "processed");
  } catch (err) {
    if (err instanceof CancelledError) return; // state was already set by cancelProcessing()
    console.error(`Processing job ${jobId} failed:`, err);
    await updateJob(jobId, {
      status: "failed",
      error_message: String(err.message || err).slice(0, 1000),
      finished_at: new Date(),
    }).catch(() => {});
    await appendLog(jobId, `FAILED: ${err.message}`).catch(() => {});
    await setCaseStatus(job.case_id, "failed").catch(() => {});
  }
}

// Called once at server start: jobs that were running when the server stopped.
async function resumeInterruptedJobs() {
  const { rows } = await pool.query("SELECT * FROM processing_jobs WHERE status IN ('queued','running')");
  for (const job of rows) {
    if (job.webodm_task_id) {
      console.log(`Resuming processing job ${job.id} (case ${job.case_id}) at WebODM task ${job.webodm_task_id}`);
      setImmediate(() => runPipeline(job.id).catch((e) => console.error("Pipeline crashed:", e)));
    } else {
      await updateJob(job.id, {
        status: "failed",
        error_message: "The server restarted before the upload to WebODM finished. Press Retry.",
        finished_at: new Date(),
      });
      await setCaseStatus(job.case_id, "failed");
    }
  }
}

module.exports = {
  startProcessing,
  cancelProcessing,
  getStatus,
  resumeInterruptedJobs,
  QUALITY_PRESETS,
};