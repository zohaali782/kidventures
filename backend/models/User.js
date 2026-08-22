const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

/**
 * User - parent, instructor aur admin, teeno ka account isi model me banta hai.
 * Farq sirf "role" field ka hai.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [80, "Name cannot exceed 80 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // normal query me password kabhi wapas nahi aayega
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["parent", "instructor", "admin"],
      default: "parent",
    },
    avatar: {
      url: String,
      publicId: String,
    },
    city: { type: String, default: "Dubai" },
    area: String,

    isActive: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },
    lastLoginAt: Date,

    /* --------------------------- Security ---------------------------- */

    /**
     * Password kab badla. JWT ko revoke nahi kiya ja sakta, is liye
     * middleware isse compare karta hai: agar token password badalne se
     * pehle bana tha to reject. Yaani password badalte hi purane saare
     * devices/attacker ke session mar jate hain.
     */
    // NOTE: select:false NAHI — auth middleware har request par isse parhta hai.
    passwordChangedAt: { type: Date },

    /**
     * Email verification. Bachon ki activities wali site hai — koi bhi
     * kisi aur ki email se instructor ban kar apply na kar sake.
     * Token DB me hashed rakha jata hai: DB leak ho to raw token
     * kisi kaam ka na ho (bilkul password ki tarah).
     */
    emailVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String, select: false },
    emailVerifyExpires: { type: Date, select: false },

    /**
     * Account-level brute force lock. IP-based rate limit alag hai, lekin
     * attacker IP badal badal kar ek hi account par attack kar sakta hai.
     */
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockedUntil: { type: Date, select: false },
  },
  { timestamps: true },
);

/**
 * Password save hone se pehle khud-ba-khud hash ho jata hai.
 * Yaani database me kabhi plain password nahi jata.
 *
 * NOTE (Mongoose 8): async hook me "next" parameter NAHI likhna.
 * Naya Mongoose async function ko next deta hi nahi - bas promise ka
 * intezar karta hai. Function khatam = hook khatam.
 */
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  // 12 rounds — 10 se mazboot. Har extra round hash ka waqt dogna kar deta hai,
  // yaani attacker ke liye guessing utni hi mehngi ho jati hai.
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);

  // Token ke iat (issued-at) se 1 second peeche rakhte hain, warna
  // signup ke waqt bana token khud hi "purana" ban kar reject ho jata hai.
  this.passwordChangedAt = new Date(Date.now() - 1000);
});

/**
 * Login ke waqt: user ne jo password bheja, wo hashed password se match karta hai ya nahi.
 */
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

/**
 * Account abhi lock hai ya nahi (bar bar galat password ki wajah se).
 */
userSchema.methods.isLocked = function () {
  return Boolean(this.lockedUntil && this.lockedUntil > Date.now());
};

/**
 * Email verification token banata hai.
 * Raw token email me jata hai, hashed DB me — bilkul password wala usool.
 */
userSchema.methods.createEmailVerifyToken = function () {
  const rawToken = crypto.randomBytes(32).toString("hex");

  this.emailVerifyToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");
  this.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ghante

  return rawToken;
};

/**
 * Password kitna mazboot hai — signup/reset par check karne ke liye.
 * null = theek hai, warna error message.
 *
 * Model ka minlength 8 tha, lekin "12345678" bhi 8 characters hai.
 */
userSchema.statics.validatePasswordStrength = function (password) {
  if (typeof password !== "string" || password.length < 8) {
    return "Password must be at least 8 characters";
  }
  if (password.length > 72) {
    // bcrypt 72 bytes ke baad ignore kar deta hai — pehle hi rok dein
    return "Password cannot exceed 72 characters";
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must contain at least one letter and one number";
  }

  const common = [
    "password", "password1", "12345678", "123456789", "qwerty123",
    "abc12345", "11111111", "iloveyou", "welcome1", "admin123",
  ];
  if (common.includes(password.toLowerCase())) {
    return "This password is too common. Please choose a different one.";
  }

  return null;
};

module.exports = mongoose.model("User", userSchema);
