const InstructorProfile = require("../models/InstructorProfile");
const Booking = require("../models/Booking");

/**
 * Badge thresholds - ek hi jaga par, taake tune karna aasan ho.
 *
 * founding : sab se pehle 20 approved instructors - automatic, join order se.
 * popular  : is calendar month me kam az kam itni confirmed/completed bookings.
 * bronze   : rating + reviews dono threshold poore hon.
 * admin    : InstructorProfile.hasBadge - admin apni marzi se deta hai
 *            (Admin Dashboard ke "Give Badge" button se), ye badge system
 *            se alag/manual hai, bas yahan sath compute ho jata hai.
 */
const FOUNDING_INSTRUCTOR_COUNT = 20;
const POPULAR_BOOKINGS_THRESHOLD = 5;
const BRONZE_MIN_RATING = 4.5;
const BRONZE_MIN_REVIEWS = 5;

/**
 * Pehle N approved instructors ki InstructorProfile._id set - join order
 * (createdAt ascending) se. Isay dobara dobara call karne se hamesha
 * up-to-date result milta hai (naye instructors approved hote rehte hain
 * to list khud hi settle ho jati hai, lekin ek dafa jo pehle N me aa gaya
 * wo hamesha founding rahega jab tak approved list se hat na jaye).
 */
async function getFoundingInstructorIds() {
  const founders = await InstructorProfile.find({
    verificationStatus: "approved",
    isSuspended: false,
  })
    .sort({ createdAt: 1 })
    .limit(FOUNDING_INSTRUCTOR_COUNT)
    .select("_id");

  return new Set(founders.map((f) => String(f._id)));
}

/**
 * Is (calendar) mahine me jin instructors (User id se) ki confirmed/completed
 * bookings threshold se zyada hain, unke User id ka set. Booking.instructor
 * User ka reference hai, InstructorProfile ka nahi - isliye ye set User id
 * par based hai, aur computeBadges() usay profile.user se match karta hai.
 */
async function getPopularInstructorUserIds() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const rows = await Booking.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfMonth },
        status: { $in: ["confirmed", "completed"] },
      },
    },
    { $group: { _id: "$instructor", count: { $sum: 1 } } },
    { $match: { count: { $gte: POPULAR_BOOKINGS_THRESHOLD } } },
  ]);

  return new Set(rows.map((r) => String(r._id)));
}

/**
 * Ek InstructorProfile (document ya .toObject() hua plain object) ke liye
 * chaaron badges ka flag object banata hai. foundingIds/popularUserIds
 * getFoundingInstructorIds()/getPopularInstructorUserIds() se pehle se
 * fetch kar ke pass karna hain (har profile ke liye dobara query nahi karni).
 */
function computeBadges(profile, foundingIds, popularUserIds) {
  const userId = String(profile.user?._id || profile.user || "");
  const rating = profile.rating || {};

  return {
    founding: foundingIds.has(String(profile._id)),
    popular: popularUserIds.has(userId),
    bronze:
      (rating.average || 0) >= BRONZE_MIN_RATING &&
      (rating.count || 0) >= BRONZE_MIN_REVIEWS,
    admin: Boolean(profile.hasBadge),
  };
}

module.exports = {
  getFoundingInstructorIds,
  getPopularInstructorUserIds,
  computeBadges,
  FOUNDING_INSTRUCTOR_COUNT,
  POPULAR_BOOKINGS_THRESHOLD,
  BRONZE_MIN_RATING,
  BRONZE_MIN_REVIEWS,
};
