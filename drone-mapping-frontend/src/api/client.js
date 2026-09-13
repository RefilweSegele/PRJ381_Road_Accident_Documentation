import axios from "axios";

/*
 Shared Axios instance.
 
 NOTE (integration): Member 1 owns the real JWT auth interceptor for this
 file per the file-structure plan. If Member 1's version of api/client.js
 already exists when you merge, theirs should be kept and this one deleted — the rest
 of the files in this folder only depend on the default export having
`.get()` / `.post()` etc, so nothing else needs to change.
 
 Until that's merged in, this version reads a token out of localStorage so
 the dashboard keeps working in isolation.
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
