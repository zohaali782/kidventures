const express = require("express");
const router = express.Router();

const { getReviews, createReview } = require("../controllers/reviewController");
const { protect, authorize } = require("../middleware/auth");

router.get("/", getReviews);
router.post("/", protect, authorize("parent"), createReview);

module.exports = router;
