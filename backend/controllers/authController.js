const User = require("../models/User");
const generateToken = require("../utils/generateToken");

/**
 * Controller = wo function jo request aane par asal kaam karta hai.
 * Route sirf batata hai "ye URL aaye to ye function chalao".
 */

/**
 * @desc    Naya account banana (parent ya instructor)
 * @route   POST /api/auth/signup
 * @access  Public
 */
const signup = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // 1. Zaroori fields aaye hain ya nahi
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    // 2. Email pehle se to registered nahi?
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "This email is already registered. Please login instead.",
      });
    }

    // 3. Role check - koi frontend se "admin" bhej kar admin na ban jaye
    const allowedRoles = ["parent", "instructor"];
    const userRole = allowedRoles.includes(role) ? role : "parent";

    // 4. User banao (password model me khud hash ho jayega)
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone,
      role: userRole,
    });

    // 5. Token banao aur wapas bhejo - signup ke baad user seedha logged in
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    next(error); // errorHandler middleware sambhal lega
  }
};

/**
 * @desc    Login karna
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Model me password "select: false" hai, is liye yahan maangna parta hai
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password",
    );

    // Security note: "email galat hai" ya "password galat hai" alag alag nahi batate -
    // warna koi bhi check kar sakta hai ke konsi email registered hai.
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked. Please contact support.",
      });
    }

    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: "Logged in successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Apni info lena (token se)
 * @route   GET /api/auth/me
 * @access  Private - token chahiye
 */
const getMe = async (req, res, next) => {
  try {
    // req.user protect middleware ne set kiya hai
    const user = await User.findById(req.user._id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

module.exports = { signup, login, getMe };
