const test = require("node:test");
const assert = require("node:assert/strict");
const { parseGcpText, parseGcpObjects } = require("../src/utils/gcpParser");

const eight = (sep = ",") => ["id", "lat", "long", "elevation"].join(sep) + "\n" +
    Array.from({ length: 8 }, (_, i) => [`G${i + 1}`, -26.2 - i / 1000, 28.04 + i / 1000, 1750 + i].join(sep)).join("\n");

test("comma CSV with header parses cleanly, no count warning at 8 points", () => {
    const r = parseGcpText(eight());
    assert.equal(r.ok, true);
    assert.equal(r.points.length, 8);
    assert.deepEqual(r.points[0], { pointId: "G1", latitude: -26.2, longitude: 28.04, elevation: 1750 });
    assert.equal(r.warnings.length, 0);
    assert.equal(r.meta.delimiter, "comma");
});

test("tab, semicolon and whitespace delimiters", () => {
    assert.equal(parseGcpText(eight("\t")).meta.delimiter, "tab");
    assert.equal(parseGcpText(eight(";")).meta.delimiter, "semicolon");
    const ws = parseGcpText("G1 -26.2 28.04 1750\nG2 -26.3 28.05 1751\n");
    assert.equal(ws.ok, true);
    assert.equal(ws.meta.delimiter, "whitespace");
});

test("headerless file assumes id,lat,lon,elevation and warns", () => {
    const r = parseGcpText("A,-26.2,28.04,1750\nB,-26.3,28.05,1751");
    assert.equal(r.ok, true);
    assert.equal(r.points[1].pointId, "B");
    assert.ok(r.warnings.some((w) => w.code === "NO_HEADER"));
});

test("header aliases, units in header, BOM, CRLF, comments, quotes", () => {
    const text = "\uFEFF# survey 5 Oct\r\nMarker Name,Latitude (deg),Lng,Elev (m)\r\n\"GCP, one\",-26.2,28.04,1750\r\n";
    const r = parseGcpText(text);
    assert.equal(r.ok, true);
    assert.equal(r.points[0].pointId, "GCP, one");
});

test("decimal commas work in semicolon files, not in comma files", () => {
    const r = parseGcpText("id;lat;lon;elev\nG1;-26,2041;28,0473;1750,5");
    assert.equal(r.ok, true);
    assert.equal(r.points[0].latitude, -26.2041);
    assert.equal(r.points[0].elevation, 1750.5);
});

test("no id column auto-numbers; no elevation column warns", () => {
    const r = parseGcpText("lat,lon\n-26.2,28.04\n-26.3,28.05");
    assert.equal(r.ok, true);
    assert.deepEqual(r.points.map((p) => p.pointId), ["GCP1", "GCP2"]);
    assert.ok(r.warnings.some((w) => w.code === "NO_ID_COLUMN"));
    assert.ok(r.warnings.some((w) => w.code === "NO_ELEVATION_COLUMN"));
});

test("fewer than 7 points warns (Neo has no RTK)", () => {
    const r = parseGcpText("id,lat,long,elevation\nG1,-26.2,28.04,1750");
    assert.ok(r.warnings.some((w) => w.code === "GCP_COUNT_LOW"));
});

test("bad rows reject the whole file with row numbers", () => {
    const r = parseGcpText("id,lat,long,elevation\nG1,-26.2,28.04,1750\nG2,abc,28.04,1750\nG3,-126.2,28.04,1750\nG1,-26.3,28.05,1751\nG5,0,0,10");
    assert.equal(r.ok, false);
    assert.equal(r.points.length, 0);
    const byRow = Object.fromEntries(r.errors.map((e) => [e.row, e.message]));
    assert.match(byRow[3], /Latitude "abc" is not a number/);
    assert.match(byRow[4], /out of range/);
    assert.match(byRow[5], /Duplicate marker ID "G1" \(first used on row 2\)/);
    assert.match(byRow[6], /0,0/);
});

test("swapped lat/long is called out", () => {
    const r = parseGcpText("id,lat,long\nG1,28.04,-126.2\nG2,100,28.0");
    assert.equal(r.ok, false);
    assert.equal(r.errors.length, 1); // G1 (28.04, -126.2) is a valid position
    assert.equal(r.errors[0].row, 3);
    assert.match(r.errors[0].message, /swapped/);
});

test("projected coordinates are rejected with a clear message", () => {
    const r = parseGcpText("id,easting,northing,elevation\nG1,600000,7100000,1750");
    assert.equal(r.ok, false);
    assert.match(r.errors[0].message, /Projected coordinates/);
});

test("elevation above the Neo's 2000 m takeoff limit warns, absurd elevation errors", () => {
    const hi = parseGcpText("id,lat,long,elevation\nG1,-26.2,28.04,2100");
    assert.equal(hi.ok, true);
    assert.ok(hi.warnings.some((w) => w.code === "ELEVATION_ABOVE_NEO_LIMIT"));
    assert.equal(parseGcpText("id,lat,long,elevation\nG1,-26.2,28.04,99999").ok, false);
});

test("empty / binary / short-row input", () => {
    assert.equal(parseGcpText("").ok, false);
    assert.equal(parseGcpText("# only a comment\n").ok, false);
    assert.equal(parseGcpText("a\u0000b").ok, false);
    const r = parseGcpText("id,lat,long\nG1,-26.2");
    assert.match(r.errors[0].message, /Expected at least 3 columns/);
});

test("JSON points: frontend papaparse shape (id, lat, long, elevation as strings)", () => {
    const r = parseGcpObjects([{ id: "G1", lat: "-26.2", long: "28.04", elevation: "1750" }, { id: "G2", lat: -26.3, long: 28.05 }]);
    assert.equal(r.ok, true);
    assert.equal(r.points[1].elevation, null);
    assert.equal(parseGcpObjects("nope").ok, false);
    assert.equal(parseGcpObjects([{ foo: 1 }]).ok, false);
});

// ---- added: encoding, hints, geometry ----
const { decodeGcpBuffer, checkGcpGeometry, distanceM } = require("../src/utils/gcpParser");

test("decodeGcpBuffer: utf-8, BOM, windows-1252, utf-16le/be", () => {
    assert.equal(decodeGcpBuffer(Buffer.from("é")).encoding, "utf-8");
    assert.equal(decodeGcpBuffer(Buffer.from([0xe9])).text, "é");
    assert.equal(decodeGcpBuffer(Buffer.from([0xe9])).encoding, "windows-1252");
    assert.equal(decodeGcpBuffer(Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from("ab", "utf16le")])).text, "ab");
    assert.equal(decodeGcpBuffer(Buffer.from([0xfe, 0xff, 0x00, 0x61])).text, "a");
    assert.equal(decodeGcpBuffer(Buffer.alloc(0)).text, "");
});

test("hemisphere letters and DMS get an actionable error", () => {
    const r = parseGcpText("id,lat,lon\nA,26.2S,28.0E");
    assert.equal(r.ok, false);
    assert.match(r.errors[0].message, /signed decimal degrees/);
    assert.match(parseGcpText("id,lat,lon\nA,26°12'S,28°02'E").errors[0].message, /signed decimal degrees/);
});

test("geometry: distance, spread, swapped and far-from-case warnings", () => {
    assert.ok(Math.abs(distanceM(-26.2, 28, -26.2, 28.001) - 100) < 1);
    const pts = [{ latitude: -26.2041, longitude: 28.0473 }, { latitude: -26.2045, longitude: 28.0478 }];
    assert.deepEqual(checkGcpGeometry(pts, { latitude: -26.2041, longitude: 28.0473 }), []);
    assert.deepEqual(checkGcpGeometry(pts, null), []);
    const wide = [...pts, { latitude: -26.3, longitude: 28.2 }];
    assert.ok(checkGcpGeometry(wide, null).some((w) => w.code === "GCP_SPREAD_LARGE"));
    const swapped = pts.map((p) => ({ latitude: p.longitude, longitude: p.latitude }));
    assert.ok(checkGcpGeometry(swapped, { latitude: -26.2041, longitude: 28.0473 }).some((w) => w.code === "GCP_LAT_LON_SWAPPED"));
    assert.ok(checkGcpGeometry(pts, { latitude: -33.9, longitude: 18.4 }).some((w) => w.code === "GCP_FAR_FROM_CASE"));
});
