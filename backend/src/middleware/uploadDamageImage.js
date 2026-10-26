// Single-image upload for the (unofficial) damage detection test page.
// Separate from uploadImages.js because that one only accepts drone JPEGs
// for a case; here we also accept PNG/WebP phone screenshots and photos.
const multer = require("multer");
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const config = require("../config/upload");

const DAMAGE_TMP_DIR = path.join(config.TEMP_DIR, "damage");
fs.mkdirSync(DAMAGE_TMP_DIR, { recursive: true });

const ALLOWED = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, DAMAGE_TMP_DIR),
    filename: (req, file, cb) =>
        cb(null, `${Date.now()}-${crypto.randomUUID()}${ALLOWED[file.mimetype] || ".img"}`),
});

function fileFilter(req, file, cb) {
    if (!ALLOWED[file.mimetype]) {
        return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
    }
    cb(null, true);
}

module.exports = multer({
    storage,
    fileFilter,
    limits: { fileSize: config.MAX_FILES_SIZE_BYTES, files: 1 },
}).single("image"); // field name must match the client FormData key