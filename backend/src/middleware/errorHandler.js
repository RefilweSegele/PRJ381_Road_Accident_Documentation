// Typed errors for the upload module + a handler that maps them (and
// multer's own errors) to the right HTTP status.
//
// It is registered BEFORE the app's generic 500 handler in server.js and
// calls next(err) for anything it doesn't recognise, so the existing
// handler still catches everything else.

const multer = require("multer");

class AppError extends Error {
    // `details` (optional) carries structured info, e.g. validation errors.
    constructor(message, statusCode, code, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code; // machine-readable, e.g. CASE_NOT_FOUND
        this.details = details;
    }
}

// Same response shape the rest of the API uses: { error: "message" },
// plus a machine-readable `code`.

function uploadErrorHandler(error, req, res, next) {
    if (error instanceof multer.MulterError) {

        const statusMap = {
            LIMIT_FILE_SIZE: 413,
            LIMIT_FILE_COUNT: 400,
            LIMIT_UNEXPECTED_FILE: 415,
        };
        return res.status(statusMap[error.code] || 400)
                  .json({error: error.message, code: error.code});
    }
    if (error instanceof AppError) {
        return res.status(error.statusCode)
                  .json({error: error.message, code: error.code,
                         ...(error.details !== undefined && { details: error.details })});
    }
    // express.json() failures: bad JSON is the client's fault (400), not a 500.
    if (error && error.type === "entity.parse.failed") {
        return res.status(400).json({ error: "Request body is not valid JSON", code: "INVALID_JSON" });
    }
    if (error && error.type === "entity.too.large") {
        return res.status(413).json({ error: "Request body is too large", code: "BODY_TOO_LARGE" });
    }
    return next(error); // not ours — fall through to the generic handler
}

module.exports = { AppError, uploadErrorHandler };