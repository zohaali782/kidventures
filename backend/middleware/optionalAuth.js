const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { COOKIE_NAME } = require("../utils/authCookie");

/**
 * optionalAuth - "narm" version of protect.
 *
 * Kuch routes public hain, magar agar user logged in ho to fayda hota hai.
 * Misaal: class detail page - public class sab dekh sakte hain, magar
 * instructor apni draft class bhi dekh sake.
 *
 * Token ho to req.user set kar do. Na ho ya kharab ho to bhi
 * request aage jane do - error nahi dena.
 *
 * ZAROORI FIX: pehle yahan sirf "Bearer" header parha jata tha. Jab auth
 * httpOnly cookie par shift hui (dekho protect / authCookie.js) to ye
 * middleware update nahi hua, yaani logged-in user bhi hamesha "guest"
 * hi samjha jata tha. Nateeja: getActivityById me isOwner/isAdmin kabhi
 * true nahi hota tha, aur jo class "active" na ho (draft, pending ya
 * suspended) wo uske apne instructor ko bhi 404 deti thi - Edit Class
 * page par "Couldn't load this class." Ab token pehle cookie se uthta
 * hai, bilkul protect ki tarah.
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.[COOKIE_NAME];

    if (
      !token &&
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
      try {
        // algorithms pin karna zaroori hai - protect me bhi yehi hai
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
          algorithms: ["HS256"],
        });
        const user = await User.findById(decoded.id);

        if (user && !user.isBlocked && user.isActive !== false) {
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
