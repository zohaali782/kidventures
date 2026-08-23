const express = require("express");
const router = express.Router();

const {
  getInstructorApplications,
  getApplicationDetail,
  approveInstructor,
  rejectInstructor,
  toggleSuspendInstructor,
  toggleFeatureInstructor,
  approveActivity,
  toggleSuspendActivity,
  removeActivity,
  resolveCategorySuggestion,
  toggleBlockUser,
  getAdminStats,
  getAllUsers,
  getAllActivities,
  getAllBookings,
  getClassRequests,
  getPendingRefunds,
  resolveRefund,
} = require("../controllers/adminController");

const { protect, authorize } = require("../middleware/auth");

/**
 * SECURITY: poore router par ek hi baar admin check.
 * Neeche har route apne aap mehfooz ho gaya - kisi ek par
 * bhool jane ka khatra nahi.
 */
router.use(protect, authorize("admin"));

/* --------------------------------- Overview -------------------------------- */
router.get("/stats", getAdminStats);

/* ------------------------ Instructor verification ----------------------- */
router.get("/instructors", getInstructorApplications);
router.get("/instructors/:id", getApplicationDetail); // documents ke saath
router.put("/instructors/:id/approve", approveInstructor);
router.put("/instructors/:id/reject", rejectInstructor);
router.put("/instructors/:id/suspend", toggleSuspendInstructor);
router.put("/instructors/:id/feature", toggleFeatureInstructor);

/* -------------------------------- Classes -------------------------------- */
router.get("/activities", getAllActivities);
router.put("/activities/:id/approve", approveActivity);
router.put("/activities/:id/suspend", toggleSuspendActivity);
router.put("/activities/:id/resolve-category", resolveCategorySuggestion);
router.delete("/activities/:id", removeActivity);

/* --------------------------------- Users --------------------------------- */
router.get("/users", getAllUsers);
router.put("/users/:id/block", toggleBlockUser);

/* -------------------------------- Bookings -------------------------------- */
router.get("/bookings", getAllBookings);

/* --------------------------------- Refunds -------------------------------- */
// Cancelled bookings jin ka refund abhi review ka intezar kar raha hai
router.get("/refunds", getPendingRefunds);
router.put("/refunds/:id/resolve", resolveRefund);

/* ---------------------------- Class Requests ---------------------------- */
router.get("/class-requests", getClassRequests);

module.exports = router;
