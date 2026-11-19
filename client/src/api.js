import axios from "axios";

const configuredUrl = import.meta.env.VITE_API_URL?.trim();
const backendUrl = "https://nmra-medicine-management-system.vercel.app/api";
const api = axios.create({
  baseURL: configuredUrl
    ? configuredUrl.replace(/\/+$/, "")
    : backendUrl,
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
      error.deploymentMessage = "Cannot reach the API. Check VITE_API_URL, backend deployment, and CORS/CLIENT_URL settings.";
    } else if (error.response.status >= 500) {
      error.deploymentMessage = error.response.data?.message || "The backend returned a server error. Check the Vercel function logs.";
    }
    return Promise.reject(error);
  }
);

export default api;
