const service = require("../services/flightLogService");
const { validateFlightLog } = require("../utils/flightLogValidator");
const { NEO } = require("../config/droneProfiles");
const { AppError } = require("../middleware/errorHandler");

const MAX_PG_INT = 2147483647;

function logIdFrom(req) {
    const { logId } = req.params;
    if (!/^[1-9]\d*$/.test(logId) || Number(logId) > MAX_PG_INT) {
        throw new AppError("Flight log id must be a positive integer", 400, "INVALID_LOG_ID");
    }
    return Number(logId);
}

function validated(body) {
    const result = validateFlightLog(body);
    if (!result.ok) {
        throw new AppError("Flight log failed validation", 422, "FLIGHT_LOG_INVALID",
            { errors: result.errors, warnings: result.warnings });
    }
    return result;
}

// POST /api/cases/:id/flight-logs
async function create(req, res, next) {
    try {
        const { value, warnings } = validated(req.body);
        const log = await service.createFlightLog(req.caseId, value, warnings);
        res.status(201).json({ flightLog: log, warnings });
    } catch (error) { next(error); }
}

// GET /api/cases/:id/flight-logs
async function list(req, res, next) {
    try {
        const logs = await service.listFlightLogs(req.caseId);
        res.json({ caseId: req.caseId, total: logs.length, flightLogs: logs });
    } catch (error) { next(error); }
}

// GET /api/cases/:id/flight-logs/:logId
async function get(req, res, next) {
    try {
        const log = await service.getFlightLog(req.caseId, logIdFrom(req));
        if (!log) throw new AppError("Flight log not found", 404, "FLIGHT_LOG_NOT_FOUND");
        res.json({ flightLog: log });
    } catch (error) { next(error); }
}

// PUT /api/cases/:id/flight-logs/:logId  (full replacement, same body as POST)
async function update(req, res, next) {
    try {
        const logId = logIdFrom(req);
        const { value, warnings } = validated(req.body);
        const log = await service.updateFlightLog(req.caseId, logId, value, warnings);
        if (!log) throw new AppError("Flight log not found", 404, "FLIGHT_LOG_NOT_FOUND");
        res.json({ flightLog: log, warnings });
    } catch (error) { next(error); }
}

// DELETE /api/cases/:id/flight-logs/:logId
async function remove(req, res, next) {
    try {
        const deleted = await service.deleteFlightLog(req.caseId, logIdFrom(req));
        if (!deleted) throw new AppError("Flight log not found", 404, "FLIGHT_LOG_NOT_FOUND");
        res.json({ deleted: true });
    } catch (error) { next(error); }
}

// GET /api/drone-profile — lets the form read the same limits the server enforces.
function profile(req, res) {
    res.json({ profile: NEO });
}

module.exports = { create, list, get, update, remove, profile };
