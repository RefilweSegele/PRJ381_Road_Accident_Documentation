// Multipart upload for POST /api/cases/:id/upload/images.
// Uses fetch rather than the shared axios client: that client sets
// Content-Type: application/json by default, which breaks FormData bodies.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export async function uploadCaseImages(caseId, files) {
  const form = new FormData();
  // Field name must match multer's .array("images") in uploadImages.js.
  files.forEach((file) => form.append("images", file));

  const token = localStorage.getItem("jwt_token");
  const res = await fetch(`${API_BASE}/cases/${caseId}/upload/images`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form, // browser sets the multipart boundary itself
  });

  // Backend errors are JSON ({ error, code }). Fall back to the status code if the body isn't JSON.
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `Upload failed (HTTP ${res.status})`);
  }
  return body; // { caseId, uploaded, images: [...] }
}