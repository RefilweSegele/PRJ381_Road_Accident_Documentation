// Default storage: files live under LOCAL_ROOT (backend/uploads, which is already in .gitignore).
// Interface matches S3StorageAdapter: putObject / deleteObject / getUrl.

const fs = require("fs/promises");
const path = require("path");
const config = require("../config/upload");

class LocalDiskStorageAdapter {
    // Moves the validated temp file to its final location.
    async putObject(storageKey, sourceFilePath) {
        const finalPath = path.join(config.LOCAL_ROOT, storageKey);
        await fs.mkdir(path.dirname(finalPath), { recursive: true });

        try {
            await fs.rename(sourceFilePath, finalPath);
        } catch (error) {
            if (error.code === "EXDEV") {
                // tmp/ and uploads/ on different volumes — copy then delete.
                await fs.copyFile(sourceFilePath, finalPath);
                await fs.unlink(sourceFilePath);
            } else {
                throw error;
            }
        }
    }

    // Must not throw if the object is already gone (used for rollback).
    async deleteObject(storageKey) {
        try {
            await fs.unlink(path.join(config.LOCAL_ROOT, storageKey));
        } catch (error) {
            if (error.code !== "ENOENT") throw error;
        }
    }

    // The DB stores only the key; the URL is derived here at read time, so
    // changing host/driver never requires a data migration.
    getUrl(storageKey) {
        return `${config.PUBLIC_BASE_URL}/${storageKey}`;
    }
}

module.exports = LocalDiskStorageAdapter;