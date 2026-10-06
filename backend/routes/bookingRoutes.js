const express = require("express");
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
const router = express.Router();

const {
  createBooking,
  createManualBooking,
  reserveFundraiserSpot,
  getPendingFundraiserBookings,
  confirmFundraiserBooking,
  getMyBookings,
  getInstructorBookings,
  getBookingById,
  cancelBooking,
  getSessionAttendees,
  getBookingReceipt,
} = require("../controllers/bookingController");

const { protect, authorize } = require("../middleware/auth");

/**
 * SPAM / SEAT-LOCK ABUSE ROKNA, charity fundraiser wale khule raaste par.
 *
 * Ye ikloti booking request hai jis ke liye login nahi chahiye, is liye
 * yahan pehchan ke liye sirf IP hai. Bina is limit ke koi ek script fundraiser
 * class ki saari seats 24 ghante ke liye rok sakti thi.
 *
 * ipKeyGenerator is liye ke wo IPv6 ko sahi normalize karta hai, warna ek
 * hi shakhs apne IPv6 ka aakhri hissa badal kar limit se nikal jata.
 */
const fundraiserLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 4,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  message: {
    success: false,
    message:
      "Too many booking attempts from this device. Please try again later, " +
      "or message the instructor on WhatsApp.",
  },
});

/**
 * KHULA RAASTA, protect se PEHLE.
 *
 * Charity fundraiser class par payment charity ki apni site par hoti hai,
 * is liye wahan parent se account banwana sirf ek rukawat hai. Woh form
 * bhar kar apni seat rok leta hai, aur instructor baad me WhatsApp ka
 * screenshot dekh kar usay confirm karta hai.
 *
 * Controller ke andar pehre: class ka fundraiser mode on hona chahiye,
 * naam aur number lazmi hain, aur ek hi number se dobara seat nahi rukti.
 */
router.post("/fundraiser", fundraiserLimiter, reserveFundraiserSpot);

// Yahan se aage har booking route ke liye login zaroori
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
  keyGenerator: (req) => req.user?._id?.toString() || ipKeyGenerator(req.ip),
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
/**
 * Charity fundraiser class ki booking haath se likhna. Controller ke andar
 * do pehre hain: class ka fundraiser mode on hona chahiye, aur instructor
 * wohi hona chahiye jiski class hai (ya admin).
 */
router.post(
  "/manual",
  authorize("instructor", "admin"),
  createManualBooking,
);
router.get(
  "/fundraiser/pending",
  authorize("instructor", "admin"),
  getPendingFundraiserBookings,
);
router.put(
  "/fundraiser/:id/confirm",
  authorize("instructor", "admin"),
  confirmFundraiserBooking,
);
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
router.get("/:id/receipt", getBookingReceipt); // andar access check hai
router.put("/:id/cancel", cancelBooking); // andar ownership check hai

module.exports = router;
