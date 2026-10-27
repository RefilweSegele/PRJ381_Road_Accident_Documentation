import apiClient from "./client";

// Turns an axios error into an Error carrying the server's readable message.
function toError(err, fallback) {
  const error = new Error(err.response?.data?.error || err.message || fallback);
  error.status = err.response?.status;
  error.code = err.response?.data?.code;
  return error;
}

// Starts the WebODM pipeline for a case. quality: "draft" | "standard" | "high"
export async function startProcessing(caseId, quality = "standard") {
  try {
    const { data } = await apiClient.post(`/cases/${caseId}/process`, { quality });
    return data.job;
  } catch (err) {
    throw toError(err, "Could not start processing");
  }
}

// { caseStatus, job, model: { ready, ... }, detectionCount }
export async function fetchProcessingStatus(caseId) {
  try {
    const { data } = await apiClient.get(`/cases/${caseId}/process/status`);
    return data;
  } catch (err) {
    throw toError(err, "Could not load processing status");
  }
}

export async function cancelProcessing(caseId) {
  try {
    const { data } = await apiClient.post(`/cases/${caseId}/process/cancel`);
    return data.job;
  } catch (err) {
    throw toError(err, "Could not cancel processing");
  }
}

// { ok, url, nodes: [{ id, host, online, queueCount }] }
export async function fetchWebodmHealth() {
  try {
    const { data } = await apiClient.get("/webodm/health");
    return data;
  } catch (err) {
    throw toError(err, "WebODM is not reachable");
  }
}