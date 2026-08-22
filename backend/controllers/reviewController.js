const Review = require("../models/Review");
const Activity = require("../models/Activity");
const Booking = require("../models/Booking");

/**
 * Activity ki rating.average aur rating.count recompute karta hai
 * saari uski reviews se. Review add/edit/delete ke baad call hota hai.
 */
const recomputeActivityRating = async (activityId) => {
  const stats = await Review.aggregate([
    { $match: { activity: activityId } },
    {
      $group: {
        _id: "$activity",
        average: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const average = stats[0] ? Math.round(stats[0].average * 10) / 10 : 0;
  const count = stats[0] ? stats[0].count : 0;

  await Activity.updateOne(
    { _id: activityId },
    { $set: { "rating.average": average, "rating.count": count } },
  );
};

/**
 * @desc    Ek class ke saare reviews
 * @route   GET /api/reviews?activity=<id>&limit=20
 * @access  Public
 */
const getReviews = async (req, res, next) => {
  try {
    const { activity } = req.query;

    if (!activity) {
      return res
        .status(400)
        .json({ success: false, message: "activity query param is required" });
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);

    const reviews = await Review.find({ activity })
      .populate("user", "name avatar")
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Review post karna
 * @route   POST /api/reviews
 * @access  Parent
 * Body: { activity, rating, comment }
 *
 * SECURITY: sirf wahi parent review kar sakta hai jisne is class ki
 * confirmed/completed booking ki ho - warna koi bhi random rating de sakta.
 */
const createReview = async (req, res, next) => {
  try {
    const { activity, rating, comment } = req.body;

    if (!activity || !rating) {
      return res.status(400).json({
        success: false,
        message: "activity and rating are required",
      });
    }

    const numRating = Number(rating);
    if (numRating < 1 || numRating > 5) {
      return res
        .status(400)
        .json({ success: false, message: "Rating must be between 1 and 5" });
    }

    const activityDoc = await Activity.findById(activity);
    if (!activityDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    // Ownership check: parent ne is class ki booking ki ho aur
    // uska status confirmed ya completed ho.
    const hasBooking = await Booking.exists({
      parent: req.user._id,
      activity,
      status: { $in: ["confirmed", "completed"] },
    });

    if (!hasBooking) {
      return res.status(403).json({
        success: false,
        message: "You can only review classes you've booked",
      });
    }

    let review;
    try {
      review = await Review.create({
        activity,
        user: req.user._id,
        rating: numRating,
        comment: comment?.trim(),
      });
    } catch (err) {
      // duplicate key -> already reviewed
      if (err.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "You've already reviewed this class",
        });
      }
      throw err;
    }

    await recomputeActivityRating(activity);

    const populated = await review.populate("user", "name avatar");

    res.status(201).json({ success: true, review: populated });
  } catch (error) {
    next(error);
  }
};

module.exports = { getReviews, createReview };
