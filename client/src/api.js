import axios from "axios";

const backendUrl = "https://nmra-medicine-management-system.vercel.app";
const configuredUrl = import.meta.env.VITE_API_URL?.trim();

function normalizeApiUrl(value) {
  if (!value) return `${backendUrl}/api`;

  const cleaned = value.replace(/\/+$/, "");
  if (cleaned.endsWith("/api")) return cleaned;

  try {
    const url = new URL(cleaned);
    if (url.pathname === "" || url.pathname === "/") return `${url.origin}/api`;
  } catch {
    // Relative URLs are handled below.
  }

  return cleaned;
}

const api = axios.create({
  baseURL: normalizeApiUrl(configuredUrl),
  timeout: 30000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("mh_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      error.deploymentMessage = "Cannot reach the API. Check VITE_API_URL and backend deployment.";
    } else if (error.response.status === 404) {
      error.deploymentMessage = "API route not found (404). Redeploy the backend and set VITE_API_URL to https://nmra-medicine-management-system.vercel.app/api.";
    } else if (error.response.status >= 500) {
      error.deploymentMessage = error.response.data?.message || "The backend returned a server error. Check the Vercel function logs.";
    }
    return Promise.reject(error);
  }
);

export default api;
