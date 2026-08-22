// src/api/axios.js
// Shared axios instance. Har page yahi import karega — baseURL + auth ek jagah.
import axios from "axios";

const api = axios.create({
  // frontend .env mein: VITE_API_URL=http://localhost:5000/api
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",

  // Auth token ab httpOnly cookie mein hai. Browser use har request ke saath
  // khud bhejta hai — JavaScript us tak pohanch hi nahi sakti, is liye XSS
  // ho jaye tab bhi token chori nahi ho sakta.
  // Iske liye backend CORS mein credentials: true hona zaroori hai (hai).
  withCredentials: true,

  // Request hamesha ke liye latakti na rahe
  timeout: 20000,
});

/* ------------------------------ Response ------------------------------ */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = err.config?.url || "";

    // 401 = session expire/invalid. Local user info saaf karo aur login par bhejo.
    // (Cookie server pehle hi clear kar chuka hota hai.)
    if (status === 401) {
      localStorage.removeItem("kv_user");

      // Login/signup ki apni 401 (ghalat password) par redirect nahi karna —
      // warna user ko error message dikhne se pehle page badal jayega.
      const isAuthCall =
        url.includes("/auth/login") || url.includes("/auth/signup");

      // Aur agar pehle se login page par hain to redirect loop se bachao.
      const alreadyOnLogin = window.location.pathname.startsWith("/login");

      if (!isAuthCall && !alreadyOnLogin) {
        window.location.href = "/login?expired=1";
      }
    }

    // Server ka asli message nikaal kar aage bhejo, taake har page
    // err.message dikha sake — "Request failed with status code 500" ke bajaye.
    let apiMessage = err.response?.data?.message || null;

    if (!apiMessage) {
      if (err.code === "ECONNABORTED") {
        apiMessage = "Request timed out. Please try again.";
      } else if (!err.response) {
        // Koi response aaya hi nahi — server band hai, ya CORS/network masla.
        // Pehle yahan generic "try again" dikhta tha aur asal wajah chhup jati thi.
        apiMessage =
          "Cannot reach the server. Please check that the backend is running.";
        console.error("[api] no response from server:", err.code, err.message, url);
      }
    }

    if (apiMessage) {
      err.message = apiMessage;
    }

    return Promise.reject(err);
  },
);

export default api;
