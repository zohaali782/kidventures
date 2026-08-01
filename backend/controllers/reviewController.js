const mongoose = require("mongoose");
const Review = require("../models/Review");
const Activity = require("../models/Activity");
const Booking = require("../models/Booking");

/**
 * Kisi activity ki rating (average + count) dobara calculate karke Activity par save.
 * Har naye/delete hue review ke baad chalta hai — taake card/detail par sahi rating dikhe.
 */
async function recalcActivityRating(activityId) {
  const agg = await Review.aggregate([
    { $match: { activity: new mongoose.Types.ObjectId(activityId) } },
    {
      $group: {
        _id: "$activity",
        average: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);
  const { average = 0, count = 0 } = agg[0] || {};
  await Activity.findByIdAndUpdate(activityId, {
    "rating.average": Math.round(average * 10) / 10,
    "rating.count": count,
  });
}

/**
 * @desc   Naya review add karna
 * @route  POST /api/reviews
 * @access Private (parent)
 */
const createReview = async (req, res, next) => {
  try {
    const { activity, rating, comment } = req.body;

    if (!activity || !rating) {
      return res.status(400).json({
        success: false,
        message: "Activity and rating are required",
      });
    }
    if (rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ success: false, message: "Rating must be 1-5" });
    }

    const exists = await Activity.findById(activity);
    if (!exists) {
      return res
        .status(404)
        .json({ success: false, message: "Activity not found" });
    }

    const already = await Review.findOne({ activity, user: req.user._id });
    if (already) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this class",
      });
    }

    // VERIFIED REVIEWS: sirf wahi parent review kar sakta hai jisne class BOOK ki ho.
    // NOTE: field/status naam tumhare Booking model ke mutabiq adjust ho sakte hain
    // (agar zaroorat pade to Booking.js bhej dena, main exactly match kar dungi).
    const booking = await Booking.findOne({
      activity,
      $or: [{ user: req.user._id }, { parent: req.user._id }],
      status: { $in: ["paid", "confirmed", "completed", "attended"] },
    });
    if (!booking) {
      return res.status(403).json({
        success: false,
        message: "You can review this class only after booking it.",
      });
    }

    const review = await Review.create({
      activity,
      user: req.user._id,
      rating,
      comment,
    });

    await recalcActivityRating(activity);
    await review.populate("user", "name avatar");

    res.status(201).json({ success: true, review });
  } catch (error) {
    // duplicate key (race) ko friendly message
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this class",
      });
    }
    next(error);
  }
};

/**
 * @desc   Kisi activity ke reviews lena
 * @route  GET /api/reviews?activity=<id>&page=&limit=
 * @access Public
 */
const getReviews = async (req, res, next) => {
  try {
    const { activity } = req.query;
    if (!activity) {
      return res
        .status(400)
        .json({ success: false, message: "activity query is required" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    const [reviews, total] = await Promise.all([
      Review.find({ activity })
        .populate("user", "name avatar")
        .sort("-createdAt")
        .skip((page - 1) * limit)
        .limit(limit),
      Review.countDocuments({ activity }),
    ]);

    res.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      reviews,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Apna review delete karna (ya admin)
 * @route  DELETE /api/reviews/:id
 * @access Private
 */
const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    }
    if (
      String(review.user) !== String(req.user._id) &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    const activityId = review.activity;
    await review.deleteOne();
    await recalcActivityRating(activityId);

    res.json({ success: true, message: "Review removed" });
  } catch (error) {
    next(error);
  }
};

module.exports = { createReview, getReviews, deleteReview };
