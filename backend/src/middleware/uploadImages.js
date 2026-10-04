// diskStorage (NOT memoryStorage): each file streams to a temp file as it
// arrives, so a 150-image batch is never fully held in RAM.
const multer = require("multer");
const fs = require("fs"); // sync mkdirSync lives on "fs", not "fs/promises"
const crypto = require("crypto");
const config = require("../config/upload");

fs.mkdirSync(config.TEMP_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, config.TEMP_DIR);
    },
    //Randomized temp filename to avoid collisions. The final filename is determined later by buildStorageKey().
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}.tmp`),
});

// First line of defence only. The real check is the magic-byte pass in imageService.js.
function fileFilter(req, file, cb) {
    const okMime = file.mimetype === "image/jpeg";
    const okExt = /\.jpe?g$/i.test(file.originalname);
    if (!okMime || !okExt) {
        return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
    }
    cb(null, true);
}

module.exports = multer({ 
    storage, 
    fileFilter, 
    limits: { fileSize: config.MAX_FILES_SIZE_BYTES, files: config.MAX_FILES },
    }).array("images", config.MAX_FILES); // field name must match the client-side form