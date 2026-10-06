const express = require("express");
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
const router = express.Router();

const { getReviews, createReview } = require("../controllers/reviewController");
const { optionalAuth } = require("../middleware/optionalAuth");

/**
 * SPAM ROKNA.
 *
 * Reviews ab bina login ke bhi likhi ja sakti hain (client ka faisla), is
 * liye "ek user ek review" wali shart mehmaan reviews par nahi lag sakti.
 * Us ki jagah yahan ek rate limit hai: ek ghante me 5 reviews.
 *
 * Login hua ho to user id se ginti hoti hai, warna IP se. ipKeyGenerator
 * is liye istemal kiya hai ke wo IPv6 ko sahi tareeqe se normalize karta
 * hai, warna ek hi shakhs apne IPv6 ka aakhri hissa badal kar limit se
 * nikal jata.
 *
 * Ye akela pehra kaafi nahi hai, is liye admin dashboard me reviews ki
 * list aur delete ka button bhi hai.
 */
const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || ipKeyGenerator(req.ip),
  message: {
    success: false,
    message:
      "You've posted a few reviews already. Please try again in a little while.",
  },
});

router.get("/", getReviews);

/**
 * optionalAuth: login hua ho to req.user bhar deta hai, na hua ho to bhi
 * request aage jaane deta hai. Instructor apni class par review na likh
 * sake, ye shart ab controller ke andar hai.
 */
router.post("/", optionalAuth, reviewLimiter, createReview);

module.exports = router;
