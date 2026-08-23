const mongoose = require("mongoose");

const InstructorProfile = require("../models/InstructorProfile");
const Activity = require("../models/Activity");
const { cleanVideoUrl } = require("../utils/safeUrl");

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
  "introVideoUrl",
  "agreedVenuePolicy",
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

    // Intro video sirf https YouTube/Vimeo — warna "javascript:" ya koi bhi
    // bahri link profile par embed ho sakta hai
    if (req.body.introVideoUrl !== undefined) {
      const safeVideo = cleanVideoUrl(req.body.introVideoUrl);
      if (safeVideo === null) {
        return res.status(400).json({
          success: false,
          message: "Intro video must be a YouTube or Vimeo https link",
        });
      }
      req.body.introVideoUrl = safeVideo;
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

    // Koi social handle nahi -> intro video link zaroori
    if (!profile.hasSocial && !profile.introVideoUrl) {
      missing.push("an intro video link (or add a social media handle)");
    }

    // Venue / safety policy par razamandi zaroori
    if (!profile.agreedVenuePolicy) {
      missing.push("agreement to the venue & safety policy");
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

module.exports = {
  getMyProfile,
  updateMyProfile,
  submitForVerification,
  getInstructors,
  getInstructorById,
};
