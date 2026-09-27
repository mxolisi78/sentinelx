import axios from "axios";

const PRODUCTION_BACKEND = "https://sentinelx-backend-8o58.onrender.com/api";

const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
   window.location.hostname === "127.0.0.1");

const BASE_URL = isLocalhost
  ? "/api"
  : (import.meta.env.VITE_API_BASE_URL &&
     import.meta.env.VITE_API_BASE_URL.trim()) ||
    PRODUCTION_BACKEND;

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
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default client;