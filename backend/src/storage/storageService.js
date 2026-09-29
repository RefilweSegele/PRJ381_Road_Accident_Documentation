// Picks the adapter from STORAGE_DRIVER. Every adapter implements:
//   putObject(storageKey, sourceFilePath)  – store the file under `storageKey`
//   deleteObject(key)               – remove it (no-op if already gone)
//   getUrl(key)                     – public URL for a stored key

const config = require("../config/upload");
const LocalDiskStorageAdapter = require("./LocalDiskStorageAdapter");
const S3StorageAdapter = require("./S3StorageAdapter");

let adapter = null;
 
function getStorageService() {
    if (!adapter) {
        adapter = config.STORAGE_DRIVER === "s3" ? new S3StorageAdapter() : new LocalDiskStorageAdapter();
    } 
    return adapter;
}

module.exports = { getStorageService };