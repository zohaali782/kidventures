const mongoose = require("mongoose");

/**
 * Session - ek class ka individual date/time slot.
 * Activity ke andar embed kiya hai kyunke sessions hamesha
 * apni class ke saath hi load hote hain.
 */
const sessionSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    startTime: { type: String, required: true }, // "10:00"
    endTime: { type: String, required: true }, // "11:30"
    capacity: { type: Number, required: true, min: 1 },
    seatsBooked: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["scheduled", "cancelled", "completed"],
      default: "scheduled",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Real-time availability - kitni seats bachi hain
sessionSchema.virtual("seatsAvailable").get(function () {
  return Math.max(this.capacity - this.seatsBooked, 0);
});

sessionSchema.virtual("isFull").get(function () {
  return this.seatsBooked >= this.capacity;
});

/**
 * Activity - ek class jo instructor create karta hai.
 */
const activitySchema = new mongoose.Schema(
  {
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      // "Other" case: agar suggestedCategory di ho to category optional hai.
      // Admin review par ise real category assign karega (tab tak pending).
      required: [
        function () {
          return !this.suggestedCategory;
        },
        "Category is required",
      ],
      index: true,
    },
    // Instructor ne "Other" chuna - free text. Admin isay official category
    // bana deta hai ya kisi maujooda se map kar deta hai; tab tak pending.
    suggestedCategory: { type: String, trim: true, maxlength: 80 },

    /* ------------------------------ Content ------------------------------ */
    title: {
      type: String,
      required: [true, "Class title is required"],
      trim: true,
      maxlength: [120, "Title cannot exceed 120 characters"],
    },
    slug: { type: String, index: true },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: 3000,
    },
    whatChildrenLearn: [{ type: String, trim: true, maxlength: 200 }],
    faqs: [
      {
        question: { type: String, trim: true, maxlength: 150 },
        answer: { type: String, trim: true, maxlength: 500 },
      },
    ],
    images: [
      {
        url: String,
        publicId: String,
        isCover: { type: Boolean, default: false },
      },
    ],
    videoUrl: String,

    /* --------------------------- Filter fields ---------------------------- */
    ageMin: { type: Number, required: true, min: 0, max: 18 },
    ageMax: { type: Number, required: true, min: 0, max: 18 },
    price: { type: Number, required: true, min: 0 }, // per child
    currency: { type: String, default: "AED" },
    durationMinutes: { type: Number, required: true, min: 15 },
    format: {
      type: String,
      enum: ["online", "in-person"],
      required: true,
      index: true,
    },
    languages: [{ type: String, trim: true }],

    location: {
      area: { type: String, trim: true, index: true },
      city: { type: String, default: "Dubai" },
      address: { type: String, trim: true },
      coordinates: { lat: Number, lng: Number },
      // Online link sirf booking ke baad parent ko bhejna hai,
      // public listing me kabhi expose nahi karna.
      onlineLink: { type: String, select: false },
    },

    /* ----------------------------- Logistics ------------------------------ */
    capacity: { type: Number, required: true, min: 1 }, // default per session
    materialsIncluded: { type: Boolean, default: false },
    materialsNote: String,
    whatToBring: String,
    /**
     * Default text site ke Refund & Cancellation page se match karta hai.
     * Instructor chahe to apni class ke liye alag policy likh sakta hai —
     * page bhi yehi kehta hai ke terms activity ke hisaab se badal sakti hain.
     */
    cancellationPolicy: {
      type: String,
      default:
        "Full refund if cancelled more than 48 hours before the class. " +
        "Between 24 and 48 hours, a partial refund may apply. " +
        "Within 24 hours, bookings are generally non-refundable.",
    },

    sessions: [sessionSchema],

    /* ------------------------------- Status ------------------------------- */
    // draft     -> instructor abhi bana raha hai
    // pending   -> admin ki approval ka intezar
    // active    -> website par live
    // suspended -> admin ne rok diya
    // archived  -> hata di gayi (magar purani bookings ke liye record baaqi)
    status: {
      type: String,
      enum: ["draft", "pending", "active", "suspended", "archived"],
      default: "draft",
      index: true,
    },
    statusNote: String, // admin ki wajah (reject/suspend)

    isFeatured: { type: Boolean, default: false },

    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },
    stats: {
      totalBookings: { type: Number, default: 0 },
      totalStudents: { type: Number, default: 0 },
      viewCount: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

/* ------------------------------- Virtuals -------------------------------- */
/**
 * Activity card par "Next available date" dikhani hai.
 * Sirf woh session jo aane wala ho aur jisme seat bachi ho.
 */
activitySchema.virtual("nextSession").get(function () {
  if (!this.sessions || this.sessions.length === 0) return null;

  const now = new Date();
  const upcoming = this.sessions
    .filter(
      (s) =>
        s.status === "scheduled" && s.date >= now && s.seatsBooked < s.capacity,
    )
    .sort((a, b) => a.date - b.date);

  return upcoming[0] || null;
});

activitySchema.virtual("coverImage").get(function () {
  if (!this.images || this.images.length === 0) return null;
  return this.images.find((img) => img.isCover) || this.images[0];
});

/* --------------------------------- Hooks ---------------------------------- */
function makeSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * NOTE: Mongoose 9 me hook ke andar "next" nahi hota - promise based hai.
 */
activitySchema.pre("save", function () {
  if (this.isModified("title")) {
    // Slug ke aakhir me id ke 6 characters - taake do same naam ki
    // classes ka slug alag alag rahe.
    this.slug = `${makeSlug(this.title)}-${this._id.toString().slice(-6)}`;
  }

  if (this.ageMax < this.ageMin) {
    throw new Error("Maximum age must be greater than or equal to minimum age");
  }

  // Cap the number of FAQs per class, 20 is plenty.
  if (this.faqs && this.faqs.length > 20) {
    throw new Error("A class can have at most 20 FAQs");
  }
});

/* -------------------------------- Indexes --------------------------------- */
activitySchema.index({ status: 1, category: 1 });
activitySchema.index({ status: 1, ageMin: 1, ageMax: 1 });
activitySchema.index({ status: 1, price: 1 });
activitySchema.index({ status: 1, isFeatured: -1, "rating.average": -1 });
activitySchema.index({ "sessions.date": 1 });

module.exports = mongoose.model("Activity", activitySchema);
