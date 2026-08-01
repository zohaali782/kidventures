// src/api/axios.js
// Shared axios instance. Har page yahi import karega — baseURL + token ek jagah.
import axios from "axios";

const api = axios.create({
  // frontend .env mein: VITE_API_URL=http://localhost:5000/api
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

// Har request pe token laga do (agar logged in hai). Koi secret yahan hardcode NAHI.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("kv_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Token expire/invalid ho to logout — baad ke protected pages ke liye useful.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem("kv_token");
      // yahan chaho to login pe redirect kara sakti ho, filhaal sirf token clear.
    }
    return Promise.reject(err);
  },
);

export default api;
