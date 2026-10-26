// All WebODM / pipeline settings in one place (values come from backend/.env).
const toInt = (value, fallback) => {
    const n = parseInt(value, 10);
    return Number.isNaN(n) ? fallback : n;
  };
  const toFloat = (value, fallback) => {
    const n = parseFloat(value);
    return Number.isNaN(n) ? fallback : n;
  };
  
  module.exports = {
    URL: (process.env.WEBODM_URL || "http://localhost:8000").replace(/\/+$/, ""),
    USERNAME: process.env.WEBODM_USERNAME || "",
    PASSWORD: process.env.WEBODM_PASSWORD || "",
    UPLOAD_BATCH: toInt(process.env.WEBODM_UPLOAD_BATCH, 10), // images per upload request
    POLL_MS: toInt(process.env.WEBODM_POLL_MS, 5000),
    MAX_MINUTES: toInt(process.env.WEBODM_MAX_MINUTES, 240),  // give up after this long
    MIN_IMAGES: toInt(process.env.WEBODM_MIN_IMAGES, 5),
    DETECT_CONF: toFloat(process.env.DAMAGE_CONF, 0.25),
    DETECT_TIMEOUT_MS: toInt(process.env.DAMAGE_BATCH_TIMEOUT_MS, 60 * 60 * 1000),
  };