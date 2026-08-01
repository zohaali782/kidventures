const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const { signup, login, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

/**
 * SECURITY: brute-force protection.
 * Ek IP address 15 minute me sirf 8 dafa login/signup try kar sakta hai.
 * Iske bina koi hacker script se hazaron passwords try kar sakta hai.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Please try again after 15 minutes.",
  },
});

/**
 * Route = URL ka naqsha.
 * Ye sab /api/auth ke neeche chalti hain (server.js me mount hoti hain).
 */
router.post("/signup", authLimiter, signup); // POST /api/auth/signup
router.post("/login", authLimiter, login); // POST /api/auth/login
router.get("/me", protect, getMe); // GET  /api/auth/me  (token zaroori)

module.exports = router;
