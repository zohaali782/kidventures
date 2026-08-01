const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Login ke waqt: user ne jo password bheja, wo hashed password se match karta hai ya nahi.
 */
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
