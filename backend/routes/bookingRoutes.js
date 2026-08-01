const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const {
  createBooking,
  getMyBookings,
  getInstructorBookings,
  getBookingById,
  cancelBooking,
  getSessionAttendees,
} = require("../controllers/bookingController");

const { protect, authorize } = require("../middleware/auth");

// Har booking route ke liye login zaroori
router.use(protect);

/**
 * SECURITY: seat reservation abuse rokna.
 *
 * Bina is limit ke, koi ek parent (ya script) baar baar seats reserve
 * karke chhod sakta hai - har baar 15 minute ke liye asli parents se
 * seat chhupa deta. Isay "seat-lock abuse" kehte hain.
 *
 * IP ke bajaye user id se limit lagai hai - warna ek hi wifi (school,
 * office) par kai genuine parents ek doosre ko block kar dete.
 */
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: {
    success: false,
    message:
      "Too many booking attempts. Please wait a few minutes and try again.",
  },
});

/**
 * TARTEEB: khaas raaste "/:id" se PEHLE.
 */

/* -------------------------------- Parent -------------------------------- */
router.post("/", bookingLimiter, authorize("parent"), createBooking);
router.get("/my", authorize("parent", "admin"), getMyBookings);

/* ------------------------------ Instructor ------------------------------ */
router.get(
  "/instructor",
  authorize("instructor", "admin"),
  getInstructorBookings,
);
router.get(
  "/session/:activityId/:sessionId",
  authorize("instructor", "admin"),
  getSessionAttendees,
);

/* ------------------------- Parent / Instructor -------------------------- */
router.get("/:id", getBookingById); // andar access check hai
router.put("/:id/cancel", cancelBooking); // andar ownership check hai

module.exports = router;
