const mongoose = require("mongoose");

/**
 * Payment - Stripe transaction ka record.
 *
 * Booking se alag rakha hai taake refunds aur instructor payouts ka
 * saaf audit trail rahe - kis booking ka kitna paisa aaya, kitna
 * commission tha, kitna refund hua.
 */
const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    amount: { type: Number, required: true, min: 0 }, // parent ne kitna diya (total)
    currency: { type: String, default: "AED" },
    commissionAmount: { type: Number, required: true },
    instructorAmount: { type: Number, required: true },

    /* ------------------------------- Stripe ------------------------------- */
    stripePaymentIntentId: { type: String, index: true },
    stripeChargeId: String,
    paymentMethod: String, // "card"...
    cardLast4: String,
    cardBrand: String,

    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "succeeded",
        "failed",
        "refunded",
        "partially_refunded",
      ],
      default: "pending",
      index: true,
    },
    failureReason: String,
    paidAt: Date,

    /* ------------------------------ Refunds ------------------------------- */
    refunds: [
      {
        amount: { type: Number, required: true },
        reason: String,
        stripeRefundId: String,
        issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // admin
        issuedAt: { type: Date, default: Date.now },
      },
    ],
    totalRefunded: { type: Number, default: 0 },

    /* ------------------------- Instructor payout -------------------------- */
    // Phase 1 me payout manually ho sakta hai - bas record rakhna hai
    payoutStatus: {
      type: String,
      enum: ["pending", "processing", "paid", "on_hold", "cancelled"],
      default: "pending",
      index: true,
    },
    payoutDate: Date,
    payoutReference: String,
    payoutNote: String,
  },
  { timestamps: true },
);

paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ instructor: 1, payoutStatus: 1 });

module.exports = mongoose.model("Payment", paymentSchema);
