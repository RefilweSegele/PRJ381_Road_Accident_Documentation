const gcpService = require("../services/gcpService");
const { parseGcpText, parseGcpObjects, decodeGcpBuffer, checkGcpGeometry } = require("../utils/gcpParser");
const { NEO } = require("../config/droneProfiles");
const { AppError } = require("../middleware/errorHandler");

function modeFrom(query) {
    const mode = query.mode === undefined ? "replace" : String(query.mode);
    if (!["replace", "append"].includes(mode)) {
        throw new AppError('mode must be "replace" or "append"', 400, "INVALID_MODE");
    }
    return mode;
}

function summary(points) {
    return {
        count: points.length,
        recommendedMin: NEO.recommendedGcpMin,
        meetsRecommendation: points.length >= NEO.recommendedGcpMin,
    };
}

function rejectIfInvalid(result) {
    if (!result.ok) {
        throw new AppError("GCP data could not be imported", 422, "GCP_INVALID",
            { errors: result.errors, warnings: result.warnings, meta: result.meta });
    }
}

// Adds the set-level checks (spread, distance from the case, swapped lat/lon).
async function withGeometryWarnings(caseId, result) {
    const location = await gcpService.getCaseLocation(caseId);
    return [...result.warnings, ...checkGcpGeometry(result.points, location)];
}

// POST /api/cases/:id/gcps/import?mode=replace|append&dryRun=true   (multipart, field "file")
async function importGcps(req, res, next) {
    try {
        if (!req.file) throw new AppError('Attach a .csv or .txt file in the "file" field', 400, "NO_FILE");
        const mode = modeFrom(req.query);
        const { text, encoding } = decodeGcpBuffer(req.file.buffer);
        const result = parseGcpText(text);
        result.meta = { ...result.meta, encoding };
        if (encoding === "windows-1252") {
            result.warnings.push({ code: "ENCODING_FALLBACK",
                message: "The file is not UTF-8, so it was read as Windows-1252 (Excel's default CSV). Check any accented characters in marker IDs." });
        }
        rejectIfInvalid(result);
        result.warnings = await withGeometryWarnings(req.caseId, result);

        if (req.query.dryRun === "true") {
            return res.json({ dryRun: true, caseId: req.caseId, points: result.points,
                warnings: result.warnings, meta: result.meta, ...summary(result.points) });
        }
        const saved = await gcpService.savePoints(req.caseId, result.points,
            { mode, sourceFilename: req.file.originalname });
        res.status(201).json({ caseId: req.caseId, mode, imported: result.points.length,
            warnings: result.warnings, meta: result.meta, points: saved, ...summary(saved) });
    } catch (error) { next(error); }
}

// POST /api/cases/:id/gcps   body: { points: [{ id, lat, long, elevation }], mode? }
// For the frontend, which already parses the CSV with papaparse.
async function saveGcps(req, res, next) {
    try {
        const mode = modeFrom({ mode: req.body?.mode ?? req.query.mode });
        const result = parseGcpObjects(req.body?.points);
        rejectIfInvalid(result);
        result.warnings = await withGeometryWarnings(req.caseId, result);
        const saved = await gcpService.savePoints(req.caseId, result.points, { mode });
        res.status(201).json({ caseId: req.caseId, mode, imported: result.points.length,
            warnings: result.warnings, points: saved, ...summary(saved) });
    } catch (error) { next(error); }
}

// GET /api/cases/:id/gcps
async function listGcps(req, res, next) {
    try {
        const points = await gcpService.listPoints(req.caseId);
        res.json({ caseId: req.caseId, points, ...summary(points) });
    } catch (error) { next(error); }
}

// DELETE /api/cases/:id/gcps
async function clearGcps(req, res, next) {
    try {
        const deleted = await gcpService.deletePoints(req.caseId);
        res.json({ caseId: req.caseId, deleted });
    } catch (error) { next(error); }
}

module.exports = { importGcps, saveGcps, listGcps, clearGcps };
