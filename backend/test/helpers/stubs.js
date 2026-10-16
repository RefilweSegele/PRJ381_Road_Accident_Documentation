"use strict";
// Lets the controller tests run with no database and without installing multer/pg:
// both are replaced with tiny fakes, and every SQL call is recorded in `calls`.
const Module = require("module");

class MulterError extends Error {
    constructor(code, field) { super(code); this.code = code; this.field = field; }
}
const fakeMulter = () => ({ single: () => (req, res, next) => next() });
fakeMulter.MulterError = MulterError;
fakeMulter.memoryStorage = () => ({});

const calls = [];
let handler = () => ({ rows: [], rowCount: 0 });
const pool = {
    query: async (sql, params) => { calls.push({ sql, params }); return handler(sql, params); },
    connect: async () => ({ query: pool.query, release() {} }),
};

const origLoad = Module._load;
Module._load = function (request, ...rest) {
    if (request === "multer") return fakeMulter;
    if (request.endsWith("/config/db") || request.endsWith("\\config\\db")) return pool;
    return origLoad.call(this, request, ...rest);
};

// Minimal Express-like req/res; runs a controller and resolves with what it sent.
async function run(fn, { params = {}, query = {}, body, file, caseId = 1 } = {}) {
    const out = { status: 200, body: undefined, error: undefined };
    const res = { status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
    await fn({ params, query, body, file, caseId }, res, (e) => { out.error = e; });
    return out;
}
// Same mapping the app uses: AppError -> JSON via uploadErrorHandler.
function asHttp(out) {
    if (!out.error) return out;
    const { uploadErrorHandler } = require("../../src/middleware/errorHandler");
    const res = { status(c) { this.s = c; return this; }, json(b) { this.b = b; return this; } };
    let passed = false;
    uploadErrorHandler(out.error, {}, res, () => { passed = true; });
    return passed ? { status: 500, body: { error: "Internal server error" } } : { status: res.s, body: res.b };
}

module.exports = { calls, setHandler: (h) => { handler = h; }, resetCalls: () => { calls.length = 0; }, run, asHttp, MulterError };
