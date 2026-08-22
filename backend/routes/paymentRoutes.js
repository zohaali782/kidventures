const express = require("express");
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
const router = express.Router();

const {
  createPaymentIntent,
  refundPayment,
  getEarnings,
} = require("../controllers/paymentController");

const { protect, authorize } = require("../middleware/auth");

/**
 * NOTE: webhook route yahan NAHI hai. Woh server.js me alag mount hota
 * hai kyunke usay RAW body chahiye (JSON parse se pehle).
 */

/**
 * SECURITY: har "Pay" retry Stripe API ko call karta hai (paisa/quota
 * lagta hai). Ownership check pehle se hai (apni booking hi), magar
 * phir bhi ek halki si limit lagana theek hai.
 */
const paymentIntentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || ipKeyGenerator(req.ip),
  message: {
    success: false,
    message: "Too many payment attempts. Please wait a few minutes.",
  },
});

router.post(
  "/create-intent",
  protect,
  authorize("parent"),
  paymentIntentLimiter,
  createPaymentIntent,
);
router.get("/earnings", protect, authorize("instructor", "admin"), getEarnings);
router.post("/:bookingId/refund", protect, authorize("admin"), refundPayment);

module.exports = router;
