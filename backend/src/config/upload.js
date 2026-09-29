//All upload storage is handled here, so that it can be used in multiple places if needed.
const path = require('path');

const BACKEND_ROOT = path.resolve(__dirname, "..", "..");

//What does this do?
const toInt = (value, fallback) => {
    const n = parseInt(value, 10);
    return Number.isNaN(n) ? fallback : n;
};

module.exports = {
    // Target capture is ~80-120 images per scene, so 150 leaves headroom without allowing an unbounded batch.
    MAX_FILES: toInt(process.env.UPLOAD_MAX_FILES, 150),

    // DJI Neo 12MP JPEGs are ~3.5MB, so 15MB is a reasonable limit for a single file.
    MAX_FILES_SIZE_BYTES: toInt(process.env.UPLOAD_MAX_FILE_SIZE_BYTES, 15) * 1024 * 1024,

    // 'local' works today. 's3' is a template adapter (storage/S3StorageAdapter.js).
    STORAGE_DRIVER: process.env.UPLOAD_STORAGE_DRIVER || 'local',
    TEMP_DIR: process.env.UPLOAD_TEMP_DIR || path.join(BACKEND_ROOT, 'tmp', 'uploads'),
    LOCAL_ROOT: process.env.UPLOAD_LOCAL_ROOT || path.join(BACKEND_ROOT, 'uploads'),
    PUNLIC_BASE_URL: 
        process.env.UPLOAD_PUBLIC_BASE_URL || 
        'http://localhost:${process.env.PORT || 5000}/static/uploads',

    // Only read when STORAGE_DRIVER=s3
    S3: {
            BUCKET: process.env.S3_BUCKET || "",
            REGION: process.env.S3_REGION || "",
            ENDPOINT: process.env.S3_ENDPOINT || "", // R2 / MinIO only; blank for real AWS
            ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID || "",
            SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY || "",
        },    
    
};

