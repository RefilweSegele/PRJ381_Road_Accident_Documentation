// Single small CSV/TXT upload for GCP imports. memoryStorage is fine here:
// the size cap is 1 MB (200 points is ~10 KB), unlike the image upload.
const multer = require("multer");
const { AppError } = require("./errorHandler");

const MAX_BYTES = 1024 * 1024;

function fileFilter(req, file, cb) {
    // Extension is the real check; browsers report CSVs as text/csv,
    // application/vnd.ms-excel (Windows) or octet-stream, so MIME is too unreliable.
    if (!/\.(csv|txt)$/i.test(file.originalname)) {
        return cb(new AppError("Only .csv and .txt files can be imported", 415, "UNSUPPORTED_FILE_TYPE"));
    }
    cb(null, true);
}

module.exports = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: { fileSize: MAX_BYTES, files: 1 },
}).single("file"); // form field name must be "file"
