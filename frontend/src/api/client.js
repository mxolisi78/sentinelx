import axios from "axios";

const PRODUCTION_BACKEND = "https://sentinelx-backend-8o58.onrender.com/api";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL !== undefined &&
  import.meta.env.VITE_API_BASE_URL !== ""
    ? import.meta.env.VITE_API_BASE_URL
    : (window.location.hostname === "localhost" ||
       window.location.hostname === "127.0.0.1")
      ? "/api"   // local dev: Vite proxies /api to Django
      : PRODUCTION_BACKEND;   // deployed: use the Render backend
      
const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT to every request
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("sentinelx_access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 globally
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("sentinelx_access_token");
      localStorage.removeItem("sentinelx_refresh_token");
      // Redirect to login unless already there
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default client;