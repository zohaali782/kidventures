const Child = require("../models/Child");
const Booking = require("../models/Booking");

/**
 * Har route par ownership check hai - parent sirf apne hi bachon ka
 * record dekh/badal sakta hai. Ye bachon ka data hai, is me koi
 * dheel nahi ho sakti.
 */

/**
 * @desc    Apne bachay dekhna
 * @route   GET /api/children
 * @access  Parent
 */
const getMyChildren = async (req, res, next) => {
  try {
    const children = await Child.find({
      parent: req.user._id,
      isActive: true,
    }).sort({
      createdAt: 1,
    });

    res.json({ success: true, count: children.length, children });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Naya bacha add karna
 * @route   POST /api/children
 * @access  Parent
 */
const addChild = async (req, res, next) => {
  try {
    const {
      name,
      dateOfBirth,
      gender,
      allergies,
      medicalNotes,
      emergencyContact,
    } = req.body;

    if (!name || !dateOfBirth) {
      return res.status(400).json({
        success: false,
        message: "Name and date of birth are required",
      });
    }

    const dob = new Date(dateOfBirth);

    if (Number.isNaN(dob.getTime())) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid date of birth" });
    }

    if (dob > new Date()) {
      return res.status(400).json({
        success: false,
        message: "Date of birth cannot be in the future",
      });
    }

    // 18 saal se bara "bacha" nahi ho sakta
    const ageInYears =
      (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (ageInYears > 18) {
      return res.status(400).json({
        success: false,
        message: "Kidventures is for children under 18",
      });
    }

    // Ek parent ke zyada se zyada 10 bachay
    const count = await Child.countDocuments({
      parent: req.user._id,
      isActive: true,
    });
    if (count >= 10) {
      return res.status(400).json({
        success: false,
        message: "You can add up to 10 children",
      });
    }

    const child = await Child.create({
      parent: req.user._id, // hamesha logged-in parent - body se NAHI
      name,
      dateOfBirth: dob,
      gender,
      allergies,
      medicalNotes,
      emergencyContact,
    });

    res.status(201).json({ success: true, message: "Child added", child });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bachay ki detail update karna
 * @route   PUT /api/children/:id
 * @access  Parent (apna hi bacha)
 */
const updateChild = async (req, res, next) => {
  try {
    const child = await Child.findById(req.params.id);

    if (!child) {
      return res
        .status(404)
        .json({ success: false, message: "Child not found" });
    }

    // OWNERSHIP CHECK
    if (child.parent.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Not your child's record" });
    }

    const allowed = [
      "name",
      "dateOfBirth",
      "gender",
      "allergies",
      "medicalNotes",
      "emergencyContact",
    ];

    allowed.forEach((field) => {
      if (req.body[field] !== undefined) child[field] = req.body[field];
    });

    await child.save();

    res.json({ success: true, message: "Child updated", child });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bachay ka record hatana
 * @route   DELETE /api/children/:id
 * @access  Parent (apna hi bacha)
 *
 * NOTE: agar aane wali koi booking hai to record hataya nahi jata -
 * warna instructor ko pata hi nahi chalega ke kaun aa raha hai.
 */
const deleteChild = async (req, res, next) => {
  try {
    const child = await Child.findById(req.params.id);

    if (!child) {
      return res
        .status(404)
        .json({ success: false, message: "Child not found" });
    }

    if (child.parent.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Not your child's record" });
    }

    const upcomingBooking = await Booking.findOne({
      "children.child": child._id,
      status: { $in: ["pending", "confirmed"] },
      sessionDate: { $gte: new Date() },
    });

    if (upcomingBooking) {
      return res.status(400).json({
        success: false,
        message: "This child has upcoming bookings. Please cancel them first.",
      });
    }

    // Poora delete nahi karte - hide karte hain, taake purani
    // bookings ka record salamat rahe.
    child.isActive = false;
    await child.save();

    res.json({ success: true, message: "Child removed" });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyChildren, addChild, updateChild, deleteChild };
