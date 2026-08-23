const crypto = require("crypto");

const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { sendAuthCookie, clearAuthCookie } = require("../utils/authCookie");
const { sendEmail } = require("../utils/sendEmail");
const {
  verifyEmail: verifyEmailTemplate,
  passwordReset: passwordResetTemplate,
  passwordChanged: passwordChangedTemplate,
} = require("../utils/emailTemplates");

/**
 * Controller = wo function jo request aane par asal kaam karta hai.
 * Route sirf batata hai "ye URL aaye to ye function chalao".
 */

/* --------------------------- Account lockout ---------------------------
 *
 * IP-based rate limit routes par lagi hai, lekin attacker IP badal badal kar
 * ek hi account par attack kar sakta hai. Is liye account ka apna counter.
 */
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

// Frontend (jahan user ko wapas bhejna hai)
const APP_URL = () =>
  (process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173")
    .replace(/\/$/, "");

// Backend (jahan verification link click hone par jayega)
// .env me production ke liye SERVER_URL zaroor set karein.
const API_URL = () =>
  (process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`)
    .replace(/\/$/, "");

// SMTP set hai ya nahi. Dev machine par aksar nahi hota — us soorat me
// verification skip kar dete hain, warna koi login hi na kar sake.
const smtpConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

/**
 * Verification token banata hai, save karta hai, aur email BACKGROUND me
 * bhejta hai.
 *
 * ZAROORI: email bhejne ka intezar nahi karte. SMTP (khaas kar Gmail)
 * kabhi kabhi 10-30 second le leta hai — us dauran user ki signup request
 * latki rehti hai aur browser timeout kar deta hai, halanke account ban
 * chuka hota hai. Is liye response foran bhejte hain aur email apne waqt
 * par chali jati hai.
 */
const sendVerificationEmail = async (user) => {
  const rawToken = user.createEmailVerifyToken();
  await user.save({ validateBeforeSave: false });

  const verifyUrl = `${API_URL()}/api/auth/verify-email/${rawToken}`;
  const { subject, html } = verifyEmailTemplate({
    name: user.name,
    verifyUrl,
  });

  // await nahi — background me chalne do
  sendEmail({ to: user.email, subject, html }).catch((err) =>
    console.error("[verify-email] send failed:", err.message),
  );
};

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

    // 2. Type check — koi object bhej kar query se cheer-chaar na kar sake
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password format",
      });
    }

    // 3. Password kitna mazboot hai
    const weak = User.validatePasswordStrength(password);
    if (weak) {
      return res.status(400).json({ success: false, message: weak });
    }

    // 4. Email pehle se to registered nahi?
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "This email is already registered. Please login instead.",
      });
    }

    // 5. Role check - koi frontend se "admin" bhej kar admin na ban jaye
    const allowedRoles = ["parent", "instructor"];
    const userRole = allowedRoles.includes(role) ? role : "parent";

    // 6. User banao (password model me khud hash ho jayega)
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone,
      role: userRole,
    });

    // 7. SMTP set hai to verification email bhejo aur abhi login NAHI karate —
    //    pehle email confirm ho. (Login bhi unverified users ko rokta hai,
    //    dono jagah ek hi usool.)
    if (smtpConfigured()) {
      await sendVerificationEmail(user); // email background me jati hai

      return res.status(201).json({
        success: true,
        verificationRequired: true,
        message:
          "Account created. Please check your email to confirm your address, then log in.",
      });
    }

    // 8. SMTP configure nahi (local dev) — verification skip, seedha login.
    user.emailVerified = true;
    await user.save({ validateBeforeSave: false });

    // 9. Token httpOnly cookie mein jata hai, JSON response mein NAHI,
    //    warna frontend use localStorage mein rakhta aur XSS se chura ja sakta.
    //    Token httpOnly cookie mein jata hai, JSON response mein NAHI,
    //    warna frontend use localStorage mein rakhta aur XSS se chura ja sakta.
    const token = generateToken(user._id);
    sendAuthCookie(res, token);

    res.status(201).json({
      success: true,
      verificationRequired: false,
      message: "Account created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        emailVerified: user.emailVerified,
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

    // Type check — object bhej kar Mongo query se cheer-chaar na ho
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Model me ye fields "select: false" hain, is liye yahan maangne parte hain
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password +failedLoginAttempts +lockedUntil",
    );

    // 1. Account bar bar galat password ki wajah se lock to nahi?
    if (user && user.isLocked()) {
      const minsLeft = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      return res.status(429).json({
        success: false,
        message: `Too many failed attempts. Try again in ${minsLeft} minute(s).`,
      });
    }

    // 2. Security note: "email galat hai" ya "password galat hai" alag alag
    //    nahi batate — warna koi bhi check kar sakta hai ke konsi email
    //    registered hai.
    if (!user || !(await user.matchPassword(password))) {
      // Galat password par counter barhao (user maujood ho to)
      if (user) {
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

        if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
          user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
          user.failedLoginAttempts = 0;
        }
        await user.save({ validateBeforeSave: false });
      }

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.isBlocked || user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked. Please contact support.",
      });
    }

    // 3. Email verify hui ya nahi.
    //    Bachon ki activities wali site hai — fake email se instructor
    //    ban jana nahi chahiye.
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        code: "EMAIL_NOT_VERIFIED",
        message:
          "Please confirm your email address first. Check your inbox for the confirmation link.",
      });
    }

    // Kamyab login — counter reset
    user.lastLoginAt = new Date();
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);
    sendAuthCookie(res, token);

    res.json({
      success: true,
      message: "Logged in successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        emailVerified: user.emailVerified,
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

/**
 * @desc    Logout — auth cookie khatam
 * @route   POST /api/auth/logout
 * @access  Public (cookie ho ya na ho, safely chal jata hai)
 *
 * httpOnly cookie ko JavaScript delete nahi kar sakti, is liye logout
 * ke liye server ko batana parta hai.
 */
const logout = async (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true, message: "Logged out successfully" });
};

/**
 * @desc    Email verify karna (link click hone par)
 * @route   GET /api/auth/verify-email/:token
 * @access  Public
 *
 * Raw token sirf email me hota hai; DB me uska hash hai. Is liye yahan
 * incoming token ko hash kar ke dhoondte hain — DB leak ho jaye to bhi
 * koi stored token se verify nahi kar sakta.
 */
const verifyEmailToken = async (req, res, next) => {
  try {
    const hashed = crypto
      .createHash("sha256")
      .update(String(req.params.token || ""))
      .digest("hex");

    const user = await User.findOne({
      emailVerifyToken: hashed,
      emailVerifyExpires: { $gt: new Date() },
    }).select("+emailVerifyToken +emailVerifyExpires");

    if (!user) {
      return res.redirect(`${APP_URL()}/login?verified=expired`);
    }

    user.emailVerified = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return res.redirect(`${APP_URL()}/login?verified=1`);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verification email dobara bhejna
 * @route   POST /api/auth/resend-verification
 * @access  Public
 *
 * Jawab hamesha ek jaisa hota hai — warna koi is endpoint se check kar
 * sakta hai ke konsi email registered hai.
 */
const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    const genericReply = {
      success: true,
      message:
        "If that email needs confirming, we've sent a new link. Please check your inbox.",
    };

    if (typeof email !== "string" || !email.trim()) {
      return res.json(genericReply);
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (user && !user.emailVerified) {
      await sendVerificationEmail(user);
    }

    return res.json(genericReply);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Password reset link maangna
 * @route   POST /api/auth/forgot-password
 * @access  Public
 *
 * SECURITY: jawab hamesha ek jaisa hota hai, chahe email registered ho ya na
 * ho. Warna koi is endpoint se check kar sakta hai ke kaun si email account
 * rakhti hai (user enumeration).
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const genericReply = {
      success: true,
      message:
        "If an account exists for that email, we've sent a reset link. Please check your inbox.",
    };

    if (typeof email !== "string" || !email.trim()) {
      return res.json(genericReply);
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // User nahi mila, ya blocked hai — phir bhi wohi jawab
    if (!user || user.isBlocked || user.isActive === false) {
      return res.json(genericReply);
    }

    // SMTP hi na ho to reset link bhejne ka koi tareeqa nahi
    if (!smtpConfigured()) {
      console.warn("[forgot-password] SMTP not configured — no email sent");
      return res.json(genericReply);
    }

    const rawToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Reset link FRONTEND par jata hai (wahan naya password ka form hai),
    // verification link ke bar-aks jo backend par jata hai.
    const resetUrl = `${APP_URL()}/reset-password/${rawToken}`;
    const { subject, html } = passwordResetTemplate({
      name: user.name,
      resetUrl,
    });

    // Background me — SMTP slow ho to user ki request na latke
    sendEmail({ to: user.email, subject, html }).catch((err) =>
      console.error("[forgot-password] send failed:", err.message),
    );

    return res.json(genericReply);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Naya password set karna
 * @route   POST /api/auth/reset-password/:token
 * @access  Public (token hi sanad hai)
 */
const resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;

    if (typeof password !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Password is required" });
    }

    const weak = User.validatePasswordStrength(password);
    if (weak) {
      return res.status(400).json({ success: false, message: weak });
    }

    // Incoming raw token ko hash kar ke dhoondte hain
    const hashed = crypto
      .createHash("sha256")
      .update(String(req.params.token || ""))
      .digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetToken +passwordResetExpires");

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "This reset link is invalid or has expired. Please request a new one.",
      });
    }

    // Naya password. Model ka pre-save hook ise hash karega aur
    // passwordChangedAt set karega — jis se purane saare tokens mar jate hain
    // (agar attacker andar tha to woh bhi bahar).
    user.password = password;

    // Token ek hi dafa chalta hai
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    // Reset link email par gaya tha, yaani email ka malik yehi hai
    user.emailVerified = true;

    // Lock bhi hata do — warna user password badal kar bhi andar na aa sake
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;

    await user.save();

    // Confirmation email — agar yeh user ne nahi kiya to use foran pata chale
    if (smtpConfigured()) {
      const { subject, html } = passwordChangedTemplate({ name: user.name });
      sendEmail({ to: user.email, subject, html }).catch((err) =>
        console.error("[reset-password] confirm mail failed:", err.message),
      );
    }

    // Jaan boojh kar login NAHI karate — user naya password khud daal kar
    // aaye, taake yaad rahe aur password manager bhi save kar le.
    clearAuthCookie(res);

    res.json({
      success: true,
      message: "Password updated. You can log in with your new password now.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  login,
  getMe,
  logout,
  verifyEmailToken,
  resendVerification,
  forgotPassword,
  resetPassword,
};
