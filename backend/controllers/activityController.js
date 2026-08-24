const Activity = require("../models/Activity");
const Category = require("../models/Category");
const { cleanVideoUrl } = require("../utils/safeUrl");

/**
 * SECURITY helper: user ka likha hua text seedha regex me daalna khatarnaak hai
 * (koi ".*.*.*" jaisi cheez bhej kar server hang kar sakta hai).
 * Is liye pehle special characters ko "escape" kar dete hain.
 */
const escapeRegex = (text) =>
  String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Search query ki hadd — bina limit ke har request poori collection scan karti hai */
const MAX_SEARCH_LENGTH = 80;

/** Query param ko number banata hai — NaN/Infinity par null deta hai */
const cleanNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/**
 * @desc    Sab classes - search, filters, pagination ke saath
 * @route   GET /api/activities
 * @access  Public
 */
const getActivities = async (req, res, next) => {
  try {
    const {
      category,
      age,
      minPrice,
      maxPrice,
      format,
      area,
      city,
      date,
      q,
      sort,
    } = req.query;

    const filter = { status: "active" };

    if (category) {
      const categoryDoc = await Category.findOne({ slug: String(category) });
      if (!categoryDoc) {
        return res.json({
          success: true,
          count: 0,
          total: 0,
          page: 1,
          pages: 0,
          activities: [],
        });
      }
      filter.category = categoryDoc._id;
    }

    const childAge = cleanNumber(age);
    if (childAge !== null) {
      filter.ageMin = { $lte: childAge };
      filter.ageMax = { $gte: childAge };
    }

    /**
     * Pehle yahan Number(minPrice) seedha filter me chala jata tha.
     * "?minPrice=abc" par woh NaN banta, Mongoose CastError phenkta,
     * aur user ko 500 error milta. Ab ghalat value bas nazarandaz ho jati hai.
     */
    const min = cleanNumber(minPrice);
    const max = cleanNumber(maxPrice);

    if (min !== null || max !== null) {
      filter.price = {};
      if (min !== null) filter.price.$gte = min;
      if (max !== null) filter.price.$lte = max;
    }

    if (format === "online" || format === "in-person") {
      filter.format = format;
    }

    // NAV QUICK-FILTER: Dubai / Sharjah (poori city, koi khaas area nahi)
    if (city) {
      filter["location.city"] = new RegExp(`^${escapeRegex(city)}$`, "i");
    }

    // SIDEBAR FILTER: ek khaas area (Jumeirah, Al Nahda, waghera)
    if (area) {
      filter["location.area"] = new RegExp(`^${escapeRegex(area)}$`, "i");
    }

    if (date) {
      const fromDate = new Date(String(date));
      if (!Number.isNaN(fromDate.getTime())) {
        fromDate.setHours(0, 0, 0, 0);
        filter["sessions.date"] = { $gte: fromDate };
      }
    }

    if (q) {
      // Length cap: title/description par koi text index nahi hai, is liye
      // har search poori collection scan karti hai. Bina hadd ke koi bara
      // string bhej kar server ko bewajah bojh de sakta hai.
      const trimmed = String(q).trim().slice(0, MAX_SEARCH_LENGTH);

      if (trimmed) {
        const safe = escapeRegex(trimmed);
        filter.$or = [
          { title: new RegExp(safe, "i") },
          { description: new RegExp(safe, "i") },
        ];
      }
    }

    const sortOptions = {
      price_low: { price: 1 },
      price_high: { price: -1 },
      rating: { "rating.average": -1, "rating.count": -1 },
      newest: { createdAt: -1 },
      popular: { "stats.totalBookings": -1 },
    };
    const sortBy = sortOptions[sort] || {
      isFeatured: -1,
      "rating.average": -1,
      createdAt: -1,
    };

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 50);
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      Activity.find(filter)
        .populate("category", "name slug icon")
        .populate("instructor", "name avatar")
        .sort(sortBy)
        .skip(skip)
        .limit(limit),
      Activity.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: activities.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      activities,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Homepage ke liye featured classes
 * @route   GET /api/activities/featured
 * @access  Public
 */
const getFeaturedActivities = async (req, res, next) => {
  try {
    const activities = await Activity.find({
      status: "active",
      isFeatured: true,
    })
      .populate("category", "name slug icon")
      .populate("instructor", "name avatar")
      .sort({ "rating.average": -1 })
      .limit(8);

    res.json({ success: true, count: activities.length, activities });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Instructor ki apni classes (har status ki)
 * @route   GET /api/activities/my-classes
 * @access  Instructor
 */
const getMyActivities = async (req, res, next) => {
  try {
    const filter = { instructor: req.user._id };

    if (req.query.status) {
      filter.status = String(req.query.status);
    }

    const activities = await Activity.find(filter)
      .populate("category", "name slug icon")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: activities.length, activities });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Ek class ki poori detail
 * @route   GET /api/activities/:id
 * @access  Public
 */
const getActivityById = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.id)
      .populate("category", "name slug icon")
      .populate("instructor", "name avatar city");

    if (!activity) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    const isOwner =
      req.user &&
      activity.instructor._id.toString() === req.user._id.toString();
    const isAdmin = req.user && req.user.role === "admin";

    if (activity.status !== "active" && !isOwner && !isAdmin) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    Activity.updateOne(
      { _id: activity._id },
      { $inc: { "stats.viewCount": 1 } },
      // viewCount ahem nahi, lekin baar baar fail ho to pata chalna chahiye
    ).catch((err) =>
      console.error(`! viewCount update failed: ${err.message}`),
    );

    res.json({ success: true, activity });
  } catch (error) {
    next(error);
  }
};

/**
 * Instructor ye fields bhej sakta hai. Baqi sab ignore.
 *
 * SECURITY: "images" jaan boojh kar YAHAN NAHI hai.
 *
 * Pehle woh is list me tha, jis ka matlab tha ke instructor request body me
 * apni marzi ki images array bhej sakta tha — apni marzi ke publicId ke sath.
 * Aur deleteActivityImage usi publicId ko Cloudinary se hata deta tha.
 *
 * Yaani: instructor A kisi doosre ki class ka image URL dekhta (publicId URL
 * me hi likha hota hai), use apni class me daal deta, phir delete kar deta —
 * aur doosre instructor ka image hamesha ke liye khatam. Us ko khabar bhi na
 * hoti.
 *
 * Ab images sirf upload/delete endpoints se manage hoti hain, jahan ownership
 * check maujood hai.
 */
const EDITABLE_FIELDS = [
  "title",
  "description",
  "whatChildrenLearn",
  "faqs",
  "videoUrl",
  "category",
  "suggestedCategory",
  "ageMin",
  "ageMax",
  "price",
  "durationMinutes",
  "format",
  "languages",
  "location",
  "capacity",
  "materialsIncluded",
  "materialsNote",
  "whatToBring",
  "cancellationPolicy",
];

/**
 * Clean the FAQ list, drop entries with an empty question or answer,
 * and trim both. The frontend already filters these, but the API can
 * be called directly too, so this needs to happen here as well.
 */
function sanitizeFaqs(input) {
  if (!Array.isArray(input)) return undefined;
  return input
    .map((f) => ({
      question: String(f?.question ?? "").trim(),
      answer: String(f?.answer ?? "").trim(),
    }))
    .filter((f) => f.question && f.answer)
    .slice(0, 20);
}

/**
 * @desc    Nayi class banana
 * @route   POST /api/activities
 * @access  Instructor
 */
const createActivity = async (req, res, next) => {
  try {
    const data = {};
    EDITABLE_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) data[field] = req.body[field];
    });

    // videoUrl sirf https YouTube/Vimeo — warna "javascript:" ya koi bhi
    // bahri link embed ho sakta hai
    if (data.videoUrl !== undefined) {
      const safeVideo = cleanVideoUrl(data.videoUrl);
      if (safeVideo === null) {
        return res.status(400).json({
          success: false,
          message: "Video link must be a YouTube or Vimeo https URL",
        });
      }
      data.videoUrl = safeVideo;
    }

    if (data.faqs !== undefined) {
      data.faqs = sanitizeFaqs(data.faqs);
    }

    // "Other" case: koi official category nahi, sirf free-text suggestion.
    const isOther =
      !data.category &&
      data.suggestedCategory &&
      String(data.suggestedCategory).trim();

    if (isOther) {
      // Category assign admin review par hoga; tab tak hamesha pending.
      data.category = undefined;
      data.status = "pending";
    } else {
      // Category waqai maujood hai?
      const categoryExists = await Category.findById(data.category);
      if (!categoryExists) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid category" });
      }
      // Instructor draft save kare ya approval ke liye bheje
      data.status = req.body.status === "pending" ? "pending" : "draft";
    }

    data.instructor = req.user._id; // hamesha logged-in instructor - body se NAHI

    if (Array.isArray(req.body.sessions)) {
      data.sessions = req.body.sessions.map((s) => ({
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        capacity: s.capacity || data.capacity,
        seatsBooked: 0, // hamesha 0 - body se kabhi nahi
      }));
    }

    const activity = await Activity.create(data);

    // Category count sirf tab barhao jab koi official category ho ("Other" me nahi)
    if (data.category) {
      await Category.updateOne(
        { _id: data.category },
        { $inc: { activityCount: 1 } },
      );
    }

    res.status(201).json({
      success: true,
      message: isOther
        ? "Class submitted for review (new category will be checked by our team)"
        : data.status === "pending"
          ? "Class submitted for approval"
          : "Class saved as draft",
      activity,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Class edit karna
 * @route   PUT /api/activities/:id
 * @access  Instructor (sirf apni class) ya Admin
 */
const updateActivity = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    const isOwner = activity.instructor.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own classes",
      });
    }

    // "Other" class ki category undefined ho sakti hai - guard.
    const oldCategory = activity.category ? activity.category.toString() : null;

    /**
     * MODERATION BYPASS SE BACHAO.
     *
     * Pehle masla yeh tha: instructor ek seedhi saadhi class submit karta,
     * admin use approve kar deta (status "active"), aur us ke BAAD woh title,
     * description, price, location — sab badal deta. Status "active" hi rehta,
     * yaani badla hua content live chala jata aur kisi admin ki nazar us par
     * na parti.
     *
     * Bachon ki activities wali site par yeh sab se ahem gap hai — approval
     * ka matlab hi khatam ho jata hai agar approval ke baad content badla ja
     * sake.
     *
     * Ab: agar non-admin kisi LIVE class ka maadi content badle, to class
     * wapas "pending" ho jati hai aur dobara review me jati hai.
     * Chhoti cheezein (materialsNote, whatToBring waghera) is me shaamil
     * nahi — un par dobara review ki zaroorat nahi.
     */
    // videoUrl ki jaanch update par bhi — create jaisi hi
    if (req.body.videoUrl !== undefined) {
      const safeVideo = cleanVideoUrl(req.body.videoUrl);
      if (safeVideo === null) {
        return res.status(400).json({
          success: false,
          message: "Video link must be a YouTube or Vimeo https URL",
        });
      }
      req.body.videoUrl = safeVideo;
    }

    if (req.body.faqs !== undefined) {
      req.body.faqs = sanitizeFaqs(req.body.faqs);
    }

    const REVIEW_TRIGGERING_FIELDS = [
      "title",
      "description",
      "whatChildrenLearn",
      "faqs",
      "videoUrl",
      "category",
      "suggestedCategory",
      "ageMin",
      "ageMax",
      "price",
      "format",
      "location",
      "capacity",
    ];

    const changedFields = [];

    EDITABLE_FIELDS.forEach((field) => {
      if (req.body[field] === undefined) return;

      const before = JSON.stringify(activity[field] ?? null);
      const after = JSON.stringify(req.body[field] ?? null);

      if (before !== after) changedFields.push(field);

      activity[field] = req.body[field];
    });

    const materiallyChanged = changedFields.some((f) =>
      REVIEW_TRIGGERING_FIELDS.includes(f),
    );

    const sentBackForReview =
      !isAdmin && activity.status === "active" && materiallyChanged;

    if (sentBackForReview) {
      activity.status = "pending";
      activity.statusNote =
        "Sent back for review after the class details were edited";
    }

    if (req.body.status) {
      const requested = String(req.body.status);
      if (isAdmin) {
        activity.status = requested;
        if (req.body.statusNote) activity.statusNote = req.body.statusNote;
      } else if (["draft", "pending"].includes(requested)) {
        // Instructor khud ko "active" nahi kar sakta — aur agar class abhi
        // review me bheji gayi hai to woh use "draft" me chhupa bhi nahi sakta
        if (!sentBackForReview || requested === "pending") {
          activity.status = requested;
        }
      }
    }

    if (isAdmin && req.body.isFeatured !== undefined) {
      activity.isFeatured = !!req.body.isFeatured;
    }

    await activity.save();

    // Category badli to counts theek karo (Other -> assigned bhi handle hota hai)
    const newCategory = activity.category ? activity.category.toString() : null;
    if (newCategory !== oldCategory) {
      if (oldCategory) {
        await Category.updateOne(
          { _id: oldCategory },
          { $inc: { activityCount: -1 } },
        );
      }
      if (newCategory) {
        await Category.updateOne(
          { _id: newCategory },
          { $inc: { activityCount: 1 } },
        );
      }
    }

    res.json({
      success: true,
      message: sentBackForReview
        ? "Class updated. Because the details changed, it's gone back for review and is no longer visible to parents until approved."
        : "Class updated",
      sentBackForReview,
      activity,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Class hatana
 * @route   DELETE /api/activities/:id
 * @access  Instructor (apni class) ya Admin
 */
const deleteActivity = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    const isOwner = activity.instructor.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own classes",
      });
    }

    if (activity.stats.totalBookings > 0) {
      activity.status = "archived";
      await activity.save();

      return res.json({
        success: true,
        message: "Class has bookings, so it was archived instead of deleted",
      });
    }

    await activity.deleteOne();
    if (activity.category) {
      await Category.updateOne(
        { _id: activity.category },
        { $inc: { activityCount: -1 } },
      );
    }

    res.json({ success: true, message: "Class deleted" });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Class me naya session (date/time) add karna
 * @route   POST /api/activities/:id/sessions
 * @access  Instructor (apni class)
 */
const addSession = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    const isOwner = activity.instructor.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Not your class" });
    }

    const { date, startTime, endTime, capacity } = req.body;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "Date, start time and end time are required",
      });
    }

    const sessionDate = new Date(date);
    if (Number.isNaN(sessionDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid date" });
    }

    if (sessionDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Session date cannot be in the past",
      });
    }

    activity.sessions.push({
      date: sessionDate,
      startTime,
      endTime,
      capacity: Number(capacity) || activity.capacity,
      seatsBooked: 0,
    });

    await activity.save();

    res.status(201).json({ success: true, message: "Session added", activity });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Session cancel karna
 * @route   DELETE /api/activities/:id/sessions/:sessionId
 * @access  Instructor (apni class)
 */
const deleteSession = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    const isOwner = activity.instructor.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Not your class" });
    }

    const session = activity.sessions.id(req.params.sessionId);
    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    if (session.seatsBooked > 0) {
      session.status = "cancelled";
      await activity.save();

      return res.json({
        success: true,
        message: "Session has bookings, so it was cancelled instead of removed",
        activity,
      });
    }

    session.deleteOne();
    await activity.save();

    res.json({ success: true, message: "Session removed", activity });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActivities,
  getFeaturedActivities,
  getMyActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  addSession,
  deleteSession,
};
