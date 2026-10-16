import apiClient from "./client";

// Pass the Flight Log form's payload straight through (the store's `flightLog`).
// On 422 the error body is { code: "FLIGHT_LOG_INVALID", details: { errors: [{ field, code, message }], warnings } }.
export async function saveFlightLog(caseId, payload) {
  const { data } = await apiClient.post(`/cases/${caseId}/flight-logs`, payload);
  return data; // { flightLog, warnings }
}

export async function fetchFlightLogs(caseId) {
  const { data } = await apiClient.get(`/cases/${caseId}/flight-logs`);
  return data;
}

export async function updateFlightLog(caseId, logId, payload) {
  const { data } = await apiClient.put(`/cases/${caseId}/flight-logs/${logId}`, payload);
  return data;
}

export async function deleteFlightLog(caseId, logId) {
  const { data } = await apiClient.delete(`/cases/${caseId}/flight-logs/${logId}`);
  return data;
}

// The Neo limits the server enforces (max wind, battery time, speed, ...).
export async function fetchDroneProfile() {
  const { data } = await apiClient.get("/drone-profile");
  return data.profile;
}
