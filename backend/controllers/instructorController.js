const mongoose = require("mongoose");

const InstructorProfile = require("../models/InstructorProfile");
const Activity = require("../models/Activity");
const stripe = require("../config/stripe");

/**
 * Instructor jo fields khud edit kar sakta hai.
 * verificationStatus, isFeatured, rating waghera yahan JAAN BOOJH KAR nahi hain -
 * warna instructor khud ko approved ya featured kar leta.
 *
 * "gallery" bhi JAAN BOOJH KAR nikal di gayi hai.
 * Pehle woh yahan thi, jis ka matlab tha ke instructor request body me apni
 * marzi ki gallery array bhej sakta tha — apni marzi ke URLs aur publicId ke
 * sath. Is se 12-image ki limit bekar ho jati thi aur koi bhi bahri site ka
 * image profile par lagaya ja sakta tha.
 * Gallery ab sirf POST /api/uploads/gallery se banti hai.
 */
const EDITABLE_FIELDS = [
  "headline",
  "bio",
  "qualifications",
  "languages",
  "experienceYears",
  "categories",
  "suggestedCategory",
  "location",
  "socialLinks",
  // client ke naye fields:
  "inUAE",
  // "introVideo" JAAN BOOJH KAR yahan nahi hai - ab woh upload se aati hai
  // (POST /uploads/intro-video), is route se seedha set nahi ho sakti.
  "agreedVenuePolicy",
  "agreedFeesPolicy",
];

/**
 * @desc    Apna profile dekhna (instructor ka apna)
 * @route   GET /api/instructors/me
 * @access  Instructor
 */
const getMyProfile = async (req, res, next) => {
  try {
    let profile = await InstructorProfile.findOne({ user: req.user._id })
      .populate("user", "name email avatar")
      .populate("categories", "name slug icon")
      .select("+documents");

    // Pehli baar aaya hai to khali profile bana do
    if (!profile) {
      profile = await InstructorProfile.create({ user: req.user._id });
    }

    res.json({ success: true, profile });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Apna profile update karna
 * @route   PUT /api/instructors/me
 * @access  Instructor
 */
const updateMyProfile = async (req, res, next) => {
  try {
    let profile = await InstructorProfile.findOne({ user: req.user._id });

    if (!profile) {
      profile = new InstructorProfile({ user: req.user._id });
    }

    EDITABLE_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) profile[field] = req.body[field];
    });

    // Jab instructor pehli baar venue policy par razamand ho, waqt note kar lo.
    if (profile.agreedVenuePolicy && !profile.agreedVenuePolicyAt) {
      profile.agreedVenuePolicyAt = new Date();
    }
    // Agar razamandi wapas le li, to timestamp bhi hata do.
    if (!profile.agreedVenuePolicy) {
      profile.agreedVenuePolicyAt = undefined;
    }

    // Service fees & pricing policy — same pattern.
    if (profile.agreedFeesPolicy && !profile.agreedFeesPolicyAt) {
      profile.agreedFeesPolicyAt = new Date();
    }
    if (!profile.agreedFeesPolicy) {
      profile.agreedFeesPolicyAt = undefined;
    }

    // Agar admin ne reject kiya tha aur ab ye edit kar raha hai,
    // to status wapas "incomplete" - dobara submit karna hoga.
    if (profile.verificationStatus === "rejected") {
      profile.verificationStatus = "incomplete";
    }

    await profile.save();

    res.json({ success: true, message: "Profile updated", profile });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Profile approval ke liye submit karna
 * @route   POST /api/instructors/me/submit
 * @access  Instructor
 */
const submitForVerification = async (req, res, next) => {
  try {
    const profile = await InstructorProfile.findOne({
      user: req.user._id,
    }).select("+documents");

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Please complete your profile first",
      });
    }

    if (profile.verificationStatus === "approved") {
      return res.status(400).json({
        success: false,
        message: "Your profile is already approved",
      });
    }

    if (profile.verificationStatus === "pending") {
      return res.status(400).json({
        success: false,
        message: "Your profile is already under review",
      });
    }

    // Zaroori cheezein poori hain?
    const missing = [];

    if (!profile.bio || profile.bio.trim().length < 50) {
      missing.push("bio (at least 50 characters)");
    }
    // Category zaroori hai — ya official list se, ya "Other" suggestion.
    // (Admin verification ke waqt "Other" ko real category bana/map kar dega.)
    const hasCategory =
      (profile.categories && profile.categories.length > 0) ||
      (profile.suggestedCategory && profile.suggestedCategory.trim());
    if (!hasCategory) {
      missing.push("at least one category (or an 'Other' suggestion)");
    }
    if (!profile.languages || profile.languages.length === 0) {
      missing.push("at least one language");
    }

    // BUGFIX: private docs me "url" hota hi nahi (schema me select nahi) -
    // pehle yahan .url check tha jo hamesha undefined tha, is wajah se
    // koi bhi submit hi nahi kar paata tha. Sahi check "publicId" par hai.
    if (!profile.documents?.emiratesId?.publicId) {
      missing.push("Emirates ID");
    }
    if (
      !profile.documents?.certificates ||
      profile.documents.certificates.length === 0
    ) {
      missing.push("at least one certificate");
    }

    // UAE-based instructor -> trade licence compulsory
    if (profile.inUAE && !profile.documents?.tradeLicence?.publicId) {
      missing.push("trade licence (required for UAE-based instructors)");
    }

    // Koi social handle nahi -> intro video zaroori
    if (!profile.hasSocial && !profile.introVideo?.url) {
      missing.push("an intro video (or add a social media handle)");
    }

    // Venue / safety policy par razamandi zaroori
    if (!profile.agreedVenuePolicy) {
      missing.push("agreement to the venue & safety policy");
    }

    // Service fees & pricing policy par razamandi zaroori
    if (!profile.agreedFeesPolicy) {
      missing.push("agreement to the service fees & pricing policy");
    }

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Please complete the following before submitting",
        missing,
      });
    }

    profile.verificationStatus = "pending";
    profile.submittedAt = new Date();
    profile.rejectionReason = undefined;

    await profile.save();

    // TODO (email step): admin ko nayi application ka email jaye

    res.json({
      success: true,
      message: "Profile submitted for verification. We will review it shortly.",
      profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Sab approved instructors - public listing
 * @route   GET /api/instructors
 * @access  Public
 */
const getInstructors = async (req, res, next) => {
  try {
    const filter = { verificationStatus: "approved", isSuspended: false };

    // Ghalat id par pehle CastError se 500 aata tha — ab bas nazarandaz
    if (req.query.category) {
      const catId = String(req.query.category);
      if (mongoose.Types.ObjectId.isValid(catId)) {
        filter.categories = new mongoose.Types.ObjectId(catId);
      }
    }
    if (req.query.area) {
      filter["location.area"] = new RegExp(
        `^${String(req.query.area).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i",
      );
    }
    if (req.query.featured === "true") {
      filter.isFeatured = true;
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 50);

    const [profiles, total] = await Promise.all([
      InstructorProfile.find(filter)
        .populate("user", "name avatar city")
        .populate("categories", "name slug icon")
        .sort({ isFeatured: -1, "rating.average": -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      InstructorProfile.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: profiles.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      instructors: profiles,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Ek instructor ka public profile + uski classes
 * @route   GET /api/instructors/:userId
 * @access  Public
 *
 * NOTE: yahan documents kabhi wapas nahi jate (model me select: false hai).
 */
const getInstructorById = async (req, res, next) => {
  try {
    // Ghalat id par 500 nahi, saaf 404
    if (!mongoose.Types.ObjectId.isValid(String(req.params.userId))) {
      return res
        .status(404)
        .json({ success: false, message: "Instructor not found" });
    }

    const profile = await InstructorProfile.findOne({ user: req.params.userId })
      .populate("user", "name avatar city")
      .populate("categories", "name slug icon");

    if (
      !profile ||
      profile.verificationStatus !== "approved" ||
      profile.isSuspended
    ) {
      return res
        .status(404)
        .json({ success: false, message: "Instructor not found" });
    }

    const activities = await Activity.find({
      instructor: req.params.userId,
      status: "active",
    })
      .populate("category", "name slug icon")
      .sort({ "rating.average": -1 });

    res.json({ success: true, instructor: profile, activities });
  } catch (error) {
    next(error);
  }
};

/* ------------------------------ Stripe Connect ----------------------------
 *
 * Instructor ko paisa Stripe Connect ke through milta hai - is ke liye
 * unka apna "connected account" chahiye (Express type - onboarding sabse
 * aasan, aur unko apna basic Stripe dashboard bhi mil jata hai).
 *
 * Flow: instructor "Set up payouts" dabata hai -> yahan se account ban
 * (agar pehle se nahi hai) -> Stripe ka hosted onboarding link milta hai
 * -> instructor apni ID/bank details khud Stripe ko deta hai (Kidventures
 * ke server tak wo details kabhi nahi aatin) -> wapas aane par status
 * check hota hai.
 * ------------------------------------------------------------------------ */

/**
 * @desc    Connect account banao (agar nahi hai) aur onboarding link do
 * @route   POST /api/instructors/me/connect/onboarding-link
 * @access  Instructor
 */
const startConnectOnboarding = async (req, res, next) => {
  try {
    let profile = await InstructorProfile.findOne({ user: req.user._id });
    if (!profile) {
      profile = await InstructorProfile.create({ user: req.user._id });
    }

    // Pehli dafa - Stripe par Express account banao
    if (!profile.stripeConnect?.accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "AE",
        email: req.user.email,
        // "card_payments" jaan-boojh kar NAHI maangi - instructor ka
        // account khud card charge nahi karta (wo destination charge se
        // Kidventures ke platform account par hota hai). Instructor ke
        // account ko bas paisa RECEIVE karna hai, is liye sirf
        // "transfers" capability chahiye. UAE me Express accounts
        // "card_payments" support hi nahi karte, isi liye error aa raha
        // tha.
        capabilities: {
          transfers: { requested: true },
        },
        // NOTE: "business_type" jaan-boojh kar yahan set NAHI kar rahe.
        // UAE mein "individual" supported nahi hai (Stripe error deta hai),
        // aur har instructor ka type alag ho sakta hai (freelancer, trade
        // licence wala, waghera). Isay khali chhorne se Stripe khud
        // onboarding form mein instructor se poochta hai - jo bhi us ke
        // mulk/case ke liye sahi option ho.
        // Weekly payout - na daily jitni baar-baar fee lage, na monthly
        // jitna lamba wait. Instructor apni bank details onboarding me
        // dega, us ke baad ye schedule khud chalta rahega.
        settings: {
          payouts: {
            schedule: { interval: "weekly", weekly_anchor: "monday" },
          },
        },
        metadata: { instructorUserId: req.user._id.toString() },
      });

      profile.stripeConnect = {
        ...(profile.stripeConnect?.toObject?.() || profile.stripeConnect || {}),
        accountId: account.id,
        onboardingStartedAt: new Date(),
      };
      await profile.save();
    }

    // Onboarding link har baar naya banate hain - purana kuch der me
    // expire ho jata hai (Stripe ka apna rule), aur re-onboarding
    // (missing info poori karna) ke liye bhi yehi link chalta hai.
    const base = process.env.CLIENT_URL || "http://localhost:5173";
    const accountLink = await stripe.accountLinks.create({
      account: profile.stripeConnect.accountId,
      refresh_url: `${base}/instructor/dashboard?connect=refresh`,
      return_url: `${base}/instructor/dashboard?connect=return`,
      type: "account_onboarding",
    });

    res.json({ success: true, url: accountLink.url });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Connect account ka status - Stripe se taaza karke batata hai
 * @route   GET /api/instructors/me/connect/status
 * @access  Instructor
 *
 * chargesEnabled/payoutsEnabled ka asal source Stripe hai - webhook
 * (account.updated) se ye khud sync hota rehta hai, lekin instructor
 * jab dashboard khole to yahan se bhi taaza confirm ho jata hai.
 */
const getConnectStatus = async (req, res, next) => {
  try {
    const profile = await InstructorProfile.findOne({ user: req.user._id });

    if (!profile?.stripeConnect?.accountId) {
      return res.json({ success: true, connected: false });
    }

    const account = await stripe.accounts.retrieve(
      profile.stripeConnect.accountId,
    );

    profile.stripeConnect.chargesEnabled = account.charges_enabled;
    profile.stripeConnect.payoutsEnabled = account.payouts_enabled;
    profile.stripeConnect.detailsSubmitted = account.details_submitted;
    profile.stripeConnect.lastSyncedAt = new Date();
    await profile.save();

    res.json({
      success: true,
      connected: true,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  submitForVerification,
  getInstructors,
  getInstructorById,
  startConnectOnboarding,
  getConnectStatus,
};
