const mongoose = require("mongoose");

const Review = require("../models/Review");
const Activity = require("../models/Activity");
const Booking = require("../models/Booking");

/** String ko ObjectId banata hai — ghalat ho to null */
const toObjectId = (value) => {
  const str = String(value || "");
  return mongoose.Types.ObjectId.isValid(str)
    ? new mongoose.Types.ObjectId(str)
    : null;
};

/**
 * Activity ki rating.average aur rating.count recompute karta hai
 * saari uski reviews se. Review add/edit/delete ke baad call hota hai.
 *
 * BUGFIX: pehle yahan activityId seedha aata tha — aur woh request body ki
 * STRING hoti thi. Aggregation pipeline me Mongoose schema casting NAHI
 * lagti (normal find() ke bar-aks), is liye string kabhi ObjectId se match
 * hi nahi karti thi. Nateeja: $match hamesha khali, aur har review ke baad
 * class ki rating 0 set ho jati thi.
 *
 * Ab ObjectId me badal kar bhejte hain.
 */
const recomputeActivityRating = async (activityIdInput) => {
  const activityId = toObjectId(activityIdInput);
  if (!activityId) return;

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

    // Ghalat id par pehle CastError se 500 aata tha — ab saaf 400
    const activityId = toObjectId(activity);
    if (!activityId) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid activity id" });
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);

    const reviews = await Review.find({ activity: activityId })
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

    const activityId = toObjectId(activity);
    if (!activityId) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid activity id" });
    }

    /**
     * Number.isInteger ka check zaroori hai.
     *
     * Pehle sirf "numRating < 1 || numRating > 5" tha. Number("abc") = NaN
     * hota hai, aur NaN ka har comparison false — yaani NaN dono checks paar
     * kar jata aur aage Mongoose par crash karta. 4.7 jaisi rating bhi chal
     * jati thi, halanke stars poore hi hote hain.
     */
    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be a whole number between 1 and 5",
      });
    }

    const activityDoc = await Activity.findById(activityId);
    if (!activityDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    /**
     * Ownership check: parent ne is class ki booking ki ho.
     *
     * AUR — class ho bhi chuki ho.
     *
     * Pehle sirf status "confirmed" kaafi tha, jis ka matlab tha ke koi agle
     * mahine ki class book kar ke usi waqt 5-star (ya 1-star) review likh
     * sakta tha. Yaani instructor apne doston se bina attend kiye achi
     * rating lagwa sakta, aur koi harif bina gaye buri rating de sakta.
     *
     * Ab session ki date guzri hui honi chahiye.
     */
    const attendedBooking = await Booking.findOne({
      parent: req.user._id,
      activity: activityId,
      status: { $in: ["confirmed", "completed"] },
      sessionDate: { $lt: new Date() },
    }).select("_id");

    if (!attendedBooking) {
      // Booking hai magar class abhi hui nahi — alag message, taake
      // parent ko samajh aaye ke masla kya hai
      const upcoming = await Booking.exists({
        parent: req.user._id,
        activity: activityId,
        status: { $in: ["confirmed", "completed"] },
      });

      return res.status(403).json({
        success: false,
        message: upcoming
          ? "You can leave a review once the class has taken place"
          : "You can only review classes you've booked",
      });
    }

    let review;
    try {
      review = await Review.create({
        activity: activityId,
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

    await recomputeActivityRating(activityId);

    const populated = await review.populate("user", "name avatar");

    res.status(201).json({ success: true, review: populated });
  } catch (error) {
    next(error);
  }
};

module.exports = { getReviews, createReview };
