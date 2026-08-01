const jwt = require("jsonwebtoken");

/**
 * JWT token banata hai.
 *
 * Token ek "digital pass" hai. Login ke baad user ko milta hai,
 * aur wo har request ke saath ye pass bhejta hai taake server
 * pehchan sake ke ye kaun hai - dobara password poochne ki zaroorat nahi.
 *
 * Token ke andar sirf user ki id rakhi hai - password ya koi secret nahi.
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "30d",
  });
};

module.exports = generateToken;
