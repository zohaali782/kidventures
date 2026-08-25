const mongoose = require("mongoose");

/**
 * Private document ka record.
 *
 * Yahan "url" JAAN BOOJH KAR nahi hai - private files ka koi seedha
 * URL hota hi nahi. Sirf publicId + format + resourceType rakhte hain,
 * jinse admin ke liye waqti signed link banaya jata hai.
 */
const privateDocSchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true },
    format: String, // "pdf", "jpg"...
    resourceType: String, // "image" ya "raw"
    originalName: String,
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

/**
 * InstructorProfile - instructor ka public profile + verification data.
 */
const instructorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    /* --------------------------- Public profile --------------------------- */
    headline: { type: String, trim: true, maxlength: 120 },
    bio: { type: String, trim: true, maxlength: 2000 },
    qualifications: [
      {
        title: { type: String, trim: true },
        institution: { type: String, trim: true },
        year: Number,
      },
    ],
    languages: [{ type: String, trim: true }],
    experienceYears: { type: Number, min: 0, max: 60, default: 0 },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    /**
     * "Other" — jab instructor ki skill built-in list mein na ho.
     * Free text yahan aata hai; admin verification ke waqt ise official
     * category bana deta hai ya kisi maujooda se map kar deta hai.
     */
    suggestedCategory: { type: String, trim: true, maxlength: 80 },
    gallery: [
      {
        url: String,
        publicId: String,
        caption: { type: String, maxlength: 120 },
      },
    ],
    location: {
      area: { type: String, trim: true },
      city: { type: String, default: "Dubai" },
      address: { type: String, trim: true },
      coordinates: { lat: Number, lng: Number },
    },
    socialLinks: {
      instagram: String,
      tiktok: String,
      youtube: String,
      facebook: String,
      website: String,
    },

    /* ----------------- Client ke naye verification requirements ----------- *
     * - inUAE            : agar UAE-based hai to trade licence compulsory
     * - introVideoUrl    : agar koi social handle nahi to intro video LINK
     *                      (YouTube/Vimeo) - upload nahi, sirf link.
     * - agreedVenuePolicy: residential/venue safety policy par razamandi
     * -------------------------------------------------------------------- */
    inUAE: { type: Boolean, default: false },
    introVideoUrl: { type: String, trim: true },
    agreedVenuePolicy: { type: Boolean, default: false },
    agreedVenuePolicyAt: Date,

    // Client ki 15% service fee & pricing policy par razamandi
    // (agreedVenuePolicy jaisa hi pattern hai).
    agreedFeesPolicy: { type: Boolean, default: false },
    agreedFeesPolicyAt: Date,

    /* ------------------------- Verification documents --------------------- */
    /**
     * SECURITY: "select: false" - ye field normal query me wapas
     * aati hi nahi. Sirf wahan aati hai jahan hum jaan boojh kar
     * .select("+documents") likhte hain (admin verification route).
     */
    documents: {
      type: {
        certificates: [privateDocSchema],
        emiratesId: privateDocSchema,
        tradeLicence: privateDocSchema,
      },
      select: false,
      default: {},
    },

    /**
     * incomplete -> profile abhi adhoori hai
     * pending    -> submit ho chuki, admin ka intezar
     * approved   -> manzoor, ab classes bana sakta hai
     * rejected   -> wapas ki gayi (wajah rejectionReason me)
     */
    verificationStatus: {
      type: String,
      enum: ["incomplete", "pending", "approved", "rejected"],
      default: "incomplete",
      index: true,
    },
    submittedAt: Date,
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectionReason: String,

    /* ----------------------------- Marketplace ---------------------------- */
    isFeatured: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },
    suspensionReason: String,

    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },
    stats: {
      totalStudents: { type: Number, default: 0 },
      totalClasses: { type: Number, default: 0 },
      totalBookings: { type: Number, default: 0 },
    },

    /* ------------------------------- Payouts ------------------------------ */
    payout: {
      type: {
        accountHolderName: String,
        bankName: String,
        // NOTE: poora IBAN plain text me store nahi karte.
        // Sirf aakhri 4 digits - display ke liye kaafi hain.
        ibanLast4: String,
        pendingBalance: { type: Number, default: 0 },
        totalPaidOut: { type: Number, default: 0 },
      },
      select: false,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

/**
 * Instructor website par tabhi nazar aata hai jab approved ho
 * aur suspended na ho.
 */
instructorProfileSchema.virtual("isPubliclyVisible").get(function () {
  return this.verificationStatus === "approved" && !this.isSuspended;
});

/**
 * Koi bhi social handle hai ya nahi - submit-check aur frontend
 * dono isi ko "has social" maante hain (intro-video ki shart isi par).
 */
instructorProfileSchema.virtual("hasSocial").get(function () {
  const s = this.socialLinks || {};
  return Boolean(
    s.instagram || s.tiktok || s.youtube || s.facebook || s.website,
  );
});

instructorProfileSchema.index({ verificationStatus: 1, isSuspended: 1 });
instructorProfileSchema.index({ isFeatured: -1, "rating.average": -1 });

module.exports = mongoose.model("InstructorProfile", instructorProfileSchema);
