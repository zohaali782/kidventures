const mongoose = require("mongoose");

/**
 * Review = ek parent ka kisi class par rating + comment.
 * Ek parent ek class ko sirf EK dafa review kar sakta hai (unique index).
 */
const reviewSchema = new mongoose.Schema(
  {
    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Activity",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true },
);

// ek user + ek activity = ek hi review
reviewSchema.index({ activity: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);
