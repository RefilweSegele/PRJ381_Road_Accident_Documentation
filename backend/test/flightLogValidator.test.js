const test = require("node:test");
const assert = require("node:assert/strict");
const { validateFlightLog, CRITICAL_CHECKS } = require("../src/utils/flightLogValidator");

const allChecked = CRITICAL_CHECKS.map((id) => ({ id, checked: true }));
const base = () => ({
    missionId: "MSN-2026-12345", date: "2026-10-06", time: "09:30", pilotName: "J. Smith",
    location: "N1 Highway, km 47", gpsLat: "-26.204103", gpsLon: "28.047305",
    altitudeAGL: "60", flightSpeed: "5", overlapFront: "80", overlapSide: "70",
    batteryCount: "3", estimatedDuration: "40", weatherCondition: "Clear",
    windSpeed: "14", visibility: "10", temperature: "22", missionType: "accident-scene",
    notes: "", checklist: allChecked,
});
const codes = (r) => r.errors.map((e) => `${e.field}:${e.code}`);

test("a valid form payload (all strings, like the form sends) passes cleanly", () => {
    const r = validateFlightLog(base());
    assert.equal(r.ok, true);
    assert.deepEqual(r.warnings, []);
    assert.equal(r.value.altitudeAGL, 60);
    assert.equal(r.value.time, "09:30");
});

test("missing required fields are all reported with field names", () => {
    const r = validateFlightLog({ checklist: [] });
    assert.equal(r.ok, false);
    for (const f of ["missionId", "date", "pilotName", "location", "gpsLat", "gpsLon", "altitudeAGL", "flightSpeed", "batteryCount", "estimatedDuration", "weatherCondition", "windSpeed", "visibility"]) {
        assert.ok(r.errors.some((e) => e.field === f), `expected error for ${f}`);
    }
});

test("duration beyond the Neo's per-battery rating is an error; near the limit warns", () => {
    const over = validateFlightLog({ ...base(), batteryCount: "2", estimatedDuration: "40" }); // 20 min/pack
    assert.ok(codes(over).includes("estimatedDuration:EXCEEDS_NEO_LIMIT"));
    const near = validateFlightLog({ ...base(), batteryCount: "2", estimatedDuration: "34" }); // 17/pack
    assert.equal(near.ok, true);
    assert.ok(near.warnings.some((w) => w.code === "BATTERY_RESERVE_LOW"));
});

test("propeller guards lower the rated flight time to 17 min", () => {
    const r = validateFlightLog({ ...base(), batteryCount: "2", estimatedDuration: "35", propGuards: true }); // 17.5/pack
    assert.ok(codes(r).includes("estimatedDuration:EXCEEDS_NEO_LIMIT"));
    assert.equal(validateFlightLog({ ...base(), batteryCount: "2", estimatedDuration: "35" }).ok, true); // 17.5 <= 18
});

test("wind: above 8 m/s (28.8 km/h) is an error, >=80% of it warns", () => {
    assert.ok(codes(validateFlightLog({ ...base(), windSpeed: "29" })).includes("windSpeed:EXCEEDS_NEO_LIMIT"));
    assert.equal(validateFlightLog({ ...base(), windSpeed: "28.8" }).ok, true);
    assert.ok(validateFlightLog({ ...base(), windSpeed: "24" }).warnings.some((w) => w.code === "WIND_NEAR_LIMIT"));
});

test("speed: >16 m/s error, >8 manual-mode warning, >6 sport-mode warning", () => {
    assert.ok(codes(validateFlightLog({ ...base(), flightSpeed: "17" })).includes("flightSpeed:EXCEEDS_NEO_LIMIT"));
    assert.ok(validateFlightLog({ ...base(), flightSpeed: "10" }).warnings.some((w) => w.code === "SPEED_MANUAL_MODE"));
    assert.ok(validateFlightLog({ ...base(), flightSpeed: "7" }).warnings.some((w) => w.code === "SPEED_SPORT_MODE"));
});

test("altitude: warn above the ceiling, error above 400 m", () => {
    assert.ok(validateFlightLog({ ...base(), altitudeAGL: "150" }).warnings.some((w) => w.code === "ALTITUDE_ABOVE_CEILING"));
    assert.ok(codes(validateFlightLog({ ...base(), altitudeAGL: "401" })).includes("altitudeAGL:OUT_OF_RANGE"));
});

test("weather warnings: rain and low visibility", () => {
    const r = validateFlightLog({ ...base(), weatherCondition: "Light Rain", visibility: "0.5" });
    assert.equal(r.ok, true);
    assert.ok(r.warnings.some((w) => w.code === "RAIN"));
    assert.ok(r.warnings.some((w) => w.field === "visibility"));
});

test("overlap defaults to 80/70 and warns below 75/65", () => {
    const { overlapFront, overlapSide, ...rest } = base();
    assert.equal(validateFlightLog(rest).value.overlapFront, 80);
    const low = validateFlightLog({ ...base(), overlapFront: "60", overlapSide: "50" });
    assert.equal(low.warnings.filter((w) => w.code === "OVERLAP_LOW").length, 2);
});

test("checklist: critical items must be checked; ms1 (GCS flight plan) is not required for the Neo", () => {
    const missing = validateFlightLog({ ...base(), checklist: allChecked.slice(1) });
    assert.ok(codes(missing).includes("checklist:CRITICAL_CHECKLIST_INCOMPLETE"));
    assert.equal(validateFlightLog({ ...base(), checklist: [...allChecked, { id: "ms1", checked: false }] }).ok, true);
    assert.equal(validateFlightLog({ ...base(), checklist: undefined }).ok, false);
});

test("bad dates, option values and body types", () => {
    assert.ok(codes(validateFlightLog({ ...base(), date: "2026-02-31" })).includes("date:INVALID_DATE"));
    assert.ok(codes(validateFlightLog({ ...base(), weatherCondition: "Hail" })).includes("weatherCondition:INVALID_OPTION"));
    assert.ok(codes(validateFlightLog({ ...base(), missionType: "x" })).includes("missionType:INVALID_OPTION"));
    assert.equal(validateFlightLog(null).ok, false);
    assert.equal(validateFlightLog([]).ok, false);
});

// ---- added: strict numbers, Neo temperature range ----
test("numbers must be real numbers: true, hex, Infinity are rejected", () => {
    for (const bad of [true, "0x10", "Infinity", [], {}]) {
        const r = validateFlightLog({ ...base(), altitudeAGL: bad });
        assert.ok(r.errors.some((e) => e.field === "altitudeAGL"), String(bad));
    }
    assert.ok(validateFlightLog({ ...base(), visibility: "Infinity" }).errors.some((e) => e.field === "visibility"));
});

test("temperature: Neo range -10..40 C errors, within 5 C of an edge warns, blank is fine", () => {
    assert.ok(validateFlightLog({ ...base(), temperature: -11 }).errors.some((e) => e.field === "temperature"));
    assert.ok(validateFlightLog({ ...base(), temperature: 41 }).errors.some((e) => e.field === "temperature"));
    const near = validateFlightLog({ ...base(), temperature: 38 });
    assert.ok(near.ok && near.warnings.some((w) => w.code === "TEMP_NEAR_LIMIT"));
    assert.ok(validateFlightLog({ ...base(), temperature: "" }).ok);
    assert.ok(validateFlightLog({ ...base(), temperature: "warm" }).errors.some((e) => e.field === "temperature"));
});
