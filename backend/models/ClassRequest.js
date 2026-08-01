const mongoose = require("mongoose");

/**
 * ClassRequest - jab koi parent (ya visitor) koi aisi class dhoondta hai
 * jo abhi platform par nahi hai. Login zaroori nahi - is liye login
 * check ke bajaye seedha email li jati hai taake baad me notify kar sakein.
 *
 * Admin in requests ko group karke dekhta hai (kaunsi category + area +
 * age group sabse zyada maangi ja rahi hai) taake pata chale kaunsa
 * instructor recruit karna hai next.
 */
const classRequestSchema = new mongoose.Schema(
  {
    // Agar requester logged-in parent tha to uska record - warna khali.
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Free text - instructor jaisa CreateClassPage ka "Other" category,
    // yahan bhi koi bhi cheez type ki ja sakti hai.
    category: {
      type: String,
      required: [true, "Please tell us what kind of class you're after"],
      trim: true,
      maxlength: 80,
    },
    ageGroup: {
      type: String,
      required: [true, "Please choose an age group"],
      trim: true,
    },
    location: {
      type: String,
      required: [true, "Please tell us which area suits you"],
      trim: true,
      maxlength: 80,
    },
    format: {
      type: String,
      enum: ["any", "in-person", "online"],
      default: "any",
    },
    note: { type: String, trim: true, maxlength: 500 },

    email: {
      type: String,
      required: [true, "Please enter your email so we can notify you"],
      trim: true,
      lowercase: true,
    },
    notify: { type: Boolean, default: true },

    // Jab admin isi tarah ki class live kar de, is field se track hoga
    // ke is request wale ko email ja chuki hai (email step abhi TODO hai).
    notifiedAt: Date,
  },
  { timestamps: true },
);

classRequestSchema.index({ category: 1, location: 1, ageGroup: 1 });
classRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ClassRequest", classRequestSchema);
