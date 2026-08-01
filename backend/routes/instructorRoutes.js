const express = require("express");
const router = express.Router();

const {
  getMyProfile,
  updateMyProfile,
  submitForVerification,
  getInstructors,
  getInstructorById,
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

/* -------------------------------- PUBLIC -------------------------------- */
router.get("/", getInstructors);
router.get("/:userId", getInstructorById);

module.exports = router;
