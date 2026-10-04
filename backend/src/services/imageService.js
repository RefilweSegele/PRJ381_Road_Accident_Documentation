// The upload pipeline: verify real JPEG bytes -> move to storage ->
// insert metadata in ONE transaction -> clean up storage if it fails.

const fs = require("fs/promises");
const pool = require("../config/db");
const { getStorageService } = require("../storage/storageService");
const { AppError } = require("../middleware/errorHandler");
const {
    isJpegByMagicBytes,
    sanitizeOriginalFilename,
    buildStorageKey 
} = require("../utils/imageValidators");


// Best-effort delete of temp files. Files already moved into storage no
// longer exist at their temp path, so "failing" here is expected and fine.
async function cleanupTempFiles(files) {
    await Promise.all((files || []).map((f) => fs.unlink(f.path).catch(() => {})));
}

// DB row (snake_case) -> API shape (camelCase), matching caseService.toApiCase.
function toApiImage(row) {
    return {
        id: row.id,
        caseId: row.case_id,
        url: getStorageService().getUrl(row.storage_key),
        originalFileName: row.original_filename,
        sizeBytes: row.size_bytes,
        mimeType: row.mime_type,
        uploadedAt: row.uploaded_at,
    };
}

async function saveImages(caseId, files) {
    if (!files || files.length === 0) {
        throw new AppError(
            'No files uploaded. Attach at least one JPEG under the "images" field.',
            400,
            "NO_FILES",
        );
    }
}

// 1. Real magic-byte check on EVERY file before anything is stored.
//    One bad file rejects the whole batch — no half-accepted uploads.

const invalidFiles = [];
for (const file of files) {
  if (!(await isJpegByMagicBytes(file.path))) {
    invalidFiles.push(file.originalname);
  }
}

if (invalidFiles.length > 0) {
  await cleanupTempFiles(files);
    throw new AppError(
      `${invalidFiles.length} invalid JPEG file(s): ${invalidFiles.join(", ")}`,
      415,
      "INVALID_FILE_TYPE",
      );
}

const storage = getStorageService();
const stored = []; // { id, key, file } for everything already in storage

try {
  // 2. Move each validated file into permanent storage.
  for (const file of files) {
      const { id, key } = buildStorageKey(caseId);
      await storage.putObject(key, file.path);
      stored.push({ id, key, file });
  }

  // 3. Insert ALL metadata rows in a single transaction: either every row lands or none do.
  const client = await pool.connect();
  let rows;
  try {
      await client.query("BEGIN");
      rows = [];
      for (const { id, key, file } of stored) {
          const result = await client.query(
              `INSERT INTO case_images
                 (id, case_id, storage_key, original_filename, size_bytes, mime_type)
               VALUES ($1, $2, $3, $4, $5, 'image/jpeg')
               RETURNING *`,
              [id, caseId, key, sanitizeOriginalFilename(file.originalname), file.size],
          );
          rows.push(result.rows[0]);
      }
      await client.query("COMMIT");
  } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
  } finally {
      client.release();
  }

  return rows.map(toApiImage);
} catch (err) {
  // Storage or DB failed: remove everything already in storage,
  // plus any temp files the loop never reached.
  await Promise.all(stored.map((s) => storage.deleteObject(s.key).catch(() => {})));
  await cleanupTempFiles(files);
  console.error("Image batch failed and was rolled back:", err);
  throw new AppError(
      "Failed to save images; nothing from this batch was kept.",
      500,
      "UPLOAD_FAILED",
  );
}

// All images for a case, oldest first.
async function listImagesByCase(caseId) {
const { rows } = await pool.query(
  "SELECT * FROM case_images WHERE case_id = $1 ORDER BY uploaded_at ASC",
  [caseId],
);
return rows.map(toApiImage);
}

module.exports = { saveImages, listImagesByCase };