// src/api/auth.js
// Auth helpers — user info + login/logout, shared across all pages.
//
// ZAROORI: token ab yahan store NAHI hota. Woh backend ki httpOnly cookie
// mein hai jahan JavaScript pohanch hi nahi sakti. localStorage mein sirf
// user ka naam/role rakhte hain — sirf UI dikhane ke liye (navbar, redirects).
// Asal ijazat ka faisla hamesha server karta hai.

import api from "./axios";

// Backend jis bhi shape mein user bheje, yahan se nikaal lo.
export const parseAuthResponse = (data) => {
  const user = data?.user || data?.data?.user || data?.data || null;
  return { user };
};

export const saveAuth = ({ user }) => {
  if (user) localStorage.setItem("kv_user", JSON.stringify(user));
};

export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("kv_user"));
  } catch {
    return null;
  }
};

// Sirf UI ka andaza — asal check server par hota hai.
export const isLoggedIn = () => Boolean(getStoredUser());

/**
 * Logout.
 * httpOnly cookie ko JavaScript delete nahi kar sakti, is liye server ko
 * batana parta hai. Request fail bhi ho jaye to local state saaf kar dete hain.
 */
export const logout = async () => {
  try {
    await api.post("/auth/logout");
  } catch {
    // network/server error — phir bhi local logout kar dena chahiye
  } finally {
    localStorage.removeItem("kv_user");
    // purani build ka bacha hua token, agar ho to
    localStorage.removeItem("kv_token");
  }
};

// Login ke baad role ke hisaab se kahan bhejna hai.
// NOTE: ye paths router (App.jsx) ke hisaab se hain.
export const homeForRole = (role) => {
  if (role === "admin") return "/admin";
  if (role === "instructor") return "/instructor/dashboard";
  if (role === "parent") return "/parent/dashboard";
  return "/"; // default
};
