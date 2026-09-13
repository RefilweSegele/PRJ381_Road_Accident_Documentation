import axios from "axios";

// Base URL comes from Vite env at build/run time.
// Create a .env in drone-mapping-frontend/ with:
//   VITE_API_BASE_URL=http://localhost:8000/api
// Falls back to a same-origin /api for safety.
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor — attach auth token if we ever add one.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — normalise error shape so callers get a clean message.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Something went wrong talking to the server.";
    return Promise.reject(new Error(message));
  },
);

export default apiClient;
