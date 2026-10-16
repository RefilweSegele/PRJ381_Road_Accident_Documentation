import apiClient from "./client";

// papaparse rows ({ id, lat, long, elevation }) -> backend validates + saves.
// mode: "replace" (default) swaps the case's GCP set, "append" upserts by id.
export async function saveGcps(caseId, points, mode = "replace") {
  const { data } = await apiClient.post(`/cases/${caseId}/gcps`, { points, mode });
  return data; // { imported, warnings, points, count, meetsRecommendation }
}

// Send the raw .csv/.txt file and let the server parse it.
// dryRun = true previews without saving.
export async function importGcpFile(caseId, file, { mode = "replace", dryRun = false } = {}) {
  const form = new FormData();
  form.append("file", file); // field name must be "file"
  const { data } = await apiClient.post(`/cases/${caseId}/gcps/import`, form, {
    params: { mode, dryRun },
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function fetchGcps(caseId) {
  const { data } = await apiClient.get(`/cases/${caseId}/gcps`);
  return data;
}

export async function clearGcps(caseId) {
  const { data } = await apiClient.delete(`/cases/${caseId}/gcps`);
  return data;
}
