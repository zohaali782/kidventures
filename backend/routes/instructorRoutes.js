const express = require("express");
const router = express.Router();

const {
  getMyProfile,
  updateMyProfile,
  submitForVerification,
  getInstructors,
  getInstructorById,
  startConnectOnboarding,
  getConnectStatus,
} = require("../controllers/instructorController");

const { protect, authorize } = require("../middleware/auth");

/**
 * TARTEEB: "/me" ko "/:userId" se PEHLE likhna hai,
 * warna Express "me" ko hi koi userId samajh lega.
 */

/* ---------------------------- INSTRUCTOR (apna) ------------------------- */
router.get("/me", protect, authorize("instructor"), getMyProfile);
router.put("/me", protect, authorize("instructor"), updateMyProfile);
router.post(
  "/me/submit",
  protect,
  authorize("instructor"),
  submitForVerification,
);

/* ------------------------- Stripe Connect (payouts) ---------------------- */
router.post(
  "/me/connect/onboarding-link",
  protect,
  authorize("instructor"),
  startConnectOnboarding,
);
router.get(
  "/me/connect/status",
  protect,
  authorize("instructor"),
  getConnectStatus,
);

/* -------------------------------- PUBLIC -------------------------------- */
router.get("/", getInstructors);
router.get("/:userId", getInstructorById);

module.exports = router;
