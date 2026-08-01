const InstructorProfile = require("../models/InstructorProfile");
const Activity = require("../models/Activity");
const Category = require("../models/Category");
const Booking = require("../models/Booking");
const ClassRequest = require("../models/ClassRequest");
const User = require("../models/User");

/**
 * Ye saara file sirf admin ke liye hai.
 * Routes par pehle hi protect + authorize('admin') laga hai.
 */

/**
 * @desc    Verification ka intezar karne wali applications
 * @route   GET /api/admin/instructors?status=pending
 * @access  Admin
 */
const getInstructorApplications = async (req, res, next) => {
  try {
    const filter = {};

    const validStatuses = ["incomplete", "pending", "approved", "rejected"];
    if (req.query.status && validStatuses.includes(String(req.query.status))) {
      filter.verificationStatus = String(req.query.status);
    }

    const profiles = await InstructorProfile.find(filter)
      .populate("user", "name email phone avatar createdAt")
      .populate("categories", "name slug")
      .sort({ submittedAt: -1, createdAt: -1 });

    res.json({ success: true, count: profiles.length, instructors: profiles });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Ek application ki poori detail - DOCUMENTS ke saath
 * @route   GET /api/admin/instructors/:id
 * @access  Admin
 *
 * Ye website ki wahid jagah hai jahan documents nikalte hain.
 * Is liye yahan .select('+documents') likha hai.
 */
const getApplicationDetail = async (req, res, next) => {
  try {
    const profile = await InstructorProfile.findById(req.params.id)
      .populate("user", "name email phone avatar createdAt")
      .populate("categories", "name slug")
      .select("+documents");

    if (!profile) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }

    res.json({ success: true, instructor: profile });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Instructor approve karna
 * @route   PUT /api/admin/instructors/:id/approve
 * @access  Admin
 */
const approveInstructor = async (req, res, next) => {
  try {
    const profile = await InstructorProfile.findById(req.params.id);

    if (!profile) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }

    if (profile.verificationStatus === "approved") {
      return res
        .status(400)
        .json({ success: false, message: "Already approved" });
    }

    profile.verificationStatus = "approved";
    profile.reviewedAt = new Date();
    profile.reviewedBy = req.user._id;
    profile.rejectionReason = undefined;

    await profile.save();

    // TODO (email step): instructor ko "approved" ka email jaye

    res.json({ success: true, message: "Instructor approved", profile });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Instructor reject karna (wajah ke saath)
 * @route   PUT /api/admin/instructors/:id/reject
 * @access  Admin
 */
const rejectInstructor = async (req, res, next) => {
  try {
    const { reason } = req.body;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Please give a clear reason (at least 10 characters)",
      });
    }

    const profile = await InstructorProfile.findById(req.params.id);

    if (!profile) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }

    profile.verificationStatus = "rejected";
    profile.rejectionReason = reason.trim();
    profile.reviewedAt = new Date();
    profile.reviewedBy = req.user._id;

    await profile.save();

    // TODO (email step): instructor ko wajah ke saath email jaye

    res.json({ success: true, message: "Instructor rejected", profile });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Instructor suspend / wapas bahaal karna
 * @route   PUT /api/admin/instructors/:id/suspend
 * @access  Admin
 *
 * Suspend hone par uski saari live classes bhi suspend ho jati hain -
 * warna instructor hidden hota magar classes bookable rehtin.
 */
const toggleSuspendInstructor = async (req, res, next) => {
  try {
    const profile = await InstructorProfile.findById(req.params.id);

    if (!profile) {
      return res
        .status(404)
        .json({ success: false, message: "Instructor not found" });
    }

    const suspend = !profile.isSuspended;

    if (suspend && (!req.body.reason || req.body.reason.trim().length < 10)) {
      return res.status(400).json({
        success: false,
        message: "Please give a reason for suspension (at least 10 characters)",
      });
    }

    profile.isSuspended = suspend;
    profile.suspensionReason = suspend ? req.body.reason.trim() : undefined;
    await profile.save();

    if (suspend) {
      await Activity.updateMany(
        { instructor: profile.user, status: "active" },
        { status: "suspended", statusNote: "Instructor suspended" },
      );
    }

    res.json({
      success: true,
      message: suspend ? "Instructor suspended" : "Instructor reinstated",
      profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Homepage par instructor feature karna
 * @route   PUT /api/admin/instructors/:id/feature
 * @access  Admin
 */
const toggleFeatureInstructor = async (req, res, next) => {
  try {
    const profile = await InstructorProfile.findById(req.params.id);

    if (!profile) {
      return res
        .status(404)
        .json({ success: false, message: "Instructor not found" });
    }

    if (profile.verificationStatus !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Only approved instructors can be featured",
      });
    }

    profile.isFeatured = !profile.isFeatured;
    await profile.save();

    res.json({
      success: true,
      message: profile.isFeatured
        ? "Instructor featured"
        : "Removed from featured",
      profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Class approve karna (live kar dena)
 * @route   PUT /api/admin/activities/:id/approve
 * @access  Admin
 */
const approveActivity = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    // Instructor approved hai? Warna class live nahi ho sakti.
    const profile = await InstructorProfile.findOne({
      user: activity.instructor,
    });

    if (!profile || profile.verificationStatus !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Instructor is not approved yet",
      });
    }

    activity.status = "active";
    activity.statusNote = undefined;
    await activity.save();

    res.json({ success: true, message: "Class is now live", activity });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Class ko suspend / wapas Live karna
 * @route   PUT /api/admin/activities/:id/suspend
 * @access  Admin
 *
 * NAYA — mock UI ke "Suspend/Unsuspend" button ke liye. Approve
 * (upar) sirf ek dafa "Live" karta hai; ye kabhi bhi Live class ko
 * chhupane/wapas dikhane ke liye hai.
 */
const toggleSuspendActivity = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    const suspending = activity.status !== "suspended";
    activity.status = suspending ? "suspended" : "active";
    activity.statusNote = suspending
      ? req.body.reason?.trim() || "Suspended by admin"
      : undefined;

    await activity.save();

    res.json({
      success: true,
      message: suspending ? "Class suspended" : "Class is live again",
      activity,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Class hamesha ke liye hata dena
 * @route   DELETE /api/admin/activities/:id
 * @access  Admin
 *
 * NAYA — agar booking record maujood hain to hard-delete na karo,
 * archive kar do (jaisa instructor-side delete karta hai).
 */
const removeActivity = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    const hasBookings = await Booking.exists({ activity: activity._id });

    if (hasBookings) {
      activity.status = "archived";
      await activity.save();
      return res.json({
        success: true,
        message: "Class has bookings, so it was archived instead of deleted",
        activity,
      });
    }

    await activity.deleteOne();

    res.json({ success: true, message: "Class removed" });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    "Other" category suggestion ko real category se resolve karna
 * @route   PUT /api/admin/activities/:id/resolve-category
 * @access  Admin
 * Body: { categoryId }
 *
 * NAYA — instructor ne class banate waqt "Other" chuna tha aur free-text
 * category type ki thi (suggestedCategory). Admin yahan usay ek real,
 * official Category se map kar deta hai.
 */
const resolveCategorySuggestion = async (req, res, next) => {
  try {
    const { categoryId } = req.body;

    if (!categoryId) {
      return res
        .status(400)
        .json({ success: false, message: "categoryId is required" });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    activity.category = category._id;
    activity.suggestedCategory = undefined;
    await activity.save();

    res.json({
      success: true,
      message: `Category assigned: ${category.name}`,
      activity,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    User block / unblock karna
 * @route   PUT /api/admin/users/:id/block
 * @access  Admin
 */
const toggleBlockUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Admin khud ko ya kisi doosre admin ko block nahi kar sakta
    if (user.role === "admin") {
      return res.status(400).json({
        success: false,
        message: "Admin accounts cannot be blocked",
      });
    }

    user.isBlocked = !user.isBlocked;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: user.isBlocked ? "User blocked" : "User unblocked",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isBlocked: user.isBlocked,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* ------------------------------------------------------------------ */
/*                     NAYE — Admin Dashboard ke liye                  */
/* ------------------------------------------------------------------ */

/**
 * @desc    Overview tab ke 4 numbers
 * @route   GET /api/admin/stats
 * @access  Admin
 */
const getAdminStats = async (req, res, next) => {
  try {
    const monthStart = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );

    const [pendingVerifications, activeInstructors, totalBookings, revenueAgg] =
      await Promise.all([
        InstructorProfile.countDocuments({ verificationStatus: "pending" }),
        InstructorProfile.countDocuments({
          verificationStatus: "approved",
          isSuspended: { $ne: true },
        }),
        Booking.countDocuments({ status: { $in: ["confirmed", "completed"] } }),
        Booking.aggregate([
          {
            $match: {
              status: { $in: ["confirmed", "completed"] },
              createdAt: { $gte: monthStart },
            },
          },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),
      ]);

    res.json({
      success: true,
      stats: {
        pendingVerifications,
        activeInstructors,
        totalBookings,
        monthRevenue: revenueAgg[0]?.total || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Sab users ki list (parents/instructors), block/unblock UI ke liye
 * @route   GET /api/admin/users?role=parent
 * @access  Admin
 */
const getAllUsers = async (req, res, next) => {
  try {
    const filter = {};
    if (
      req.query.role &&
      ["parent", "instructor", "admin"].includes(String(req.query.role))
    ) {
      filter.role = req.query.role;
    }

    const users = await User.find(filter)
      .select("name email phone role isBlocked createdAt")
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ success: true, count: users.length, users });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Sab classes ki list (har status), Classes tab ke liye
 * @route   GET /api/admin/activities?status=pending
 * @access  Admin
 */
const getAllActivities = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = String(req.query.status);

    const activities = await Activity.find(filter)
      .populate("instructor", "name email")
      .populate("category", "name slug")
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ success: true, count: activities.length, activities });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Sab bookings ki list, Bookings tab ke liye
 * @route   GET /api/admin/bookings
 * @access  Admin
 */
const getAllBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate("parent", "name email phone")
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Class Requests tab ke liye demand grouped karke dikhana
 * @route   GET /api/admin/class-requests
 * @access  Admin
 *
 * Parents jo bhi free-text category/area type karte hain, unko case
 * ke farq (jaise "Robotics" vs "robotics") ke bawajood ek group me
 * gina jata hai. Sabse zyada requests wali cheez sabse upar aati hai -
 * yehi batati hai ke agla instructor kis subject ka recruit karna hai.
 */
const getClassRequests = async (req, res, next) => {
  try {
    const grouped = await ClassRequest.aggregate([
      {
        $group: {
          _id: {
            category: { $toLower: "$category" },
            location: { $toLower: "$location" },
            ageGroup: "$ageGroup",
          },
          category: { $first: "$category" },
          location: { $first: "$location" },
          count: { $sum: 1 },
          latest: { $max: "$createdAt" },
          emails: { $addToSet: "$email" },
        },
      },
      { $sort: { count: -1, latest: -1 } },
      { $limit: 50 },
    ]);

    res.json({
      success: true,
      count: grouped.length,
      requests: grouped.map((g) => ({
        category: g.category,
        area: g.location,
        age: g.ageGroup,
        count: g.count,
        latest: g.latest,
        notifyCount: g.emails.length,
      })),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInstructorApplications,
  getApplicationDetail,
  approveInstructor,
  rejectInstructor,
  toggleSuspendInstructor,
  toggleFeatureInstructor,
  approveActivity,
  toggleSuspendActivity,
  removeActivity,
  resolveCategorySuggestion,
  toggleBlockUser,
  getAdminStats,
  getAllUsers,
  getAllActivities,
  getAllBookings,
  getClassRequests,
};
