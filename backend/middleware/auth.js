const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * protect - "gate keeper".
 * Jo routes sirf logged-in users ke liye hain, un par ye lagta hai.
 * Ye token check karta hai aur user ko req.user me daal deta hai.
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Frontend header aisa bhejta hai:  Authorization: Bearer <token>
    if (
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

    // Token asli hai ya nahi - agar chhera gaya ho to yahan error aa jayega
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User no longer exists" });
    }

    if (user.isBlocked) {
      return res
        .status(403)
        .json({ success: false, message: "Your account has been blocked" });
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
