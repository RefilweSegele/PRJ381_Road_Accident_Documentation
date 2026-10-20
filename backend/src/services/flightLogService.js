const pool = require("../config/db");
const { NEO } = require("../config/droneProfiles");
const { AppError } = require("../middleware/errorHandler");

// [db column, API field]. One list drives INSERT, UPDATE and the SELECT aliases,
// so they can't drift apart. API field names match the Flight Log form's payload.
const FIELDS = [
    ["mission_id", "missionId"], ["flight_date", "date"], ["flight_time", "time"],
    ["pilot_name", "pilotName"], ["site_location", "location"],
    ["gps_lat", "gpsLat"], ["gps_lon", "gpsLon"],
    ["altitude_agl_m", "altitudeAGL"], ["flight_speed_ms", "flightSpeed"],
    ["overlap_front_pct", "overlapFront"], ["overlap_side_pct", "overlapSide"],
    ["battery_count", "batteryCount"], ["est_duration_min", "estimatedDuration"],
    ["prop_guards", "propGuards"], ["weather_condition", "weatherCondition"],
    ["wind_speed_kmh", "windSpeed"], ["visibility_km", "visibility"],
    ["temperature_c", "temperature"], ["mission_type", "missionType"],
    ["operator_notes", "notes"], ["checklist", "checklist"], ["warnings", "warnings"],
];
const JSON_COLS = new Set(["checklist", "warnings"]);

const SELECT = `id, case_id AS "caseId", drone_model AS "droneModel",
    mission_id AS "missionId",
    to_char(flight_date, 'YYYY-MM-DD') AS date,
    to_char(flight_time, 'HH24:MI') AS time,
    pilot_name AS "pilotName", site_location AS location,
    gps_lat AS "gpsLat", gps_lon AS "gpsLon",
    altitude_agl_m AS "altitudeAGL", flight_speed_ms AS "flightSpeed",
    overlap_front_pct AS "overlapFront", overlap_side_pct AS "overlapSide",
    battery_count AS "batteryCount", est_duration_min AS "estimatedDuration",
    prop_guards AS "propGuards", weather_condition AS "weatherCondition",
    wind_speed_kmh AS "windSpeed", visibility_km AS "visibility",
    temperature_c AS "temperature", mission_type AS "missionType",
    operator_notes AS notes, checklist, warnings,
    created_at AS "createdAt", updated_at AS "updatedAt"`;

function paramsFor(value, warnings) {
    const merged = { ...value, warnings };
    return FIELDS.map(([col, key]) => (JSON_COLS.has(col) ? JSON.stringify(merged[key]) : merged[key]));
}

function translate(error) {
    if (error.code === "23505") {
        return new AppError("A flight log with this Mission ID already exists for this case", 409, "DUPLICATE_MISSION_ID");
    }
    return error;
}

async function createFlightLog(caseId, value, warnings) {
    const cols = FIELDS.map(([c]) => c);
    const marks = cols.map((_, i) => `$${i + 3}`);
    try {
        const { rows } = await pool.query(
            `INSERT INTO flight_logs (case_id, drone_model, ${cols.join(", ")})
             VALUES ($1, $2, ${marks.join(", ")}) RETURNING ${SELECT}`,
            [caseId, NEO.name, ...paramsFor(value, warnings)],
        );
        return rows[0];
    } catch (error) { throw translate(error); }
}

async function updateFlightLog(caseId, logId, value, warnings) {
    const sets = FIELDS.map(([c], i) => `${c} = $${i + 3}`);
    try {
        const { rows } = await pool.query(
            `UPDATE flight_logs SET ${sets.join(", ")}, updated_at = NOW()
             WHERE id = $1 AND case_id = $2 RETURNING ${SELECT}`,
            [logId, caseId, ...paramsFor(value, warnings)],
        );
        return rows[0] || null;
    } catch (error) { throw translate(error); }
}

async function listFlightLogs(caseId) {
    const { rows } = await pool.query(
        `SELECT ${SELECT} FROM flight_logs WHERE case_id = $1 ORDER BY flight_date DESC, flight_time DESC NULLS LAST, id DESC`,
        [caseId]);
    return rows;
}

async function getFlightLog(caseId, logId) {
    const { rows } = await pool.query(
        `SELECT ${SELECT} FROM flight_logs WHERE id = $1 AND case_id = $2`, [logId, caseId]);
    return rows[0] || null;
}

async function deleteFlightLog(caseId, logId) {
    const { rowCount } = await pool.query(
        "DELETE FROM flight_logs WHERE id = $1 AND case_id = $2", [logId, caseId]);
    return rowCount > 0;
}

module.exports = { createFlightLog, updateFlightLog, listFlightLogs, getFlightLog, deleteFlightLog };
