const mongoose = require("mongoose");

/**
 * Booking - parent ki ek class ke liye booking (ek ya zyada bachay).
 *
 * Ahem: prices aur children ki details "snapshot" ho jati hain.
 * Yani booking ke waqt jo qeemat thi, wohi hamesha record me rahegi -
 * chahe instructor baad me price badal de. Isi tarah agar parent
 * bachay ka record delete kar de to bhi booking me naam mehfooz rahega.
 */
const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: { type: String, unique: true, index: true },

    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Activity",
      required: true,
      index: true,
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /* ------------------------------ Session ------------------------------- */
    sessionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    sessionDate: { type: Date, required: true, index: true },
    startTime: String,
    endTime: String,

    // Class ka naam bhi snapshot - listing me har baar populate na karna pare
    activityTitle: String,

    /* ------------------------------ Children ------------------------------ */
    children: [
      {
        child: { type: mongoose.Schema.Types.ObjectId, ref: "Child" },
        name: String,
        age: Number,
        allergies: String,
      },
    ],
    numberOfChildren: { type: Number, required: true, min: 1 },

    /* ------------------------------- Money -------------------------------- */
    // Ye sab SERVER calculate karta hai - frontend se kabhi nahi aata
    pricePerChild: { type: Number, required: true, min: 0 },

    // SIBLING DISCOUNT: discount se pehle ka subtotal, kitna % discount
    // laga, aur kitni rakam discount hui - teeno record rehte hain taake
    // baad me (receipts, admin, disputes) exact hisaab dikha sakein.
    subtotalBeforeDiscount: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },

    subtotal: { type: Number, required: true, min: 0 }, // discount ke BAAD - parent isi ka payment karta hai
    currency: { type: String, default: "AED" },
    commissionPercent: { type: Number, required: true },
    commissionAmount: { type: Number, required: true },
    instructorEarning: { type: Number, required: true },
    totalAmount: { type: Number, required: true, min: 0 },

    /* ------------------------------- Status ------------------------------- */
    // pending   -> seat reserve ho gayi, payment ka intezar
    // confirmed -> payment ho gaya
    // completed -> class ho chuki
    // cancelled -> cancel ho gayi
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled", "refunded"],
      default: "pending",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "failed", "refunded", "partially_refunded"],
      default: "unpaid",
      index: true,
    },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },

    // Payment na hone par kab tak seat rok kar rakhni hai
    reservationExpiresAt: Date,

    cancellation: {
      cancelledBy: {
        type: String,
        enum: ["parent", "instructor", "admin", "system"],
      },
      cancelledAt: Date,
      reason: String,
      refundAmount: { type: Number, default: 0 },
    },

    /* ---------------------------- Notifications --------------------------- */
    emailsSent: {
      confirmation: { type: Boolean, default: false },
      reminder24h: { type: Boolean, default: false },
      cancellation: { type: Boolean, default: false },
    },

    parentNotes: { type: String, maxlength: 500 },
    hasReview: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

/* --------------------------------- Hooks ---------------------------------- */
/**
 * Booking number banata hai: KV-2026-K3F9A2
 *
 * NOTE: counting ke bajaye time + random istemal kiya hai. Agar do
 * bookings bilkul ek hi lamhe me hon to counting wala tareeqa
 * duplicate number bana deta - ye nahi banata.
 *
 * NOTE 2: Mongoose 9 me hook me "next" nahi hota.
 */
bookingSchema.pre("save", function () {
  if (this.bookingNumber) return;

  const year = new Date().getFullYear();
  const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

  this.bookingNumber = `KV-${year}-${unique.toUpperCase()}`;
});

/* -------------------------------- Virtuals -------------------------------- */
/**
 * Cancellation policy: class se 24 ghante pehle tak full refund.
 */
bookingSchema.virtual("isRefundable").get(function () {
  if (this.status !== "confirmed" || this.paymentStatus !== "paid")
    return false;

  const hoursLeft =
    (new Date(this.sessionDate) - Date.now()) / (1000 * 60 * 60);
  return hoursLeft >= 24;
});

bookingSchema.virtual("hoursUntilClass").get(function () {
  return Math.round(
    (new Date(this.sessionDate) - Date.now()) / (1000 * 60 * 60),
  );
});

/* -------------------------------- Indexes --------------------------------- */
bookingSchema.index({ parent: 1, sessionDate: -1 });
bookingSchema.index({ instructor: 1, sessionDate: -1 });
bookingSchema.index({ status: 1, sessionDate: 1 }); // reminder cron ke liye
bookingSchema.index({ status: 1, reservationExpiresAt: 1 }); // cleanup ke liye

module.exports = mongoose.model("Booking", bookingSchema);
