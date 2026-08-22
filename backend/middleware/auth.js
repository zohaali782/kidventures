const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { COOKIE_NAME, clearAuthCookie } = require("../utils/authCookie");

/**
 * protect - "gate keeper".
 * Jo routes sirf logged-in users ke liye hain, un par ye lagta hai.
 * Ye token check karta hai aur user ko req.user me daal deta hai.
 */
const protect = async (req, res, next) => {
  try {
    // 1. Token pehle httpOnly cookie se — yehi asal tareeqa hai.
    //    Bearer header sirf backwards-compatibility ke liye rakha hai
    //    (purane logged-in users / API testing tools ke liye).
    let token = req.cookies?.[COOKIE_NAME];

    if (
      !token &&
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, please login",
      });
    }

    // 2. Token verify karo.
    //    algorithms pin karna zaroori hai — warna "alg confusion" attack
    //    se koi apna banaya hua token pass kara sakta hai.
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ["HS256"],
      });
    } catch {
      // Invalid ya expired token 500 nahi, 401 hona chahiye —
      // taake frontend session expire samajh kar login par bhej sake.
      clearAuthCookie(res);
      return res.status(401).json({
        success: false,
        message: "Session expired, please login again",
      });
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      clearAuthCookie(res);
      return res
        .status(401)
        .json({ success: false, message: "User no longer exists" });
    }

    if (user.isBlocked || user.isActive === false) {
      clearAuthCookie(res);
      return res
        .status(403)
        .json({ success: false, message: "Your account is unavailable" });
    }

    // 3. Password badalne ke baad purane token na chalein.
    //    (User model mein passwordChangedAt field add karne par chalu hoga.)
    if (
      user.passwordChangedAt &&
      decoded.iat * 1000 < new Date(user.passwordChangedAt).getTime()
    ) {
      clearAuthCookie(res);
      return res.status(401).json({
        success: false,
        message: "Password was changed. Please login again.",
      });
    }

    req.user = user; // ab har controller ko pata hai ke request kis ki hai
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * authorize - role check.
 * Istemal: router.get('/admin-only', protect, authorize('admin'), handler)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
