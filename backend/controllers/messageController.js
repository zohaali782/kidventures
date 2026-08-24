const mongoose = require("mongoose");
const Message = require("../models/Message");
const User = require("../models/User");

// Only parent <-> instructor conversations are allowed, for now. This
// matches the only place the "Message" button actually appears (an
// instructor's public profile) and avoids opening this up to
// parent-to-parent or instructor-to-instructor messaging before there's
// a real need for it, plus keeps admin accounts out of random DMs.
const ALLOWED_PAIR = ["instructor", "parent"];

/**
 * @desc    Send a direct message to another user
 * @route   POST /api/messages
 * @access  Logged in (parent <-> instructor only)
 */
const sendMessage = async (req, res, next) => {
  try {
    const { recipientId, body } = req.body;

    if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid recipient" });
    }

    if (recipientId === req.user._id.toString()) {
      return res
        .status(400)
        .json({ success: false, message: "You can't message yourself" });
    }

    const text = String(body ?? "").trim();
    if (!text) {
      return res
        .status(400)
        .json({ success: false, message: "Message cannot be empty" });
    }
    if (text.length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Message is too long (max 2000 characters)",
      });
    }

    const recipient = await User.findById(recipientId).select("role");
    if (!recipient) {
      return res
        .status(404)
        .json({ success: false, message: "Recipient not found" });
    }

    const roles = [req.user.role, recipient.role].sort();
    if (JSON.stringify(roles) !== JSON.stringify(ALLOWED_PAIR)) {
      return res.status(403).json({
        success: false,
        message: "Messaging is only available between parents and instructors",
      });
    }

    const message = await Message.create({
      sender: req.user._id,
      recipient: recipientId,
      body: text,
    });

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    List the logged-in user's conversations, most recent first,
 *          one row per counterpart with the last message and unread count
 * @route   GET /api/messages/conversations
 * @access  Logged in
 */
const getConversations = async (req, res, next) => {
  try {
    const me = req.user._id;

    const conversations = await Message.aggregate([
      { $match: { $or: [{ sender: me }, { recipient: me }] } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ["$sender", me] }, "$recipient", "$sender"],
          },
          lastMessage: { $first: "$body" },
          lastAt: { $first: "$createdAt" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$recipient", me] },
                    { $eq: ["$read", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { lastAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          name: "$user.name",
          avatar: "$user.avatar",
          role: "$user.role",
          lastMessage: 1,
          lastAt: 1,
          unreadCount: 1,
        },
      },
    ]);

    res.json({ success: true, conversations });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get the full thread with one other user. Opening the thread
 *          also marks that user's messages to me as read.
 * @route   GET /api/messages/:userId
 * @access  Logged in
 */
const getThread = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user" });
    }

    const me = req.user._id;

    const otherUser = await User.findById(userId).select("name avatar role");
    if (!otherUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const messages = await Message.find({
      $or: [
        { sender: me, recipient: userId },
        { sender: userId, recipient: me },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(300);

    await Message.updateMany(
      { sender: userId, recipient: me, read: false },
      { $set: { read: true } },
    );

    res.json({ success: true, messages, otherUser });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Total unread message count for the logged-in user (nav badge)
 * @route   GET /api/messages/unread-count
 * @access  Logged in
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Message.countDocuments({
      recipient: req.user._id,
      read: false,
    });
    res.json({ success: true, count });
  } catch (error) {
    next(error);
  }
};

module.exports = { sendMessage, getConversations, getThread, getUnreadCount };
