const mongoose = require("mongoose");

/**
 * Child - parent apne bachon ko add karta hai, booking ke waqt select hote hain.
 * PDF ke mutabiq: name, age, allergies, emergency contact.
 */
const childSchema = new mongoose.Schema(
  {
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Child's name is required"],
      trim: true,
      maxlength: 60,
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Date of birth is required"],
    },
    gender: {
      type: String,
      enum: ["male", "female", "prefer_not_to_say"],
      default: "prefer_not_to_say",
    },
    allergies: { type: String, trim: true, maxlength: 500, default: "" },
    medicalNotes: { type: String, trim: true, maxlength: 500, default: "" },
    emergencyContact: {
      name: { type: String, trim: true },
      relation: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    avatar: {
      url: String,
      publicId: String,
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

/**
 * Age hamesha date of birth se calculate hoti hai - store nahi karte.
 * Warna har saal purani ho jati aur booking ke waqt ghalat validation hoti.
 */
childSchema.virtual("age").get(function () {
  if (!this.dateOfBirth) return null;

  const today = new Date();
  const dob = new Date(this.dateOfBirth);

  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  // Agar is saal ki birthday abhi nahi aayi to ek saal kam
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age;
});

module.exports = mongoose.model("Child", childSchema);
