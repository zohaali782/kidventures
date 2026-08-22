/**
 * Auth cookie helpers.
 *
 * Token ab response body mein nahi jata — httpOnly cookie mein jata hai.
 * httpOnly ka matlab: browser cookie ko request ke saath khud bhejta hai,
 * lekin JavaScript us tak pohanch hi nahi sakti. Is liye agar site par
 * kabhi XSS ho bhi jaye, attacker token chura nahi sakta.
 */

const COOKIE_NAME = "kv_token";

const isProd = () => process.env.NODE_ENV === "production";

/**
 * JWT_EXPIRE ("7d", "12h", "30m") ko milliseconds mein badalta hai,
 * taake cookie ki umar token ki umar se match kare.
 */
const expiryMs = () => {
  const raw = String(process.env.JWT_EXPIRE || "7d");
  const match = raw.match(/^(\d+)([smhd])$/);

  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 din

  const units = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return Number(match[1]) * units[match[2]];
};

/**
 * NOTE sameSite ke baare mein:
 * - development mein frontend aur backend dono localhost par hain -> "lax" theek hai.
 * - production mein agar frontend (Vercel) aur backend (Render) alag domains par
 *   hain to cookie cross-site jati hai, aur us ke liye "none" + secure:true lazmi hai.
 *   Dono ek hi domain par hon to "lax" behtar hai (CSRF ke khilaf zyada mazboot).
 */
const baseOptions = () => ({
  httpOnly: true,
  secure: isProd(), // sirf HTTPS par bheji jayegi
  sameSite: isProd() ? "none" : "lax",
  path: "/",
});

const sendAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, { ...baseOptions(), maxAge: expiryMs() });
};

const clearAuthCookie = (res) => {
  // clearCookie ko wahi options chahiye jo set karte waqt diye the,
  // warna browser cookie delete nahi karta.
  res.clearCookie(COOKIE_NAME, baseOptions());
};

module.exports = { COOKIE_NAME, sendAuthCookie, clearAuthCookie };
