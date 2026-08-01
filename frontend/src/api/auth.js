// src/api/auth.js
// Auth helpers — token + user storage, shared across all pages.

// Backend jis bhi shape mein token/user bheje, yahan se nikaal lo.
// (agar tumhare response ke keys alag hain to SIRF ye function badalna.)
export const parseAuthResponse = (data) => {
  const token =
    data?.token ||
    data?.accessToken ||
    data?.data?.token ||
    data?.data?.accessToken ||
    null;
  const user = data?.user || data?.data?.user || data?.data || null;
  return { token, user };
};

export const saveAuth = ({ token, user }) => {
  if (token) localStorage.setItem("kv_token", token);
  if (user) localStorage.setItem("kv_user", JSON.stringify(user));
};

export const getToken = () => localStorage.getItem("kv_token");

export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("kv_user"));
  } catch {
    return null;
  }
};

export const logout = () => {
  localStorage.removeItem("kv_token");
  localStorage.removeItem("kv_user");
};

// Login ke baad role ke hisaab se kahan bhejna hai.
// NOTE: ye paths router (App.jsx) ke hisaab se hain.
export const homeForRole = (role) => {
  if (role === "admin") return "/admin";
  if (role === "instructor") return "/instructor/dashboard";
  if (role === "parent") return "/parent/dashboard";
  return "/"; // default
};
