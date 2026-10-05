const mongoose = require("mongoose");

const Review = require("../models/Review");
const Activity = require("../models/Activity");
const Booking = require("../models/Booking");
const InstructorProfile = require("../models/InstructorProfile");

/** String ko ObjectId banata hai, ghalat ho to null */
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
 * BUGFIX: pehle yahan activityId seedha aata tha, aur woh request body ki
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
 * InstructorProfile ki rating.average aur rating.count recompute karta hai,
 * us instructor ki SAARI classes ke saare reviews mila kar.
 *
 * BUGFIX: ye function pehle tha hi nahi. Reviews sirf Activity.rating
 * update karti thin, aur InstructorProfile.rating hamesha {0, 0} par
 * baitha rehta tha. Do cheezein toot rahi thin:
 *   1. instructor cards/profile par hamesha "★ 0 (0)" dikhta tha
 *   2. "Highly Rated" badge (utils/badges.js me rating >= 4.5 aur
 *      reviews >= 5 maangta hai) kabhi trigger hi nahi ho sakta tha
 *
 * Note: Activity.instructor User ka reference hai (InstructorProfile ka
 * nahi), aur InstructorProfile us User se `user` field par judta hai.
 */
const recomputeInstructorRating = async (instructorUserIdInput) => {
  const instructorUserId = toObjectId(instructorUserIdInput);
  if (!instructorUserId) return;

  // Pehle is instructor ki saari classes ki ids, phir un par reviews.
  // ($lookup ke bajaye do chhoti queries - dono indexed hain aur padhne
  // me saaf hai.)
  const activities = await Activity.find({ instructor: instructorUserId })
    .select("_id")
    .lean();

  const activityIds = activities.map((a) => a._id);

  let average = 0;
  let count = 0;

  if (activityIds.length > 0) {
    const stats = await Review.aggregate([
      { $match: { activity: { $in: activityIds } } },
      {
        $group: {
          _id: null,
          average: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);

    if (stats[0]) {
      average = Math.round(stats[0].average * 10) / 10;
      count = stats[0].count;
    }
  }

  await InstructorProfile.updateOne(
    { user: instructorUserId },
    { $set: { "rating.average": average, "rating.count": count } },
  );
};

/**
 * @desc    Reviews: ek class ke, ya ek instructor ki saari classes ke
 * @route   GET /api/reviews?activity=<id>&limit=20
 *          GET /api/reviews?instructor=<userId>&limit=20
 * @access  Public
 */
const getReviews = async (req, res, next) => {
  try {
    const { activity, instructor } = req.query;

    /**
     * Do tarah se reviews mange ja sakte hain:
     *
     *   ?activity=<id>    ek class ke reviews (class detail page)
     *   ?instructor=<id>  us instructor ki SAARI classes ke reviews
     *
     * Instructor wala raasta is liye banaya ke profile page pehle har
     * class ke liye alag request bhejta tha (12 classes = 12 requests),
     * aur 12 se zyada classes wale instructor ke kuch reviews reh jate
     * the. Ab ek hi call kaafi hai.
     */
    if (!activity && !instructor) {
      return res.status(400).json({
        success: false,
        message: "activity or instructor query param is required",
      });
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const filter = {};

    if (activity) {
      // Ghalat id par pehle CastError se 500 aata tha, ab saaf 400
      const activityId = toObjectId(activity);
      if (!activityId) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid activity id" });
      }
      filter.activity = activityId;
    } else {
      const instructorId = toObjectId(instructor);
      if (!instructorId) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid instructor id" });
      }

      const classIds = await Activity.find({ instructor: instructorId })
        .select("_id")
        .lean();

      if (classIds.length === 0) {
        return res.json({ success: true, count: 0, reviews: [] });
      }

      filter.activity = { $in: classIds.map((c) => c._id) };
    }

    const reviews = await Review.find(filter)
      .populate("user", "name avatar")
      .populate("activity", "title slug")
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    next(error);
  }
};

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
     * hota hai, aur NaN ka har comparison false, yaani NaN dono checks paar
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
     * KAUN REVIEW KAR SAKTA HAI
     *
     * Pehle do sharten thin: is class ki booking mojood ho, aur us ki
     * session guzar chuki ho. Maqsad ye tha ke instructor apne doston se
     * 5-star na lagwa le, aur koi harif bina gaye 1-star na de de.
     *
     * Client ke kehne par ye sharten hata di gayi hain, taake wo log bhi
     * apna tajurba likh saken jinhon ne instructor ki onsite class attend
     * ki thi magar booking is site se nahi hui thi.
     *
     * Jo pehre ab bhi qaim hain: sirf "parent" account review kar sakta
     * hai (route par authorize("parent"), yani instructor apni hi class
     * par review nahi likh sakta), aur ek user ek class par sirf ek hi
     * review de sakta hai (Review model ka unique index).
     *
     * Booking thi ya nahi, ye ab bhi record hota hai (verifiedBooking),
     * bas us par koi rok nahi. Agar aage chal kar "Verified booking" ka
     * nishan dikhana ho to data pehle se mojood hoga.
     */
    const attendedBooking = await Booking.findOne({
      parent: req.user._id,
      activity: activityId,
      status: { $in: ["confirmed", "completed"] },
      sessionDate: { $lt: new Date() },
    }).select("_id");

    let review;
    try {
      review = await Review.create({
        activity: activityId,
        user: req.user._id,
        rating: numRating,
        comment: comment?.trim(),
        verifiedBooking: !!attendedBooking,
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
    // class ki rating ke sath instructor ki overall rating bhi refresh,
    // warna "Highly Rated" badge ka data kabhi update nahi hota
    await recomputeInstructorRating(activityDoc.instructor);

    const populated = await review.populate("user", "name avatar");

    res.status(201).json({ success: true, review: populated });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReviews,
  createReview,
  // backfill script (backfill-ratings.js) isay dobara use karti hai
  recomputeActivityRating,
  recomputeInstructorRating,
};
