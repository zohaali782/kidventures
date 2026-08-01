const ClassRequest = require("../models/ClassRequest");

/**
 * @desc    Parent (ya koi bhi visitor) ek na-milne wali class request kare
 * @route   POST /api/class-requests
 * @access  Public — login zaroori nahi, taake koi bhi turant bata sake
 *
 * Body: { category, ageGroup, location, format, note, email, notify }
 */
const createClassRequest = async (req, res, next) => {
  try {
    const { category, ageGroup, location, format, note, email, notify } =
      req.body;

    if (
      !category?.trim() ||
      !ageGroup?.trim() ||
      !location?.trim() ||
      !email?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill in the class, age group, area and email",
      });
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!emailOk) {
      return res
        .status(400)
        .json({ success: false, message: "Enter a valid email address" });
    }

    const allowedFormats = ["any", "in-person", "online"];
    const safeFormat = allowedFormats.includes(format) ? format : "any";

    const request = await ClassRequest.create({
      category: category.trim().slice(0, 80),
      ageGroup: ageGroup.trim(),
      location: location.trim().slice(0, 80),
      format: safeFormat,
      note: note?.trim().slice(0, 500),
      email: email.trim().toLowerCase(),
      notify: notify !== false,
    });

    res.status(201).json({
      success: true,
      message: "Thanks — we've got your request.",
      request,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createClassRequest };
