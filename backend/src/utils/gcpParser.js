"use strict";
// Parses Ground Control Point files (CSV / TXT) into clean points.
// Pure functions, no I/O, no dependencies — easy to unit test.
//
// Handles: comma / semicolon / tab / whitespace delimiters, UTF-8 BOM,
// quoted fields, '#' and '//' comment lines, decimal commas (";" / tab files),
// header aliases (lat/latitude/y, lon/long/lng/x, elevation/alt/z, ...), and
// headerless files in the order: id, lat, lon[, elevation].
//
// Encodings (decodeGcpBuffer): UTF-8, UTF-8/UTF-16 with BOM, and a Windows-1252
// fallback (what Excel's plain "CSV" export produces on Windows).
//
// Limits: WGS84 decimal degrees only (no easting/northing, no degrees-minutes-
// seconds, no N/S/E/W suffixes); no multi-line quoted fields; whitespace-
// delimited files must use '.' decimals.
// A file with ANY bad row is rejected whole, so the stored set is predictable.

const { NEO } = require("../config/droneProfiles");

const MAX_POINTS = 200;

const ALIASES = {
    id: ["id", "markerid", "marker", "pointid", "point", "pointname", "pointlabel", "markername", "markerlabel", "name", "label", "gcp", "gcpid", "gcpname", "pt", "ptid", "no", "number"],
    lat: ["lat", "latitude", "y"],
    lon: ["lon", "long", "lng", "longitude", "x"],
    elevation: ["elevation", "elev", "ele", "alt", "altitude", "z", "height", "h"],
};

const DELIMITER_NAMES = { "\t": "tab", ";": "semicolon", ",": "comma", ws: "whitespace" };

function normHeader(h) {
    return String(h)
        .replace(/^\uFEFF/, "")
        .toLowerCase()
        .replace(/\(.*?\)/g, "")      // drop units: "Elevation (m)"
        .replace(/[^a-z0-9]/g, "");
}

function mapRoles(normalised) {
    const roles = {};
    normalised.forEach((h, i) => {
        for (const role of Object.keys(ALIASES)) {
            if (roles[role] === undefined && ALIASES[role].includes(h)) {
                roles[role] = i;
                break;
            }
        }
    });
    return roles;
}

function detectDelimiter(line) {
    const counts = { "\t": 0, ";": 0, ",": 0 };
    let inQuotes = false;
    for (const ch of line) {
        if (ch === '"') inQuotes = !inQuotes;
        else if (!inQuotes && ch in counts) counts[ch]++;
    }
    let best = null;
    let max = 0;
    for (const d of ["\t", ";", ","]) {
        if (counts[d] > max) { max = counts[d]; best = d; }
    }
    return best || "ws";
}

function splitLine(line, delim) {
    if (delim === "ws") return line.trim().split(/\s+/);
    const out = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"') {
                if (line[i + 1] === '"') { cur += '"'; i++; }
                else inQuotes = false;
            } else cur += ch;
        } else if (ch === '"') inQuotes = true;
        else if (ch === delim) { out.push(cur.trim()); cur = ""; }
        else cur += ch;
    }
    out.push(cur.trim());
    return out;
}

function toNumber(raw, decimalComma) {
    if (typeof raw === "number") return Number.isFinite(raw) ? raw : NaN;
    if (raw === null || raw === undefined) return NaN;
    let s = String(raw).trim();
    if (s === "") return NaN;
    if (decimalComma) s = s.replace(/^([+-]?\d+),(\d+)$/, "$1.$2");
    if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) return NaN;
    return Number(s);
}

// Degrees/minutes/seconds and hemisphere letters are common in survey-app exports.
// We don't convert them (a silent mis-conversion is worse than a clear error), but we say what to do.
function coordHint(raw) {
    const s = String(raw ?? "");
    return /[°'"′″]|^\s*[NSEW]\s*\d|\d\s*[NSEW]\s*$/i.test(s)
        ? " — degrees/minutes/seconds and N/S/E/W letters are not supported; use signed decimal degrees (south and west are negative)"
        : "";
}

// Shared by the text parser and the JSON-array validator.
// rawRows: [{ row, id, lat, lon, elevation }] with raw (string|number) values.
function buildPoints(rawRows, { hasId, hasElevation, decimalComma }) {
    const errors = [];
    const warnings = [];
    const points = [];
    const seenIds = new Map();
    const seenCoords = new Map();
    let blankElevations = 0;

    for (const r of rawRows) {
        const fail = (message) => errors.push({ row: r.row, message });
        const before = errors.length;

        let pointId;
        if (hasId) {
            pointId = r.id === null || r.id === undefined ? "" : String(r.id).trim();
            if (pointId === "") fail("Missing marker ID");
        } else {
            pointId = `GCP${points.length + 1}`;
        }

        const lat = toNumber(r.lat, decimalComma);
        const lon = toNumber(r.lon, decimalComma);
        if (Number.isNaN(lat)) fail(`Latitude "${r.lat}" is not a number${coordHint(r.lat)}`);
        if (Number.isNaN(lon)) fail(`Longitude "${r.lon}" is not a number${coordHint(r.lon)}`);

        if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
            if (Math.abs(lat) > 90) {
                fail(Math.abs(lon) <= 90
                    ? `Latitude ${lat} is out of range (-90 to 90) — latitude and longitude may be swapped`
                    : `Latitude ${lat} is out of range (-90 to 90)`);
            } else if (Math.abs(lon) > 180) {
                fail(`Longitude ${lon} is out of range (-180 to 180)`);
            } else if (lat === 0 && lon === 0) {
                fail("Coordinates 0,0 are not a real survey position");
            }
        }

        let elevation = null;
        if (hasElevation) {
            const rawEl = r.elevation;
            if (rawEl === null || rawEl === undefined || String(rawEl).trim() === "") {
                blankElevations++;
            } else {
                const el = toNumber(rawEl, decimalComma);
                if (Number.isNaN(el)) fail(`Elevation "${rawEl}" is not a number`);
                else if (el < -500 || el > 9000) fail(`Elevation ${el} m is outside the plausible range (-500 to 9000 m)`);
                else {
                    elevation = el;
                    if (el > NEO.maxTakeoffAltitudeM) {
                        warnings.push({ row: r.row, code: "ELEVATION_ABOVE_NEO_LIMIT",
                            message: `Elevation ${el} m is above the ${NEO.name} max takeoff altitude (${NEO.maxTakeoffAltitudeM} m above sea level)` });
                    }
                }
            }
        }

        if (errors.length > before) continue;

        const idKey = pointId.toLowerCase();
        if (seenIds.has(idKey)) {
            fail(`Duplicate marker ID "${pointId}" (first used on row ${seenIds.get(idKey)})`);
            continue;
        }
        seenIds.set(idKey, r.row);

        const coordKey = `${lat.toFixed(7)},${lon.toFixed(7)}`;
        if (seenCoords.has(coordKey)) {
            warnings.push({ row: r.row, code: "DUPLICATE_COORDINATES",
                message: `"${pointId}" has the same coordinates as row ${seenCoords.get(coordKey)}` });
        } else seenCoords.set(coordKey, r.row);

        points.push({ pointId, latitude: lat, longitude: lon, elevation });
    }

    if (blankElevations > 0) {
        warnings.push({ code: "ELEVATION_MISSING",
            message: `${blankElevations} point(s) have no elevation. ${NEO.name} has no RTK, so vertical accuracy depends on GCP elevations.` });
    }
    return { errors, warnings, points };
}

function finish(errors, warnings, points, meta) {
    if (!errors.length && points.length > MAX_POINTS) {
        errors.push({ message: `Too many points (${points.length}). Maximum is ${MAX_POINTS}.` });
    }
    if (!errors.length && points.length === 0) {
        errors.push({ message: "No data rows found" });
    }
    if (!errors.length && points.length < NEO.recommendedGcpMin) {
        warnings.push({ code: "GCP_COUNT_LOW",
            message: `${points.length} GCP(s) imported — ${NEO.recommendedGcpMin} to ${NEO.recommendedGcpMax} are recommended without RTK hardware.` });
    }
    const ok = errors.length === 0;
    return { ok, points: ok ? points : [], errors, warnings, meta };
}

function parseGcpText(text) {
    const errors = [];
    const warnings = [];

    if (typeof text !== "string" || text.includes("\u0000")) {
        return finish([{ message: "File is not a readable UTF-8 text file" }], warnings, [], {});
    }
    text = text.replace(/^\uFEFF/, "");

    const rows = [];
    text.split(/\r\n|\n|\r/).forEach((t, i) => {
        const s = t.trim();
        if (!s || s.startsWith("#") || s.startsWith("//")) return;
        rows.push({ line: i + 1, text: t });
    });
    if (rows.length === 0) return finish([{ message: "File is empty" }], warnings, [], {});

    const delim = detectDelimiter(rows[0].text);
    const decimalComma = delim !== ",";
    const first = splitLine(rows[0].text, delim);
    const norm = first.map(normHeader);
    let roles = mapRoles(norm);
    const roleCount = Object.keys(roles).length;

    const looksHeaderless =
        roleCount < 2 &&
        first.length >= 3 &&
        !Number.isNaN(toNumber(first[1], decimalComma)) &&
        !Number.isNaN(toNumber(first[2], decimalComma));

    let dataRows;
    let hasHeader;
    if (looksHeaderless) {
        hasHeader = false;
        roles = { id: 0, lat: 1, lon: 2 };
        if (first.length >= 4) roles.elevation = 3;
        dataRows = rows;
        warnings.push({ code: "NO_HEADER", message: "No header row found — assuming column order: id, latitude, longitude[, elevation]" });
    } else {
        hasHeader = true;
        dataRows = rows.slice(1);
        if (roles.lat === undefined || roles.lon === undefined) {
            const projected = norm.includes("easting") || norm.includes("northing");
            errors.push({ row: rows[0].line, message: projected
                ? "Projected coordinates (easting/northing) are not supported — export WGS84 latitude/longitude in decimal degrees"
                : `Could not find latitude and longitude columns in header (${first.join(", ")}). Expected: id, latitude, longitude, elevation` });
            return finish(errors, warnings, [], { delimiter: DELIMITER_NAMES[delim], hasHeader });
        }
    }

    const hasId = roles.id !== undefined;
    const hasElevation = roles.elevation !== undefined;
    if (!hasId) warnings.push({ code: "NO_ID_COLUMN", message: "No ID column found — markers were numbered GCP1, GCP2, ..." });
    if (!hasElevation) warnings.push({ code: "NO_ELEVATION_COLUMN", message: `No elevation column. ${NEO.name} has no RTK, so vertical accuracy depends on GCP elevations.` });

    const need = Math.max(...Object.values(roles)) + 1;
    const rawRows = [];
    for (const r of dataRows) {
        const cells = splitLine(r.text, delim);
        if (cells.length < need) {
            errors.push({ row: r.line, message: `Expected at least ${need} columns but found ${cells.length}` });
            continue;
        }
        rawRows.push({
            row: r.line,
            id: hasId ? cells[roles.id] : null,
            lat: cells[roles.lat],
            lon: cells[roles.lon],
            elevation: hasElevation ? cells[roles.elevation] : null,
        });
    }

    const built = buildPoints(rawRows, { hasId, hasElevation, decimalComma });
    return finish(
        [...errors, ...built.errors],
        [...warnings, ...built.warnings],
        built.points,
        { delimiter: DELIMITER_NAMES[delim], hasHeader, rowCount: dataRows.length,
          columns: Object.fromEntries(Object.entries(roles).map(([k, v]) => [k, first[v] || null])) },
    );
}

// For POST /gcps with JSON (the frontend already parses CSV with papaparse).
// Accepts the same header aliases as keys: { id, lat, long, elevation } etc.
function parseGcpObjects(items) {
    if (!Array.isArray(items)) {
        return finish([{ message: '"points" must be an array' }], [], [], {});
    }
    const keyRoles = {};
    for (const item of items) {
        if (item && typeof item === "object") {
            for (const k of Object.keys(item)) {
                const role = Object.keys(ALIASES).find((r) => ALIASES[r].includes(normHeader(k)));
                if (role && keyRoles[role] === undefined) keyRoles[role] = k;
            }
        }
    }
    if (keyRoles.lat === undefined || keyRoles.lon === undefined) {
        return finish([{ message: "Each point needs latitude and longitude (e.g. { id, lat, long, elevation })" }], [], [], {});
    }
    const hasId = keyRoles.id !== undefined;
    const hasElevation = keyRoles.elevation !== undefined;
    const rawRows = items.map((it, i) => ({
        row: i + 1,
        id: hasId ? it?.[keyRoles.id] : null,
        lat: it?.[keyRoles.lat],
        lon: it?.[keyRoles.lon],
        elevation: hasElevation ? it?.[keyRoles.elevation] : null,
    }));
    const built = buildPoints(rawRows, { hasId, hasElevation, decimalComma: true });
    const warnings = [...built.warnings];
    if (!hasId) warnings.unshift({ code: "NO_ID_COLUMN", message: "No ID field found — markers were numbered GCP1, GCP2, ..." });
    return finish(built.errors, warnings, built.points, { rowCount: items.length });
}

// Bytes -> text. Excel on Windows saves plain "CSV" as Windows-1252 and "Unicode Text"
// as UTF-16LE; survey apps usually write UTF-8. Never throws.
function decodeGcpBuffer(buffer) {
    const b = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
    if (b.length >= 2 && b[0] === 0xff && b[1] === 0xfe) {
        return { text: new TextDecoder("utf-16le").decode(b.subarray(2)), encoding: "utf-16le" };
    }
    if (b.length >= 2 && b[0] === 0xfe && b[1] === 0xff) {
        return { text: new TextDecoder("utf-16be").decode(b.subarray(2)), encoding: "utf-16be" };
    }
    try {
        return { text: new TextDecoder("utf-8", { fatal: true }).decode(b), encoding: "utf-8" };
    } catch {
        return { text: new TextDecoder("windows-1252").decode(b), encoding: "windows-1252" };
    }
}

const EARTH_RADIUS_M = 6371008.8;
const rad = (d) => (d * Math.PI) / 180;
function distanceM(aLat, aLon, bLat, bLon) {
    const dLat = rad(bLat - aLat);
    const dLon = rad(bLon - aLon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
    return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Sanity-checks the SET of points (the per-row checks can't see these):
//   - spread: a single Neo battery covers a small scene, so a huge spread means a typo
//   - distance from the case's recorded position, incl. a swapped latitude/longitude
// Warnings only: the case coordinates may themselves be approximate.
function checkGcpGeometry(points, caseLocation) {
    const warnings = [];
    if (!Array.isArray(points) || points.length === 0) return warnings;

    let spread = 0;
    for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
            spread = Math.max(spread, distanceM(points[i].latitude, points[i].longitude, points[j].latitude, points[j].longitude));
        }
    }
    if (spread > NEO.gcpMaxSpreadM) {
        warnings.push({ code: "GCP_SPREAD_LARGE",
            message: `The GCPs are up to ${(spread / 1000).toFixed(1)} km apart. A single ${NEO.name} survey covers a small scene — check for a typo in one of the coordinates` });
    }

    const lat0 = caseLocation?.latitude;
    const lon0 = caseLocation?.longitude;
    if (Number.isFinite(lat0) && Number.isFinite(lon0)) {
        const cLat = points.reduce((a, p) => a + p.latitude, 0) / points.length;
        const cLon = points.reduce((a, p) => a + p.longitude, 0) / points.length;
        const away = distanceM(cLat, cLon, lat0, lon0);
        if (away > NEO.gcpMaxFromCaseM) {
            const swappedOk = Math.abs(cLon) <= 90 &&
                distanceM(cLon, cLat, lat0, lon0) <= NEO.gcpMaxFromCaseM;
            warnings.push(swappedOk
                ? { code: "GCP_LAT_LON_SWAPPED",
                    message: `The GCPs are ${(away / 1000).toFixed(0)} km from the case location, but would match it if latitude and longitude were swapped — check the column order in the file` }
                : { code: "GCP_FAR_FROM_CASE",
                    message: `The GCPs are ${(away / 1000).toFixed(1)} km from the case location — confirm this file belongs to this case` });
        }
    }
    return warnings;
}

module.exports = { parseGcpText, parseGcpObjects, decodeGcpBuffer, checkGcpGeometry, distanceM, MAX_POINTS };
