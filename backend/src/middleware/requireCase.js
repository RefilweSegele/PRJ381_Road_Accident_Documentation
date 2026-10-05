// Runs BEFORE multer, so a bad/missing case never causes files to be
// written to disk in the first place.

const pool = require("../config/db");
const { AppError } = require("./errorHandler");

// cases.id is a Postgres SERIAL (4-byte integer): max 2147483647.
const MAX_PG_INT = 2147483647;

async function requireCase(req, res, next) {
    try {
        // cases.id is SERIAL (integer). Anything else can't exist — and would
        // make Postgres throw "invalid input syntax" / "out of range" (a 500) if passed through.
        if (!/^[1-9]\d*$/.test(req.params.id) || Number(req.params.id) > MAX_PG_INT) {
            throw new AppError("Case id must be a positive integer", 400, "INVALID_CASE_ID");
        }

        const caseId = Number(req.params.id);
            const { rowCount } = await pool.query("SELECT 1 FROM cases WHERE id = $1", [caseId]);
            if (rowCount === 0) {
                throw new AppError(`Case ${caseId} not found`, 404, "CASE_NOT_FOUND");
            }
        
        req.caseId = caseId;
        next();
    } catch (error) {
        next(error);
    }
}

module.exports = requireCase;