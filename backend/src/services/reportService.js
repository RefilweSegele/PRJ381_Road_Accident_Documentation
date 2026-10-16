const pool = require("../config/db");
const { createPdfBuffer } = require("./pdfService");

const MAX_TEXT_LENGTH = 5000;
function optionalText(value, field) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw Object.assign(new Error(`${field} must be text`), { status: 400 });
  if (value.length > MAX_TEXT_LENGTH) throw Object.assign(new Error(`${field} must be ${MAX_TEXT_LENGTH} characters or fewer`), { status: 400 });
  return value.trim();
}

function normalizeMeasurements(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 100) throw Object.assign(new Error("measurements must be an array of at most 100 items"), { status: 400 });
  return value.map((item) => {
    if (!item || typeof item.label !== "string" || item.label.trim().length > 200) throw Object.assign(new Error("Each measurement requires a label of at most 200 characters"), { status: 400 });
    const raw = item.value;
    if (!["string", "number"].includes(typeof raw) || String(raw).length > 500) throw Object.assign(new Error("Each measurement requires a text or numeric value"), { status: 400 });
    return { label: item.label.trim(), value: raw };
  });
}

function normalizeFindings(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 100) throw Object.assign(new Error("findings must be an array of at most 100 items"), { status: 400 });
  return value.map((finding) => {
    if (typeof finding !== "string" || !finding.trim() || finding.length > 1000) throw Object.assign(new Error("Each finding must be non-empty text of at most 1000 characters"), { status: 400 });
    return finding.trim();
  });
}

async function collectCaseSnapshot(caseId) {
  const caseResult = await pool.query(
    `SELECT id, case_reference, incident_address, latitude, longitude, incident_date,
            status, assigned_investigator, created_at, updated_at
     FROM cases WHERE id = $1`, [caseId]);
  if (!caseResult.rows[0]) return null;
  const row = caseResult.rows[0];
  const [vehiclesResult, evidenceResult] = await Promise.all([
    pool.query(`SELECT id, registration_number, make, model, colour, vehicle_type FROM vehicles WHERE case_id = $1 ORDER BY id`, [caseId]),
    pool.query(`SELECT id, original_filename, mime_type, size_bytes, uploaded_at FROM case_images WHERE case_id = $1 ORDER BY uploaded_at, id`, [caseId]),
  ]);
  return {
    case: {
      id: row.id,
      caseReference: row.case_reference,
      incidentAddress: row.incident_address,
      location: row.latitude == null && row.longitude == null ? null : { lat: row.latitude, lng: row.longitude },
      incidentDate: row.incident_date,
      status: row.status,
      assignedInvestigator: row.assigned_investigator,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    vehicles: vehiclesResult.rows,
    evidence: evidenceResult.rows.map((item) => ({
      id: item.id,
      originalFileName: item.original_filename,
      mimeType: item.mime_type,
      sizeBytes: item.size_bytes,
      uploadedAt: item.uploaded_at,
    })),
  };
}

async function createReport(caseId, input, user) {
  const snapshot = await collectCaseSnapshot(caseId);
  if (!snapshot) return null;
  const reportData = {
    ...snapshot,
    title: "Forensic Road Accident Report",
    generatedAt: new Date().toISOString(),
    generatedBy: user?.email || String(user?.userId || "unknown"),
    executiveSummary: optionalText(input.executiveSummary, "executiveSummary"),
    measurements: normalizeMeasurements(input.measurements),
    findings: normalizeFindings(input.findings),
    reviewerNotes: optionalText(input.reviewerNotes, "reviewerNotes"),
  };
  const result = await pool.query(
    `INSERT INTO reports (case_id, generated_by, title, report_data)
     VALUES ($1, $2, $3, $4::jsonb)
     RETURNING id, case_id, generated_by, title, report_data, created_at`,
    [caseId, reportData.generatedBy, reportData.title, JSON.stringify(reportData)]);
  return result.rows[0];
}

async function listReports(caseId) {
  const caseResult = await pool.query("SELECT id FROM cases WHERE id = $1", [caseId]);
  if (!caseResult.rows[0]) return null;
  const result = await pool.query(
    `SELECT id, case_id, generated_by, title, created_at FROM reports WHERE case_id = $1 ORDER BY created_at DESC`, [caseId]);
  return result.rows;
}

async function getReport(reportId) {
  const result = await pool.query(
    `SELECT id, case_id, generated_by, title, report_data, created_at FROM reports WHERE id = $1`, [reportId]);
  return result.rows[0] || null;
}

async function getReportPdf(reportId) {
  const report = await getReport(reportId);
  if (!report) return null;
  return { report, buffer: createPdfBuffer(report.report_data) };
}

module.exports = { createReport, listReports, getReport, getReportPdf };
