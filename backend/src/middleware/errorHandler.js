// Typed errors for the upload module + a handler that maps them (and
// multer's own errors) to the right HTTP status.
//
// It is registered BEFORE the app's generic 500 handler in server.js and
// calls next(err) for anything it doesn't recognise, so the existing
// handler still catches everything else.

const multer = require("multer");

class AppError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code; // machine-readable, e.g. CASE_NOT_FOUND
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
                  .json({error: error.message, code: error.code});
    }
    return next(error); // not ours — fall through to the generic handler
}

module.exports = { AppError, uploadErrorHandler };