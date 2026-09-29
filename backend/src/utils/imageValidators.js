//Multer's fileFilter only sees the client-supplied Content-Type and filename, both are easily spoofed. 
//This function checks the actual file content to determine if it is a valid image.

const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

// Every JPEG starts with FF D8 FF.
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);

// Reads only the first 3 bytes — never loads the whole file.
async function isJpegByMagicBytes(filePath){
    const handle = await fs.open(filePath, 'r');

    try {
        const buffer = Buffer.alloc(3);
        const { bytesRead } = await handle.read(buffer, 0, 3, 0);
        return bytesRead === 3 && buffer.equals(JPEG_MAGIC); //??
    } finally {
        await handle.close();   
    }
}

// Display-only. NEVER used to build a storage path.
function sanitizeOriginalFileName(rawName) {
    const base = path.basename(rawName || "upload.jpg");
    return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 255);
}

// cases/{caseId}/images/{uuid}.jpg  (caseId is a validated integer)
function buildStorageKey(caseId){
    const iD = crypto.randomUUID();
    return { id, key: `cases/${caseId}/images/${id}.jpg` };
}

module.exports = { isJpegByMagicBytes, sanitizeOriginalFilename, buildStorageKey };



