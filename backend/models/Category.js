const mongoose = require("mongoose");

/**
 * Category - Art & Painting, Coding, Baking, Chess waghera.
 * Har Activity (class) kisi na kisi category se juri hoti hai.
 */
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
      maxlength: 60,
    },
    // slug = URL me istemal hone wala saaf naam. "Art & Painting" -> "art-painting"
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    description: { type: String, trim: true, maxlength: 300 },
    icon: String, // frontend ka icon key, jaise "palette"
    image: {
      url: String,
      publicId: String,
    },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false }, // homepage "Popular categories"
    activityCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

/**
 * Name se slug khud ban jata hai - koi extra package ki zaroorat nahi.
 * "Quran & Islamic Studies" -> "quran-islamic-studies"
 */
function makeSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // special characters hata do
    .replace(/\s+/g, "-") // spaces ko dash bana do
    .replace(/-+/g, "-"); // double dash ko single karo
}

// NOTE: ye async NAHI hai, is liye yahan next() sahi hai.
categorySchema.pre("save", function () {
  if (this.isModified("name")) {
    this.slug = makeSlug(this.name);
  }
});

categorySchema.index({ isActive: 1, displayOrder: 1 });

module.exports = mongoose.model("Category", categorySchema);
