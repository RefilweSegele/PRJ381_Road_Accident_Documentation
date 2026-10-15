"use strict";
// Validates a manual flight-notes payload (the shape the Flight Log form
// submits) against DJI Neo hardware limits.
//
//   errors   -> blocks saving (bad data, or physically beyond the Neo's limits)
//   warnings -> saved with the log, shown to the user (inside limits but risky)
//
// The form is a PRE-flight record, so hardware-limit violations are errors.
// "Est. Duration" is read as total airborne minutes across all battery packs.

const { NEO } = require("../config/droneProfiles");

const WEATHER = ["Clear", "Partly Cloudy", "Overcast", "Light Rain", "Fog / Low Visibility", "High Wind Advisory"];
const MISSION_TYPES = ["accident-scene", "insurance-survey", "law-enforcement", "infrastructure", "training-flight"];

// Checklist ids the form marks critical. ms1 ("flight plan loaded in GCS") is
// left out on purpose: the Neo has no waypoint missions, so it can't be required.
const CRITICAL_CHECKS = ["eq1", "eq2", "eq3", "eq7", "sf1", "sf2", "sf5", "rg1", "rg2", "rg3", "ms5"];

const KMH_PER_MS = 3.6;

// Only real finite numbers, or plain decimal strings ("12", "-3.5", "1e2").
// Rejects true/false, hex ("0x10"), "Infinity", arrays and objects, which Number() would let through.
const NUMERIC = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
function num(v) {
    if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
    if (typeof v === "string" && NUMERIC.test(v.trim())) return Number(v.trim());
    return NaN;
}

function validateFlightLog(input) {
    const errors = [];
    const warnings = [];
    const err = (field, code, message) => errors.push({ field, code, message });
    const warn = (field, code, message) => warnings.push({ field, code, message });

    if (!input || typeof input !== "object" || Array.isArray(input)) {
        err("body", "INVALID_BODY", "Request body must be a JSON object");
        return { ok: false, errors, warnings, value: null };
    }

    const str = (field, label, max, required = true) => {
        const raw = input[field];
        if (raw !== null && raw !== undefined && typeof raw !== "string" && typeof raw !== "number") {
            err(field, "INVALID_TYPE", `${label} must be text`);
            return "";
        }
        const s = raw === null || raw === undefined ? "" : String(raw).trim();
        if (!s) { if (required) err(field, "REQUIRED", `${label} is required`); return ""; }
        if (s.length > max) { err(field, "TOO_LONG", `${label} must be ${max} characters or fewer`); }
        return s;
    };

    const missionId = str("missionId", "Mission ID", 64);
    if (missionId && !/^[A-Za-z0-9._-]+$/.test(missionId)) {
        err("missionId", "INVALID_FORMAT", "Mission ID may only contain letters, numbers, '.', '_' and '-'");
    }

    const date = str("date", "Date", 10);
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date)) {
        err("date", "INVALID_DATE", "Date must be a real date in YYYY-MM-DD format");
    }
    const time = str("time", "Time", 5, false);
    if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) err("time", "INVALID_TIME", "Time must be HH:MM (24-hour)");

    const pilotName = str("pilotName", "Pilot name", 120);
    const location = str("location", "Site location", 300);
    const notes = str("notes", "Operator notes", 5000, false);

    const gpsLat = num(input.gpsLat);
    if (Number.isNaN(gpsLat) || Math.abs(gpsLat) > 90) err("gpsLat", "OUT_OF_RANGE", "Valid latitude required (-90 to 90)");
    const gpsLon = num(input.gpsLon);
    if (Number.isNaN(gpsLon) || Math.abs(gpsLon) > 180) err("gpsLon", "OUT_OF_RANGE", "Valid longitude required (-180 to 180)");

    // --- Neo-specific limits ---
    const propGuards = input.propGuards === true || input.propGuards === "true";

    const altitudeAGL = num(input.altitudeAGL);
    if (Number.isNaN(altitudeAGL) || altitudeAGL <= 0) err("altitudeAGL", "REQUIRED", "Altitude must be greater than 0 m AGL");
    else if (altitudeAGL > NEO.maxAglHardM) err("altitudeAGL", "OUT_OF_RANGE", `Altitude must be ${NEO.maxAglHardM} m AGL or lower`);
    else if (altitudeAGL > NEO.maxAglWarnM) {
        warn("altitudeAGL", "ALTITUDE_ABOVE_CEILING", `${altitudeAGL} m is above the ${NEO.maxAglWarnM} m AGL ceiling this system warns at — confirm your local RPAS rules`);
    }

    const flightSpeed = num(input.flightSpeed);
    const sp = NEO.maxHorizontalSpeedMs;
    if (Number.isNaN(flightSpeed) || flightSpeed <= 0) err("flightSpeed", "REQUIRED", "Flight speed must be greater than 0 m/s");
    else if (flightSpeed > sp.manual) err("flightSpeed", "EXCEEDS_NEO_LIMIT", `${NEO.name} tops out at ${sp.manual} m/s (Manual mode)`);
    else if (flightSpeed > sp.sport) warn("flightSpeed", "SPEED_MANUAL_MODE", `Above ${sp.sport} m/s means Manual mode — harder to hold a steady mapping grid`);
    else if (flightSpeed > sp.normal) warn("flightSpeed", "SPEED_SPORT_MODE", `Above ${sp.normal} m/s needs Sport mode; slower speeds reduce motion blur for photogrammetry`);

    let overlapFront = num(input.overlapFront);
    let overlapSide = num(input.overlapSide);
    if (Number.isNaN(overlapFront)) overlapFront = 80;
    if (Number.isNaN(overlapSide)) overlapSide = 70;
    if (overlapFront < 0 || overlapFront > 100) err("overlapFront", "OUT_OF_RANGE", "Front overlap must be 0–100 %");
    else if (overlapFront < NEO.overlap.frontMinPct) warn("overlapFront", "OVERLAP_LOW", `Front overlap under ${NEO.overlap.frontMinPct}% may leave gaps in the 3D model`);
    if (overlapSide < 0 || overlapSide > 100) err("overlapSide", "OUT_OF_RANGE", "Side overlap must be 0–100 %");
    else if (overlapSide < NEO.overlap.sideMinPct) warn("overlapSide", "OVERLAP_LOW", `Side overlap under ${NEO.overlap.sideMinPct}% may leave gaps in the 3D model`);

    const batteryCount = num(input.batteryCount);
    if (!Number.isInteger(batteryCount) || batteryCount < 1 || batteryCount > 20) {
        err("batteryCount", "OUT_OF_RANGE", "Battery packs must be a whole number from 1 to 20");
    }

    const estimatedDuration = num(input.estimatedDuration);
    if (Number.isNaN(estimatedDuration) || estimatedDuration <= 0) {
        err("estimatedDuration", "REQUIRED", "Estimated duration must be greater than 0 minutes");
    } else if (Number.isInteger(batteryCount) && batteryCount >= 1) {
        const rated = propGuards ? NEO.maxFlightTimeWithGuardsMin : NEO.maxFlightTimeMin;
        const perPack = estimatedDuration / batteryCount;
        const planning = rated * (1 - NEO.batteryReserveFraction);
        if (perPack > rated) {
            err("estimatedDuration", "EXCEEDS_NEO_LIMIT",
                `${estimatedDuration} min over ${batteryCount} pack(s) is ${perPack.toFixed(1)} min each — ${NEO.name} is rated for ${rated} min per battery. Add packs or shorten the mission`);
        } else if (perPack > planning) {
            warn("estimatedDuration", "BATTERY_RESERVE_LOW",
                `${perPack.toFixed(1)} min per pack leaves under ${Math.round(NEO.batteryReserveFraction * 100)}% of the rated ${rated} min in reserve`);
        }
    }

    // --- Weather ---
    const weatherCondition = str("weatherCondition", "Weather condition", 40);
    if (weatherCondition && !WEATHER.includes(weatherCondition)) {
        err("weatherCondition", "INVALID_OPTION", `Weather condition must be one of: ${WEATHER.join(", ")}`);
    }
    if (weatherCondition === "Light Rain") warn("weatherCondition", "RAIN", `${NEO.name} has no water-resistance rating — avoid flying in rain`);
    if (weatherCondition === "Fog / Low Visibility") warn("weatherCondition", "LOW_VISIBILITY", "Low visibility makes it hard to keep the drone in visual line of sight");
    if (weatherCondition === "High Wind Advisory") warn("weatherCondition", "WIND_ADVISORY", `A wind advisory is close to or beyond ${NEO.name}'s ${NEO.maxWindSpeedMs} m/s limit`);

    const windSpeed = num(input.windSpeed);
    if (Number.isNaN(windSpeed) || windSpeed < 0) err("windSpeed", "REQUIRED", "Wind speed (km/h) is required");
    else {
        const ms = windSpeed / KMH_PER_MS;
        if (ms > NEO.maxWindSpeedMs) {
            err("windSpeed", "EXCEEDS_NEO_LIMIT", `${windSpeed} km/h (${ms.toFixed(1)} m/s) is above ${NEO.name}'s ${NEO.maxWindSpeedMs} m/s (${(NEO.maxWindSpeedMs * KMH_PER_MS).toFixed(1)} km/h) wind resistance`);
        } else if (ms >= NEO.maxWindSpeedMs * 0.8) {
            warn("windSpeed", "WIND_NEAR_LIMIT", `${windSpeed} km/h is within 20% of ${NEO.name}'s wind limit — expect poor stability and shorter flight time`);
        }
    }

    const visibility = num(input.visibility);
    if (Number.isNaN(visibility) || visibility <= 0) err("visibility", "REQUIRED", "Visibility (km) must be greater than 0");
    else if (visibility < 1) warn("visibility", "LOW_VISIBILITY", "Visibility under 1 km — confirm you can keep visual line of sight");

    const tempRaw = num(input.temperature);
    const temperature = Number.isNaN(tempRaw) ? null : tempRaw;
    if (input.temperature !== null && input.temperature !== undefined && String(input.temperature).trim() !== "" && temperature === null) {
        err("temperature", "OUT_OF_RANGE", "Temperature must be a number (°C)");
    } else if (temperature !== null) {
        const { min, max } = NEO.operatingTempC;
        if (temperature < min || temperature > max) {
            err("temperature", "EXCEEDS_NEO_LIMIT", `${temperature} °C is outside ${NEO.name}'s operating range (${min} to ${max} °C)`);
        } else if (temperature <= min + NEO.tempWarnMarginC || temperature >= max - NEO.tempWarnMarginC) {
            warn("temperature", "TEMP_NEAR_LIMIT", `${temperature} °C is close to ${NEO.name}'s operating limit (${min} to ${max} °C) — expect shorter battery life`);
        }
    }

    const missionType = input.missionType === undefined || input.missionType === "" ? "accident-scene" : String(input.missionType);
    if (!MISSION_TYPES.includes(missionType)) err("missionType", "INVALID_OPTION", `Mission type must be one of: ${MISSION_TYPES.join(", ")}`);

    // --- Checklist ---
    let checklist = [];
    if (!Array.isArray(input.checklist)) {
        err("checklist", "REQUIRED", "Checklist is required: an array of { id, checked }");
    } else {
        checklist = input.checklist
            .filter((c) => c && typeof c.id === "string")
            .map((c) => ({ id: c.id.slice(0, 16), checked: c.checked === true }));
        const byId = new Map(checklist.map((c) => [c.id, c.checked]));
        const pending = CRITICAL_CHECKS.filter((id) => byId.get(id) !== true);
        if (pending.length) err("checklist", "CRITICAL_CHECKLIST_INCOMPLETE", `Critical checklist items not confirmed: ${pending.join(", ")}`);
        const open = checklist.filter((c) => !c.checked && !CRITICAL_CHECKS.includes(c.id)).length;
        if (open > 0) warn("checklist", "CHECKLIST_OPEN", `${open} non-critical checklist item(s) unchecked`);
    }

    const ok = errors.length === 0;
    return {
        ok, errors, warnings,
        value: ok ? {
            missionId, date, time: time || null, pilotName, location,
            gpsLat, gpsLon, altitudeAGL, flightSpeed, overlapFront, overlapSide,
            batteryCount, estimatedDuration, propGuards,
            weatherCondition, windSpeed, visibility, temperature,
            missionType, notes, checklist,
        } : null,
    };
}

module.exports = { validateFlightLog, WEATHER, MISSION_TYPES, CRITICAL_CHECKS };
