import axios from "axios";

const BASE_URL = "http://127.0.0.1:8000/api";

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