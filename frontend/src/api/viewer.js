// Sends a screenshot of the 3D view to the existing POST /api/damage/analyze
// endpoint (YOLO). Uses fetch (not the shared axios client) because that client
// defaults to Content-Type: application/json, which breaks FormData bodies.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

// Resolves to { image: { width, height }, detections: [{ damage_class, confidence_score, polygon_coords, bbox }] }
export async function analyzeViewCapture(blob, conf = 0.25) {
  const form = new FormData();
  form.append("image", blob, "view.jpg"); // field name must match uploadDamageImage.js
  form.append("conf", String(conf));

  const token = localStorage.getItem("authToken");
  const res = await fetch(`${API_BASE}/damage/analyze`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Detection failed (HTTP ${res.status})`);
  return body;
}