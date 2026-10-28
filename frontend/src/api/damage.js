// Multipart upload for POST /api/damage/analyze (unofficial test endpoint).
// Uses fetch for the same reason as api/images.js: the shared axios client
// forces Content-Type: application/json, which breaks FormData bodies.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export async function analyzeDamageImage(file, conf = 0.25, signal) {
  const form = new FormData();
  form.append("image", file); // must match multer's .single("image")
  form.append("conf", String(conf));

  const token = localStorage.getItem("authToken");
  const res = await fetch(`${API_BASE}/damage/analyze`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
    signal,
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || `Analysis failed (HTTP ${res.status})`);
    err.details = body.details;
    throw err;
  }
  return body; // { success, image, detections, annotatedImage }
}