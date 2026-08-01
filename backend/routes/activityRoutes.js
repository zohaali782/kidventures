const express = require("express");
const router = express.Router();

const {
  getActivities,
  getFeaturedActivities,
  getMyActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  addSession,
  deleteSession,
} = require("../controllers/activityController");

const { protect, authorize } = require("../middleware/auth");
const { optionalAuth } = require("../middleware/optionalAuth");
const {
  requireApprovedInstructor,
} = require("../middleware/requireApprovedInstructor");

/**
 * TARTEEB ZAROORI HAI:
 * "/featured" aur "/my-classes" ko "/:id" se PEHLE likhna hai.
 * Warna Express samjhega ke "featured" hi koi id hai.
 */

/* ------------------------------- PUBLIC -------------------------------- */
router.get("/", getActivities); // search + filters + pagination
router.get("/featured", getFeaturedActivities); // homepage

/* ----------------------------- INSTRUCTOR ------------------------------ */
router.get(
  "/my-classes",
  protect,
  authorize("instructor", "admin"),
  getMyActivities,
);

/* --------------------- PUBLIC (magar login se behtar) ------------------- */
router.get("/:id", optionalAuth, getActivityById);

/* -------------------- INSTRUCTOR - apni classes hi ---------------------
 *
 * SECURITY GATE:
 * requireApprovedInstructor = sirf woh instructor class bana/edit kar
 * sakta hai jise admin ne approve kiya ho aur jo suspended na ho.
 *
 * NOTE: delete par ye gate JAAN BOOJH KAR nahi lagaya - suspended
 * instructor ko bhi apni class hatane ka haq hona chahiye.
 */
router.post(
  "/",
  protect,
  authorize("instructor", "admin"),
  requireApprovedInstructor,
  createActivity,
);

router.put(
  "/:id",
  protect,
  authorize("instructor", "admin"),
  requireApprovedInstructor,
  updateActivity,
);

router.delete(
  "/:id",
  protect,
  authorize("instructor", "admin"),
  deleteActivity,
);

router.post(
  "/:id/sessions",
  protect,
  authorize("instructor", "admin"),
  requireApprovedInstructor,
  addSession,
);

router.delete(
  "/:id/sessions/:sessionId",
  protect,
  authorize("instructor", "admin"),
  deleteSession,
);

module.exports = router;
