const express = require("express");
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
const router = express.Router();

const {
  sendMessage,
  getConversations,
  getThread,
  getUnreadCount,
} = require("../controllers/messageController");

const { protect } = require("../middleware/auth");

// Stops one account from flooding another with messages.
const messageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || ipKeyGenerator(req.ip),
  message: {
    success: false,
    message: "Too many messages sent. Please wait a few minutes.",
  },
});

router.use(protect); // every route here needs a logged-in user

// NOTE: these two fixed paths must come before "/:userId", otherwise
// Express would treat "conversations" / "unread-count" as a userId.
router.get("/conversations", getConversations);
router.get("/unread-count", getUnreadCount);
router.post("/", messageLimiter, sendMessage);
router.get("/:userId", getThread);

module.exports = router;
