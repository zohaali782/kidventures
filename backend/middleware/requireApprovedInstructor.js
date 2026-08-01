const InstructorProfile = require("../models/InstructorProfile");

/**
 * requireApprovedInstructor - SECURITY GATE.
 *
 * Sirf woh instructor class bana/edit kar sakta hai jiska profile
 * admin ne approve kiya ho aur jo suspended na ho.
 *
 * Iske baghair koi bhi signup karke foran classes list kar sakta tha -
 * yaani vetting ka poora maqsad hi khatam.
 *
 * Admin par ye check nahi lagta.
 */
const requireApprovedInstructor = async (req, res, next) => {
  try {
    if (req.user.role === "admin") return next();

    const profile = await InstructorProfile.findOne({ user: req.user._id });

    if (!profile) {
      return res.status(403).json({
        success: false,
        message: "Please complete your instructor profile first",
        code: "PROFILE_MISSING",
      });
    }

    if (profile.isSuspended) {
      return res.status(403).json({
        success: false,
        message: "Your account is suspended. Please contact support.",
        code: "SUSPENDED",
      });
    }

    if (profile.verificationStatus !== "approved") {
      const messages = {
        incomplete:
          "Please complete and submit your profile for verification first",
        pending:
          "Your profile is still under review. You can create classes once approved.",
        rejected:
          "Your application was not approved. Please update your profile and resubmit.",
      };

      return res.status(403).json({
        success: false,
        message:
          messages[profile.verificationStatus] ||
          "Your profile is not approved yet",
        code: profile.verificationStatus.toUpperCase(),
        rejectionReason: profile.rejectionReason,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { requireApprovedInstructor };
