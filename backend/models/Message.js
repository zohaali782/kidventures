const mongoose = require("mongoose");

/**
 * Message - a single direct message between two users.
 *
 * There's no separate "Conversation" document - the pair of (sender,
 * recipient) forms a conversation implicitly, and the conversation list
 * is built by aggregating messages grouped by counterpart. Keeps this
 * simple for a first version; a dedicated Conversation model can be
 * added later if this needs to grow (group chats, archiving, etc).
 */
const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    body: {
      type: String,
      required: [true, "Message cannot be empty"],
      trim: true,
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Loading one thread (sender <-> recipient, newest first)
messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
// Counting/marking a user's unread messages
messageSchema.index({ recipient: 1, read: 1 });

module.exports = mongoose.model("Message", messageSchema);
