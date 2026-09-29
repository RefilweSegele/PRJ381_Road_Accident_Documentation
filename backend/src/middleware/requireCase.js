// Runs BEFORE multer, so a bad/missing case never causes files to be
// written to disk in the first place.

const caseService = require("../services/caseService");
const { AppError } = require("./errorHandler");

async function requireCase(req, res, next) {
    try {
        // cases.id is SERIAL (integer). Anything else can't exist — and would
        // make Postgres throw "invalid input syntax" (a 500) if passed through.
        if (!/^[1-9]\d*$/.test(req.params.id)) {
            throw new AppError("Case id must be a positive integer", 400, "INVALID_CASE_ID");    
        }

        const caseRecord = await caseService.getCaseById(req.params.id);
        if (!caseRecord) {
            throw new AppError(`Case ${req.params.id} not found`, 404, "CASE_NOT_FOUND");
        }

        req.caseId = Number(req.params.id);
        next();
    } catch (error) {
        next(error);
    }
}

module.exports = requireCase;