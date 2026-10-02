const mongoose = require("mongoose");

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
    /**
     * Review likhne wale ki is class ki booking is site se hui thi ya nahi.
     * Review likhne par is ki koi rok nahi (dekho reviewController ka
     * createReview), ye sirf record ke liye hai, taake aage chal kar
     * "Verified booking" ka nishan dikhana ho to purana data mojood ho.
     */
    verifiedBooking: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// ek user + ek activity = ek hi review
reviewSchema.index({ activity: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);
