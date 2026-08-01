const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * optionalAuth - "narm" version of protect.
 *
 * Kuch routes public hain, magar agar user logged in ho to fayda hota hai.
 * Misaal: class detail page - public class sab dekh sakte hain, magar
 * instructor apni draft class bhi dekh sake.
 *
 * Token ho to req.user set kar do. Na ho ya kharab ho to bhi
 * request aage jane do - error nahi dena.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (header && header.startsWith("Bearer ")) {
      const token = header.split(" ")[1];

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (user && !user.isBlocked) {
          req.user = user;
        }
      } catch {
        // Token kharab hai - koi baat nahi, guest samajh kar aage barho
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { optionalAuth };
