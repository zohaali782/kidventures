/**
 * Ek dafa chalane wali script - purani reviews se instructor ratings bharti hai.
 *
 * Chalane ka tareeqa (backend folder ke andar se):
 *   node backfill-ratings.js
 *
 * Zaroorat kyun: InstructorProfile.rating kabhi update hi nahi hota tha
 * (sirf Activity.rating hoti thi), is liye jo reviews pehle se database me
 * hain unse instructor ki rating nahi bani. Naya code aage ki har review
 * par khud update karega, magar purani reviews ke liye ye script chalani hai.
 *
 * Ye script sirf ratings recompute karti hai - koi data delete ya create
 * nahi karti, is liye production par chalana bhi mehfooz hai. Dobara chala
 * dein to bhi wahi nateeja aayega.
 *
 * Kaam hone ke baad ye file delete kar sakti hain.
 */

require("dotenv").config();
const mongoose = require("mongoose");

const InstructorProfile = require("./models/InstructorProfile");
const Activity = require("./models/Activity");
const {
  recomputeActivityRating,
  recomputeInstructorRating,
} = require("./controllers/reviewController");

const run = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error("\n✗ MONGO_URI .env me nahi mila.");
      console.error("  Ye script backend folder ke andar se chalayein:\n");
      console.error("  cd C:\\Users\\hp\\kidventures\\backend");
      console.error("  node backfill-ratings.js\n");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("\n✓ Connected to MongoDB\n");

    /* ---------------- 1. Har class ki rating ---------------- */
    const activities = await Activity.find().select("_id title").lean();
    for (const a of activities) {
      await recomputeActivityRating(a._id);
    }
    console.log(`✓ ${activities.length} classes ki rating recompute ho gayi`);

    /* ---------------- 2. Har instructor ki rating ---------------- */
    const profiles = await InstructorProfile.find()
      .select("_id user")
      .populate("user", "name")
      .lean();

    console.log("");
    for (const p of profiles) {
      const userId = p.user?._id || p.user;
      if (!userId) continue;

      await recomputeInstructorRating(userId);

      const updated = await InstructorProfile.findById(p._id)
        .select("rating")
        .lean();

      const name = p.user?.name || String(userId);
      const avg = updated?.rating?.average ?? 0;
      const count = updated?.rating?.count ?? 0;
      console.log(`  ${name}: ★ ${avg} (${count} reviews)`);
    }

    console.log(`\n✓ ${profiles.length} instructors ki rating recompute ho gayi`);
    console.log(
      "\nAb /instructors aur instructor profile par asli rating dikhni chahiye,",
    );
    console.log(
      'aur 4.5+ rating wale 5+ reviews wale instructors par "Highly Rated" badge.\n',
    );

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("\n✗ Script fail ho gayi:", error.message, "\n");
    process.exit(1);
  }
};

run();
