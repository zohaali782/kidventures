const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const { createClassRequest } = require("../controllers/classRequestController");

/**
 * SECURITY: ye route PUBLIC hai (login zaroori nahi) - is liye spam se
 * bachne ke liye per-IP limit lagai hai.
 */
const requestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests submitted. Please try again later.",
  },
});

router.post("/", requestLimiter, createClassRequest);

module.exports = router;
