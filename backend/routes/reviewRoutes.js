const express = require("express");
const router = express.Router();

const {
  createReview,
  getReviews,
  deleteReview,
} = require("../controllers/reviewController");

const { protect, authorize } = require("../middleware/auth");

// Sab /api/reviews ke neeche (server.js me mount hota hai)
router.get("/", getReviews); // GET /api/reviews?activity=<id>   (public)
router.post("/", protect, authorize("parent"), createReview); // POST /api/reviews
router.delete("/:id", protect, deleteReview); // DELETE /api/reviews/:id

module.exports = router;
