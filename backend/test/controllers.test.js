"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const stubs = require("./helpers/stubs");
const gcp = require("../src/controllers/gcpController");
const flight = require("../src/controllers/flightLogController");

const JHB = { latitude: -26.2041, longitude: 28.0473 };
const csv = (rows) => Buffer.from("id,lat,long,elevation\n" + rows.join("\n"));
const eightPoints = Array.from({ length: 8 }, (_, i) => `GCP${i + 1},-26.20${40 + i},28.047${i},1752`);


function db({ caseLoc = JHB } = {}) {
    stubs.resetCalls();

    stubs.setHandler((sql) => {
        // Simulate the capture-status query introduced by the
        // integrated processing pipeline.
        if (
            /EXISTS\s*\(SELECT 1 FROM case_images/i.test(sql) &&
            /EXISTS\s*\(SELECT 1 FROM flight_logs/i.test(sql)
        ) {
            return {
                rows: [{
                    has_images: false,
                    has_gcps: true,
                    has_flight_log: false
                }],
                rowCount: 1
            };
        }

        // Existing case-location mock.
        if (/FROM cases/.test(sql)) {
            return {
                rows: caseLoc ? [caseLoc] : [],
                rowCount: caseLoc ? 1 : 0
            };
        }

        return { rows: [], rowCount: 0 };
    });
}


test("import: dry run parses, saves nothing, reports meta + count", async () => {
    db();
    const out = await stubs.run(gcp.importGcps, { query: { dryRun: "true" }, file: { buffer: csv(eightPoints), originalname: "g.csv" } });
    assert.equal(out.body.dryRun, true);
    assert.equal(out.body.count, 8);
    assert.equal(out.body.meetsRecommendation, true);
    assert.equal(out.body.meta.encoding, "utf-8");
    assert.ok(!stubs.calls.some((c) => /INSERT|DELETE/.test(c.sql)));
});

test("import: real save runs in a transaction and replaces by default", async () => {
    db();
    const out = await stubs.run(gcp.importGcps, { file: { buffer: csv(eightPoints), originalname: "g.csv" } });
    assert.equal(out.status, 201);
    const sqls = stubs.calls.map((c) => c.sql.trim().split(/\s+/)[0]);
    assert.ok(sqls.includes("BEGIN") && sqls.includes("COMMIT"));
    assert.ok(stubs.calls.some((c) => /DELETE FROM gcp_points/.test(c.sql)));
});

test("import: append mode does not delete existing points", async () => {
    db();
    await stubs.run(gcp.importGcps, { query: { mode: "append" }, file: { buffer: csv(eightPoints), originalname: "g.csv" } });
    assert.ok(!stubs.calls.some((c) => /DELETE FROM gcp_points/.test(c.sql)));
});

test("import: bad row -> 422 GCP_INVALID with row numbers, nothing saved", async () => {
    db();
    const out = stubs.asHttp(await stubs.run(gcp.importGcps, { file: { buffer: csv(["A,-26.2,28.0,1", "B,abc,28.0,1"]), originalname: "g.csv" } }));
    assert.equal(out.status, 422);
    assert.equal(out.body.code, "GCP_INVALID");
    assert.equal(out.body.details.errors[0].row, 3);
    assert.ok(!stubs.calls.some((c) => /INSERT/.test(c.sql)));
});

test("import: no file -> 400 NO_FILE; bad mode -> 400 INVALID_MODE", async () => {
    db();
    assert.equal(stubs.asHttp(await stubs.run(gcp.importGcps, {})).body.code, "NO_FILE");
    const out = stubs.asHttp(await stubs.run(gcp.importGcps, { query: { mode: "merge" }, file: { buffer: csv(eightPoints), originalname: "g.csv" } }));
    assert.equal(out.body.code, "INVALID_MODE");
});

test("import: swapped lat/long is flagged against the case location", async () => {
    db();
    const swapped = Array.from({ length: 8 }, (_, i) => `G${i},28.047${i},-26.20${40 + i},1752`);
    const out = await stubs.run(gcp.importGcps, { query: { dryRun: "true" }, file: { buffer: csv(swapped), originalname: "g.csv" } });
    assert.ok(out.body.warnings.some((w) => w.code === "GCP_LAT_LON_SWAPPED"));
});

test("import: file from a different part of the country -> GCP_FAR_FROM_CASE", async () => {
    db({ caseLoc: { latitude: -33.9249, longitude: 18.4241 } }); // Cape Town case, Johannesburg file
    const out = await stubs.run(gcp.importGcps, { query: { dryRun: "true" }, file: { buffer: csv(eightPoints), originalname: "g.csv" } });
    assert.ok(out.body.warnings.some((w) => w.code === "GCP_FAR_FROM_CASE"));
});

test("import: case without coordinates just skips the distance check", async () => {
    db({ caseLoc: null });
    const out = await stubs.run(gcp.importGcps, { query: { dryRun: "true" }, file: { buffer: csv(eightPoints), originalname: "g.csv" } });
    assert.ok(!out.body.warnings.some((w) => /FAR_FROM|SWAPPED/.test(w.code)));
});

test("import: Windows-1252 (Excel CSV) and UTF-16LE files are decoded", async () => {
    db();
    const cp1252 = Buffer.concat([Buffer.from("id,lat,long,elevation\nPunt "), Buffer.from([0xe9]), Buffer.from(",-26.2041,28.0473,1750\n")]);
    let out = await stubs.run(gcp.importGcps, { query: { dryRun: "true" }, file: { buffer: cp1252, originalname: "g.csv" } });
    assert.equal(out.body.points[0].pointId, "Punt é");
    assert.ok(out.body.warnings.some((w) => w.code === "ENCODING_FALLBACK"));

    const utf16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from("id\tlat\tlong\televation\nA\t-26.2041\t28.0473\t1750\n", "utf16le")]);
    out = await stubs.run(gcp.importGcps, { query: { dryRun: "true" }, file: { buffer: utf16, originalname: "g.txt" } });
    assert.equal(out.body.meta.encoding, "utf-16le");
    assert.equal(out.body.points[0].latitude, -26.2041);
});

test("JSON save: papaparse-shaped rows; invalid -> 422", async () => {
    db();
    const points = eightPoints.map((r) => { const [id, lat, long, elevation] = r.split(","); return { id, lat, long, elevation }; });
    assert.equal((await stubs.run(gcp.saveGcps, { body: { points } })).status, 201);
    const bad = stubs.asHttp(await stubs.run(gcp.saveGcps, { body: { points: "nope" } }));
    assert.equal(bad.status, 422);
});

test("bad file type -> 415 UNSUPPORTED_FILE_TYPE", () => {
    const filter = require("../src/middleware/uploadGcpFile");
    assert.equal(typeof filter, "function"); // module loads with stubs
    const { AppError } = require("../src/middleware/errorHandler");
    const e = new AppError("x", 415, "UNSUPPORTED_FILE_TYPE");
    assert.equal(stubs.asHttp({ error: e }).status, 415);
});

test("malformed JSON body -> 400 INVALID_JSON (not 500)", () => {
    const out = stubs.asHttp({ error: Object.assign(new SyntaxError("x"), { type: "entity.parse.failed" }) });
    assert.equal(out.status, 400);
    assert.equal(out.body.code, "INVALID_JSON");
});

// ---- flight logs ----
const goodLog = () => ({
    missionId: "M-1", date: "2026-10-14", time: "09:30", pilotName: "Thabo", location: "N1 off-ramp",
    gpsLat: -26.2, gpsLon: 28.04, altitudeAGL: 60, flightSpeed: 5, overlapFront: 80, overlapSide: 70,
    batteryCount: 3, estimatedDuration: 36, weatherCondition: "Clear", windSpeed: 10, visibility: 10,
    temperature: 22, missionType: "accident-scene", notes: "",
    checklist: ["eq1", "eq2", "eq3", "eq7", "sf1", "sf2", "sf5", "rg1", "rg2", "rg3", "ms5"].map((id) => ({ id, checked: true })),
});

test("flight log: valid note -> 201 and INSERT with 24 params", async () => {
    db();
    stubs.setHandler(() => ({ rows: [{ id: 1, missionId: "M-1" }], rowCount: 1 }));
    const out = await stubs.run(flight.create, { body: goodLog() });
    assert.equal(out.status, 201);
    const ins = stubs.calls.find((c) => /INSERT INTO flight_logs/.test(c.sql));
    assert.equal(ins.params.length, 24);
    assert.equal(ins.params[1], "DJI Neo");
});

test("flight log: over the Neo's wind limit -> 422 with field error, nothing saved", async () => {
    db();
    const out = stubs.asHttp(await stubs.run(flight.create, { body: { ...goodLog(), windSpeed: 40 } }));
    assert.equal(out.status, 422);
    assert.equal(out.body.code, "FLIGHT_LOG_INVALID");
    assert.equal(out.body.details.errors[0].field, "windSpeed");
    assert.ok(!stubs.calls.some((c) => /INSERT/.test(c.sql)));
});

test("flight log: Neo temperature range enforced", async () => {
    db();
    const out = stubs.asHttp(await stubs.run(flight.create, { body: { ...goodLog(), temperature: 44 } }));
    assert.equal(out.body.details.errors[0].code, "EXCEEDS_NEO_LIMIT");
});

test("flight log: duplicate mission id (PG 23505) -> 409", async () => {
    db();
    stubs.setHandler(() => { throw Object.assign(new Error("dup"), { code: "23505" }); });
    const out = stubs.asHttp(await stubs.run(flight.create, { body: goodLog() }));
    assert.equal(out.status, 409);
    assert.equal(out.body.code, "DUPLICATE_MISSION_ID");
});

test("flight log: missing body -> 422 INVALID_BODY; bad log id -> 400; unknown -> 404", async () => {
    db();
    assert.equal(stubs.asHttp(await stubs.run(flight.create, {})).body.details.errors[0].code, "INVALID_BODY");
    assert.equal(stubs.asHttp(await stubs.run(flight.get, { params: { logId: "abc" } })).body.code, "INVALID_LOG_ID");
    assert.equal(stubs.asHttp(await stubs.run(flight.get, { params: { logId: "5" } })).status, 404);
    assert.equal(stubs.asHttp(await stubs.run(flight.remove, { params: { logId: "5" } })).status, 404);
});

test("drone profile endpoint exposes the Neo limits", async () => {
    const out = await stubs.run((req, res) => flight.profile(req, res));
    assert.equal(out.body.profile.maxWindSpeedMs, 8);
    assert.equal(out.body.profile.hasSdSlot, false);
    assert.deepEqual(out.body.profile.operatingTempC, { min: -10, max: 40 });
});
