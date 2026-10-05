// backend/src/storage/S3StorageAdapter.js
//
// TEMPLATE — not wired up. Same interface as LocalDiskStorageAdapter, so
// nothing else changes when you fill it in:
//   1. npm install @aws-sdk/client-s3
//   2. Set S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY in
//      backend/.env (plus S3_ENDPOINT for Cloudflare R2 / MinIO)
//   3. Set STORAGE_DRIVER=s3
//
// The SDK is required lazily inside the methods, so this file can sit in
// the codebase without the package being installed.
const fs = require("fs");
const config = require("../config/upload");

class S3StorageAdapter {
  constructor() {
    this._client = null;
  }

  _getClient() {
    if (this._client) return this._client;
    const { BUCKET, ACCESS_KEY_ID, SECRET_ACCESS_KEY, REGION, ENDPOINT } = config.S3;
    if (!BUCKET || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
      throw new Error(
        "STORAGE_DRIVER=s3 but S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY are not set. " +
          "Set STORAGE_DRIVER=local until they are.",
      );
    }
    const { S3Client } = require("@aws-sdk/client-s3");
    this._client = new S3Client({
      region: REGION || "auto",
      ...(ENDPOINT ? { endpoint: ENDPOINT } : {}),
      credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
    });
    return this._client;
  }

  async putObject(key, sourceFilePath) {
    const { PutObjectCommand } = require("@aws-sdk/client-s3");
    await this._getClient().send(
      new PutObjectCommand({
        Bucket: config.S3.BUCKET,
        Key: key,
        Body: fs.createReadStream(sourceFilePath), // streamed, not buffered
        ContentType: "image/jpeg",
      }),
    );
    await fs.promises.unlink(sourceFilePath); // temp copy no longer needed
  }

  async deleteObject(key) {
    const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
    await this._getClient().send(
      new DeleteObjectCommand({ Bucket: config.S3.BUCKET, Key: key }),
    );
  }

  getUrl(key) {
    const { BUCKET, REGION, ENDPOINT } = config.S3;
    return ENDPOINT
      ? `${ENDPOINT}/${BUCKET}/${key}`
      : `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
  }
}

module.exports = S3StorageAdapter;