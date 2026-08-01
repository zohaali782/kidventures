const Booking = require("../models/Booking");
const Activity = require("../models/Activity");
const Child = require("../models/Child");

/**
 * Commission .env se aati hai. Booking ke waqt ka rate booking me
 * save ho jata hai - baad me rate badle to purani bookings par asar nahi.
 */
const getCommissionPercent = () => {
  const value = Number(process.env.PLATFORM_COMMISSION_PERCENT);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : 15;
};

/**
 * SIBLING DISCOUNT
 * Agar 2 ya zyada bachay ek hi booking me hon, to POORI booking ke
 * subtotal par ek hi baar yeh % discount lagta hai (har additional
 * bache par alag se NAHI - flat ek hi discount, chahe 2 bachay hon
 * ya 5). Yeh platform ki marketing decision hai - instructor ki
 * earning is se NAHI ghatti (neeche dekho: instructorEarning hamesha
 * full-price ke hisaab se calculate hoti hai). Platform apne commission
 * me se yeh discount fund karta hai - aur kabhi bhi apne hi commission
 * se zyada discount nahi deta (taake platform kisi bhi booking par
 * loss me na jaye).
 */
const SIBLING_DISCOUNT_PERCENT = 10;

/**
 * Payment na hone par seat kitni der rok kar rakhni hai.
 */
const RESERVATION_MINUTES = 15;

/**
 * @desc    Nayi booking banana (seat reserve karna)
 * @route   POST /api/bookings
 * @access  Parent
 *
 * Body: { activityId, sessionId, childIds: [], parentNotes }
 *
 * NOTE: qeemat body se NAHI aati. Frontend chahe kuch bhi bheje,
 * server hamesha database se asli price uthata hai.
 */
const createBooking = async (req, res, next) => {
  try {
    const { activityId, sessionId, childIds, parentNotes } = req.body;

    if (
      !activityId ||
      !sessionId ||
      !Array.isArray(childIds) ||
      childIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please select a class, a session and at least one child",
      });
    }

    // Ek hi bacha do baar list me na ho
    const uniqueChildIds = [...new Set(childIds.map(String))];

    if (uniqueChildIds.length > 10) {
      return res
        .status(400)
        .json({ success: false, message: "Too many children in one booking" });
    }

    /* ------------------------- 1. Class check ------------------------- */
    const activity = await Activity.findOne({
      _id: activityId,
      status: "active",
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "This class is not available for booking",
      });
    }

    const session = activity.sessions.id(sessionId);

    if (!session || session.status !== "scheduled") {
      return res
        .status(400)
        .json({ success: false, message: "This session is not available" });
    }

    // Guzri hui date par booking nahi
    if (new Date(session.date) < new Date()) {
      return res
        .status(400)
        .json({ success: false, message: "This session has already passed" });
    }

    /* ------------------------- 2. Children check ------------------------- */
    // OWNERSHIP: sirf apne bachay book kar sakta hai
    const children = await Child.find({
      _id: { $in: uniqueChildIds },
      parent: req.user._id,
      isActive: true,
    });

    if (children.length !== uniqueChildIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more selected children were not found in your account",
      });
    }

    // Age range check
    const wrongAge = children.filter(
      (child) => child.age < activity.ageMin || child.age > activity.ageMax,
    );

    if (wrongAge.length > 0) {
      return res.status(400).json({
        success: false,
        message: `This class is for ages ${activity.ageMin}-${activity.ageMax}. ${wrongAge
          .map((c) => `${c.name} (${c.age})`)
          .join(", ")} ${wrongAge.length === 1 ? "does" : "do"} not fit.`,
      });
    }

    // Wohi bacha isi session me pehle se booked to nahi?
    const alreadyBooked = await Booking.findOne({
      sessionId,
      "children.child": { $in: uniqueChildIds },
      status: { $in: ["pending", "confirmed"] },
    });

    if (alreadyBooked) {
      return res.status(400).json({
        success: false,
        message: "One of these children is already booked for this session",
      });
    }

    const numberOfChildren = children.length;

    /* --------------------- 3. Seats - ATOMIC reserve --------------------- */
    /**
     * Ye is poore system ka sab se ahem hissa hai.
     *
     * Agar hum pehle "seats bachi hain?" check karte, phir alag se
     * seats barhate - to do parents ek hi lamhe me aakhri seat le
     * sakte the (dono ka check pass ho jata). Isay "race condition"
     * kehte hain.
     *
     * Is liye check aur update EK HI database operation me hain.
     * MongoDB guarantee karta hai ke ye operation beech me nahi tootega.
     * Do requests aayen to sirf ek kaamyab hogi, doosri ko null milega.
     */
    const reserved = await Activity.findOneAndUpdate(
      {
        _id: activityId,
        status: "active",
        sessions: {
          $elemMatch: {
            _id: sessionId,
            status: "scheduled",
            capacity: session.capacity, // capacity beech me badli to fail
            seatsBooked: { $lte: session.capacity - numberOfChildren },
          },
        },
      },
      { $inc: { "sessions.$.seatsBooked": numberOfChildren } },
      { new: true },
    );

    if (!reserved) {
      const seatsLeft = Math.max(session.capacity - session.seatsBooked, 0);

      return res.status(409).json({
        success: false,
        message:
          seatsLeft === 0
            ? "Sorry, this session is now full"
            : `Only ${seatsLeft} seat(s) left in this session`,
        seatsAvailable: seatsLeft,
      });
    }

    /* --------------------------- 4. Paisay ---------------------------
     *
     * Commission model: COMMISSION DEDUCTED FROM INSTRUCTOR
     * (Airbnb-host style — Uber-rider-surcharge NAHI).
     *
     * Parent bilkul WAHI price deta hai jo listing par dikhti hai -
     * koi extra "service fee" upar se nahi jorha jata. Commission
     * instructor ki earning me se kaata jata hai.
     *
     * SIBLING DISCOUNT: agar ek se zyada bacchay book ho rahe hain,
     * 2nd bache se lekar aage har bache par 10% off. Yeh discount
     * PLATFORM apne commission me se deta hai - instructor ki earning
     * is se bilkul unaffected rehti hai (wo hamesha full-price ke
     * hisaab se apna hissa paata hai). Discount kabhi bhi platform ke
     * apne commission amount se zyada nahi ho sakta - taake platform
     * kisi bhi booking par loss me na jaye.
     *
     * Misaal (AED 175 ki class, 2 bachay, 15% commission):
     *   subtotalBeforeDiscount = 350     (175 × 2)
     *   discountAmount         = 35      (flat 10% of 350, 2+ bachon par)
     *   subtotal (parent pays) = 315     (350 - 35)
     *   commissionAmount       = 52.5    (15% of 350 - full price base)
     *   instructorEarning      = 297.5   (350 - 52.5 - discount se untouched)
     *   totalAmount            = 315     (parent bilkul yehi deta hai)
     *
     * Sab kuch server par calculate hota hai - body se kuch nahi liya jata.
     * NOTE: yahan jaan boojh kar decimal round nahi kiya - jo bhi asli
     * number bane wohi rakha jata hai (koi Math.round nahi).
     */
    const pricePerChild = activity.price;
    const subtotalBeforeDiscount = pricePerChild * numberOfChildren;
    const commissionPercent = getCommissionPercent();
    const commissionAmount = subtotalBeforeDiscount * (commissionPercent / 100);

    // Flat discount: 2 ya zyada bachay hon to POORI booking par ek hi
    // baar yeh %, har additional bache par alag se nahi.
    const hasSiblingDiscount = numberOfChildren > 1;
    const rawDiscountAmount = hasSiblingDiscount
      ? subtotalBeforeDiscount * (SIBLING_DISCOUNT_PERCENT / 100)
      : 0;

    // Safety clamp: platform apne hi commission se zyada discount kabhi na de
    const discountAmount = Math.min(rawDiscountAmount, commissionAmount);
    const discountPercent = hasSiblingDiscount ? SIBLING_DISCOUNT_PERCENT : 0;

    const subtotal = subtotalBeforeDiscount - discountAmount;

    // Instructor ki earning discount se untouched - hamesha full-price base par
    const instructorEarning = subtotalBeforeDiscount - commissionAmount;

    const totalAmount = subtotal; // parent isse zyada kuch nahi deta

    /* -------------------------- 5. Booking -------------------------- */
    try {
      const booking = await Booking.create({
        parent: req.user._id,
        activity: activity._id,
        activityTitle: activity.title,
        instructor: activity.instructor,

        sessionId: session._id,
        sessionDate: session.date,
        startTime: session.startTime,
        endTime: session.endTime,

        children: children.map((child) => ({
          child: child._id,
          name: child.name,
          age: child.age,
          allergies: child.allergies,
        })),
        numberOfChildren,

        pricePerChild,
        subtotalBeforeDiscount,
        discountPercent,
        discountAmount,
        subtotal,
        currency: activity.currency,
        commissionPercent,
        commissionAmount,
        instructorEarning,
        totalAmount,

        status: "pending",
        paymentStatus: "unpaid",
        reservationExpiresAt: new Date(
          Date.now() + RESERVATION_MINUTES * 60 * 1000,
        ),

        parentNotes: parentNotes?.slice(0, 500),
      });

      res.status(201).json({
        success: true,
        message: `Seats reserved. Please complete payment within ${RESERVATION_MINUTES} minutes.`,
        booking,
      });
    } catch (bookingError) {
      // Booking banane me masla ho gaya to reserve ki hui seats wapas chhor do,
      // warna woh hamesha ke liye block ho jatin.
      await Activity.updateOne(
        { _id: activityId, "sessions._id": sessionId },
        { $inc: { "sessions.$.seatsBooked": -numberOfChildren } },
      ).catch(() => {});

      throw bookingError;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Parent ki apni bookings
 * @route   GET /api/bookings/my
 * @access  Parent
 *
 * ?type=upcoming | past
 */
const getMyBookings = async (req, res, next) => {
  try {
    const filter = { parent: req.user._id };

    if (req.query.type === "upcoming") {
      filter.sessionDate = { $gte: new Date() };
      filter.status = { $in: ["pending", "confirmed"] };
    } else if (req.query.type === "past") {
      filter.sessionDate = { $lt: new Date() };
    }

    if (req.query.status) {
      filter.status = String(req.query.status);
    }

    const bookings = await Booking.find(filter)
      .populate("activity", "title slug images format location durationMinutes")
      .populate("instructor", "name avatar")
      .sort({ sessionDate: req.query.type === "past" ? -1 : 1 });

    res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Instructor ki classes ki bookings
 * @route   GET /api/bookings/instructor
 * @access  Instructor
 */
const getInstructorBookings = async (req, res, next) => {
  try {
    const filter = { instructor: req.user._id };

    if (req.query.type === "upcoming") {
      filter.sessionDate = { $gte: new Date() };
    }

    // Instructor ko sirf confirmed bookings dikhani chahiyen -
    // "pending" wali abhi paid nahi hui.
    filter.status = req.query.status
      ? String(req.query.status)
      : { $in: ["confirmed", "completed"] };

    if (req.query.activityId) {
      filter.activity = req.query.activityId;
    }

    const bookings = await Booking.find(filter)
      .populate("activity", "title slug")
      .populate("parent", "name phone")
      .sort({ sessionDate: 1 });

    res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Ek booking ki detail
 * @route   GET /api/bookings/:id
 * @access  Parent (apni) / Instructor (apni class ki) / Admin
 */
const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("activity", "title slug images format location durationMinutes")
      .populate("instructor", "name avatar phone")
      .populate("parent", "name email phone");

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    // ACCESS CHECK - teen me se koi ek hona zaroori hai
    const userId = req.user._id.toString();
    const isParent = booking.parent._id.toString() === userId;
    const isInstructor = booking.instructor._id.toString() === userId;
    const isAdmin = req.user.role === "admin";

    if (!isParent && !isInstructor && !isAdmin) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    res.json({ success: true, booking });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Booking cancel karna
 * @route   PUT /api/bookings/:id/cancel
 * @access  Parent (apni) / Admin
 */
const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    const isParent = booking.parent.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isParent && !isAdmin) {
      return res
        .status(403)
        .json({ success: false, message: "Not your booking" });
    }

    if (["cancelled", "refunded", "completed"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `This booking is already ${booking.status}`,
      });
    }

    const wasRefundable = booking.isRefundable;

    booking.status = "cancelled";
    booking.cancellation = {
      cancelledBy: isAdmin ? "admin" : "parent",
      cancelledAt: new Date(),
      reason: req.body.reason?.slice(0, 300),
      // Asli refund Stripe wale step me hoga - abhi sirf rakam tay
      refundAmount: wasRefundable ? booking.totalAmount : 0,
    };

    await booking.save();

    // Seats wapas chhor do taake koi aur book kar sake
    await Activity.updateOne(
      {
        _id: booking.activity,
        sessions: {
          $elemMatch: {
            _id: booking.sessionId,
            seatsBooked: { $gte: booking.numberOfChildren },
          },
        },
      },
      { $inc: { "sessions.$.seatsBooked": -booking.numberOfChildren } },
    ).catch(() => {});

    res.json({
      success: true,
      message: wasRefundable
        ? "Booking cancelled. Refund will be processed."
        : "Booking cancelled. As per policy, no refund applies within 24 hours of the class.",
      booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Session ki attendee list (instructor ke liye)
 * @route   GET /api/bookings/session/:activityId/:sessionId
 * @access  Instructor (apni class)
 *
 * Instructor ko bachon ke naam aur allergies chahiye hoti hain -
 * ye safety ka maamla hai.
 */
const getSessionAttendees = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.activityId);

    if (!activity) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    const isOwner = activity.instructor.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Not your class" });
    }

    const bookings = await Booking.find({
      activity: req.params.activityId,
      sessionId: req.params.sessionId,
      status: "confirmed",
    }).populate("parent", "name phone");

    // Sirf wohi cheezein bhejni hain jo instructor ko chahiyen
    const attendees = bookings.flatMap((booking) =>
      booking.children.map((child) => ({
        name: child.name,
        age: child.age,
        allergies: child.allergies || "None",
        parentName: booking.parent?.name,
        parentPhone: booking.parent?.phone,
        bookingNumber: booking.bookingNumber,
      })),
    );

    res.json({ success: true, count: attendees.length, attendees });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getInstructorBookings,
  getBookingById,
  cancelBooking,
  getSessionAttendees,
};
