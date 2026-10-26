// Runs damageBatch.py over every drone image of a case and stores the results
// in damage_detections (one row per detected damage region).
const { spawn } = require("child_process");
const readline = require("readline");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const pool = require("../config/db");
const uploadCfg = require("../config/upload");
const cfg = require("../config/webodm");

const SCRIPT_PATH = path.join(__dirname, "damageDetection.py");
const PYTHON_BIN = process.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");

// Indicative severity from how much of the photo the damage region covers.
// Tune these thresholds to your own data; they are NOT an insurer's grading.
const SEVERITY_THRESHOLDS = { moderate: 0.8, severe: 3 }; // % of image area

function polygonAreaPx(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

function severityFor(areaPct) {
  if (areaPct >= SEVERITY_THRESHOLDS.severe) return "severe";
  if (areaPct >= SEVERITY_THRESHOLDS.moderate) return "moderate";
  return "minor";
}

async function saveDetections(caseId, rec) {
  let saved = 0;
  for (const d of rec.detections || []) {
    const bbox = (d.bbox || []).map(Number);
    let polygon = Array.isArray(d.polygon_coords) ? d.polygon_coords : [];
    if (polygon.length < 3 && bbox.length === 4) {
      // box-only model: store the rectangle as the polygon so the viewer can draw it
      const [x1, y1, x2, y2] = bbox;
      polygon = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
    }
    const areaPx = polygon.length >= 3 ? polygonAreaPx(polygon) : 0;
    const areaPct = rec.width && rec.height ? (areaPx / (rec.width * rec.height)) * 100 : 0;
    await pool.query(
      `INSERT INTO damage_detections
         (image_id, case_id, damage_class, severity_level, confidence_score,
          polygon_coords, bbox, img_width, img_height, area_pct)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10)`,
      [
        rec.id, caseId, String(d.damage_class), severityFor(areaPct),
        Math.min(1, Math.max(0, Number(d.confidence_score))),
        JSON.stringify(polygon), JSON.stringify(bbox),
        rec.width, rec.height, areaPct,
      ],
    );
    saved += 1;
  }
  return saved;
}

// images: [{ id, absPath }]. Replaces all earlier detections of the case.
async function runDamageBatch({ caseId, images, conf = cfg.DETECT_CONF, onProgress = () => {} }) {
  await pool.query("DELETE FROM damage_detections WHERE case_id = $1", [caseId]);
  if (!images.length) return { imagesProcessed: 0, imagesFailed: 0, detections: 0, byClass: {} };

  const manifestPath = path.join(uploadCfg.TEMP_DIR, `damage-${caseId}-${crypto.randomUUID()}.json`);
  await fsp.mkdir(path.dirname(manifestPath), { recursive: true });
  await fsp.writeFile(
    manifestPath,
    JSON.stringify(images.map((i) => ({ id: i.id, path: i.absPath }))),
  );

  const child = spawn(PYTHON_BIN, [SCRIPT_PATH, manifestPath, "--conf", String(conf)], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderrTail = "";
  child.stderr.on("data", (chunk) => { stderrTail = (stderrTail + chunk).slice(-3000); });

  const exited = new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });
  exited.catch(() => {}); // avoid an "unhandled rejection" warning if spawn fails instantly
  const timer = setTimeout(() => child.kill(), cfg.DETECT_TIMEOUT_MS);

  const summary = { imagesProcessed: 0, imagesFailed: 0, detections: 0, byClass: {} };
  try {
    for await (const line of readline.createInterface({ input: child.stdout })) {
      if (!line.trim()) continue;
      let rec;
      try { rec = JSON.parse(line); } catch { continue; } // ignore stray non-JSON output
      if (rec.error) {
        summary.imagesFailed += 1;
      } else {
        const saved = await saveDetections(caseId, rec);
        summary.imagesProcessed += 1;
        summary.detections += saved;
        for (const d of rec.detections || []) {
          summary.byClass[d.damage_class] = (summary.byClass[d.damage_class] || 0) + 1;
        }
      }
      await onProgress(summary.imagesProcessed + summary.imagesFailed, images.length);
    }

    const code = await exited;
    if (code !== 0 && summary.imagesProcessed === 0) {
      const missingDeps = /ModuleNotFoundError|ImportError/.test(stderrTail);
      throw new Error(
        missingDeps
          ? "Python dependencies missing. Run: pip install -r backend/requirements.txt"
          : `Damage model failed (exit ${code}): ${stderrTail.trim().split("\n").slice(-2).join(" | ")}`,
      );
    }
    return summary;
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new Error(`Python not found ("${PYTHON_BIN}"). Install Python or set PYTHON_BIN in backend/.env`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
    fsp.unlink(manifestPath).catch(() => {});
  }
}

module.exports = { runDamageBatch };