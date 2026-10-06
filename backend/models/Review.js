const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Activity",
      required: true,
      index: true,
    },

    /**
     * Account wala review. Mehmaan (guest) review par ye khali hota hai,
     * is liye required nahi hai. Jahan bhi review.user parha jaye, pehle
     * mojoodgi check karo ya optional chaining istemal karo.
     */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    /**
     * Bina login ke review likhne wale ka naam. Client ka faisla tha ke
     * review sab ke liye khula ho, taake wo log bhi likh saken jinhon ne
     * instructor ki class onsite attend ki thi magar is site par account
     * nahi banaya.
     *
     * Naam lazmi hai: koi nishan to hona chahiye ke review kis ne likha,
     * warna list "Anonymous" ki qatar ban jati hai aur parents ka bharosa
     * uth jata hai.
     */
    guestName: {
      type: String,
      trim: true,
      maxlength: 60,
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

/**
 * Ek user + ek activity = ek hi review.
 *
 * partialFilterExpression ZAROORI hai. Pehle ye index saadha unique tha,
 * jab har review ke sath user hota tha. Ab mehmaan reviews me user khali
 * hota hai, aur saadha unique index me do khali qadrein bhi "ek jaisi"
 * ginti hain, yani ek class par doosra mehmaan review kabhi save hi na
 * hota. Ab ye shart sirf un reviews par lagti hai jin me user mojood hai.
 *
 * NOTE: ye naya index purane wale ki jagah leta hai. Purana index database
 * me pehle se mojood hai, aur MongoDB ek hi naam ke do mukhtalif index
 * nahi banne deta. Deploy se pehle ek baar
 * `node backend/scripts/fix-review-index.js` chala kar purana index
 * hatana hoga.
 */
reviewSchema.index(
  { activity: 1, user: 1 },
  {
    unique: true,
    name: "activity_1_user_1_registered",
    partialFilterExpression: { user: { $type: "objectId" } },
  },
);

module.exports = mongoose.model("Review", reviewSchema);
