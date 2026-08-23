const Booking = require("../models/Booking");
const Activity = require("../models/Activity");
const Child = require("../models/Child");
const PDFDocument = require("pdfkit");

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
      ).catch((err) =>
        // Error chupana nahi — yeh woh soorat hai jahan seat kisi ke kaam
        // aaye baghair block ho jati hai, aur kisi ko pata nahi chalta.
        console.error(
          `! Seat rollback failed — activity ${activityId}, session ${sessionId}, ` +
            `${numberOfChildren} seat(s): ${err.message}`,
        ),
      );

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

    /**
     * Instructor ko sirf confirmed bookings dikhani chahiyen — "pending"
     * wali abhi paid nahi hui.
     *
     * Pehle ?status= jo bhi aata wohi laga diya jata tha, yaani instructor
     * ?status=pending bhej kar un bookings ke bachon ke naam aur allergy
     * notes dekh sakta tha jin ka paisa aaya hi nahi. Ab sirf allowed
     * statuses hi chalti hain.
     */
    const ALLOWED_STATUSES = ["confirmed", "completed", "cancelled", "refunded"];
    const requested = String(req.query.status || "");

    filter.status = ALLOWED_STATUSES.includes(requested)
      ? requested
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

    /**
     * REFUND TIER — site ke Refund & Cancellation page wali policy:
     *   48h+     -> full refund
     *   24h-48h  -> partial ho sakta hai (provider ki policy par)
     *   24h se kam -> aam tor par kuch nahi
     *
     * Asli paisa yahan wapas nahi hota — cancelBooking sirf seat free karta
     * hai aur tier record karta hai. Refund admin Stripe se karta hai
     * (POST /api/payments/:bookingId/refund), kyunke "partial" ki rakam
     * ka faisla insaan hi kar sakta hai. Yeh policy page se bhi match karta
     * hai: "To request a refund or cancellation, contact Kidventures."
     */
    const refundTier = booking.refundTier;

    const refundMessages = {
      full: "Booking cancelled. You'll receive a full refund, less any non-refundable processing fees. Our team will process it shortly.",
      partial:
        "Booking cancelled. As this is within 48 hours of the class, a partial refund may apply depending on the provider's policy. Our team will review it and be in touch.",
      none: "Booking cancelled. As per our policy, cancellations less than 24 hours before the class are generally non-refundable.",
      not_applicable:
        "Booking cancelled. No payment had been taken, so there's nothing to refund.",
    };

    const refundStatus =
      refundTier === "full" || refundTier === "partial"
        ? "pending_review"
        : "not_required";

    /**
     * ATOMIC cancel.
     *
     * Pehle yahan findById ke baad booking.save() hota tha. Un dono ke
     * darmiyan agar Stripe ka webhook payment confirm kar deta, to yeh save
     * us confirmation ko MITA deta — paise kat jate aur booking cancelled
     * reh jati. Isi tarah do cancel requests ek sath aatin to seats do
     * dafa release ho jatin.
     *
     * Ab shart update ke andar hai: cancel sirf tab hoti hai jab booking
     * ab bhi usi status par ho jo humne parhi thi.
     */
    const cancelled = await Booking.findOneAndUpdate(
      {
        _id: booking._id,
        status: booking.status, // beech me badal gaya to match nahi hoga
      },
      {
        $set: {
          status: "cancelled",
          cancellation: {
            cancelledBy: isAdmin ? "admin" : "parent",
            cancelledAt: new Date(),
            reason: req.body.reason?.slice(0, 300),
            refundTier,
            // Sirf "full" par rakam tay hai. "partial" ki rakam admin
            // review ke baad decide karta hai, is liye abhi 0.
            refundAmount: refundTier === "full" ? booking.totalAmount : 0,
            refundStatus,
          },
        },
      },
      { new: true },
    );

    if (!cancelled) {
      // Is dauran booking ka status badal gaya (payment confirm ho gayi,
      // ya kisi aur ne cancel kar diya). Dobara koshish karne do.
      return res.status(409).json({
        success: false,
        message:
          "This booking just changed. Please refresh and try again.",
      });
    }

    // Seats wapas chhor do taake koi aur book kar sake
    const seatResult = await Activity.updateOne(
      {
        _id: cancelled.activity,
        sessions: {
          $elemMatch: {
            _id: cancelled.sessionId,
            seatsBooked: { $gte: cancelled.numberOfChildren },
          },
        },
      },
      { $inc: { "sessions.$.seatsBooked": -cancelled.numberOfChildren } },
    ).catch((err) => {
      console.error(
        `! Seat release error — booking ${cancelled.bookingNumber}: ${err.message}`,
      );
      return null;
    });

    // Pehle yahan .catch(() => {}) tha — seat block ho jati aur kisi ko
    // pata na chalta.
    if (seatResult && seatResult.modifiedCount === 0) {
      console.error(
        `! Seat release failed — booking ${cancelled.bookingNumber}, ` +
          `activity ${cancelled.activity}, session ${cancelled.sessionId}`,
      );
    }

    res.json({
      success: true,
      message: refundMessages[refundTier] || refundMessages.not_applicable,
      refundTier,
      booking: cancelled,
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

/**
 * @desc    Booking ki PDF receipt
 * @route   GET /api/bookings/:id/receipt
 * @access  Parent (apni) / Instructor (apni class ki) / Admin
 *
 * Sirf paid bookings ke liye receipt banti hai - pending/unpaid ka
 * koi receipt nahi (kyunki abhi tak paisa liya hi nahi gaya).
 */
const getBookingReceipt = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("activity", "location")
      .populate("instructor", "name")
      .populate("parent", "name email");

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    // ACCESS CHECK - wahi teen log jo getBookingById me hain
    const userId = req.user._id.toString();
    const isParent = booking.parent._id.toString() === userId;
    const isInstructor = booking.instructor._id.toString() === userId;
    const isAdmin = req.user.role === "admin";

    if (!isParent && !isInstructor && !isAdmin) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    const paidStatuses = ["paid", "partially_refunded", "refunded"];
    if (!paidStatuses.includes(booking.paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "A receipt is only available once payment is complete",
      });
    }

    const BRAND = {
      gold: "#F4C542",
      orange: "#F5941F",
      brown: "#3D2B1F",
      gray: "#6B6B6B",
      line: "#E5E5E5",
    };
    const aed = (n) => `AED ${Number(n || 0).toFixed(2)}`;
    const fmtDate = (d) =>
      new Date(d).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="Kidventures-Receipt-${booking.bookingNumber}.pdf"`,
    );

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    doc.pipe(res);

    /* ---------- Header band ---------- */
    doc.rect(0, 0, doc.page.width, 90).fill(BRAND.gold);
    doc
      .fillColor(BRAND.brown)
      .font("Helvetica-Bold")
      .fontSize(24)
      .text("Kidventures", 50, 30);
    doc.font("Helvetica").fontSize(10).text("Booking Receipt", 50, 60);

    /* ---------- Title + ref ---------- */
    doc
      .fillColor(BRAND.brown)
      .font("Helvetica-Bold")
      .fontSize(16)
      .text(booking.activityTitle, 50, 115);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(BRAND.gray)
      .text(`Booking Ref: ${booking.bookingNumber}`, 50, 137)
      .text(`Issued: ${fmtDate(new Date())}`, 50, 151);

    let y = 180;
    const row = (label, value, bold = false) => {
      doc
        .fillColor(BRAND.gray)
        .font("Helvetica")
        .fontSize(10)
        .text(label, 50, y);
      doc
        .fillColor(BRAND.brown)
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(bold ? 11 : 10)
        .text(value, 300, y, { width: 245, align: "right" });
      y += 18;
    };
    const heading = (text) => {
      doc
        .fillColor(BRAND.brown)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(text, 50, y);
      y += 20;
    };
    const divider = () => {
      doc.moveTo(50, y).lineTo(545, y).strokeColor(BRAND.line).stroke();
      y += 14;
    };

    heading("Class Details");
    row("Instructor", booking.instructor?.name || "—");
    row("Date", fmtDate(booking.sessionDate));
    row(
      "Time",
      `${booking.startTime}${booking.endTime ? " – " + booking.endTime : ""}`,
    );
    if (booking.activity?.location?.area) {
      row(
        "Location",
        `${booking.activity.location.area}${
          booking.activity.location.city
            ? ", " + booking.activity.location.city
            : ""
        }`,
      );
    }

    y += 6;
    heading("Children Attending");
    booking.children.forEach((c) => row(c.name, `${c.age} years old`));

    y += 6;
    divider();

    heading("Payment Summary");
    row(
      `${aed(booking.pricePerChild)} × ${booking.numberOfChildren} child${
        booking.numberOfChildren > 1 ? "ren" : ""
      }`,
      aed(booking.subtotalBeforeDiscount),
    );
    if (Number(booking.discountAmount) > 0) {
      row(
        `Sibling discount (${booking.discountPercent}%)`,
        `- ${aed(booking.discountAmount)}`,
      );
    }
    y += 2;
    divider();
    row("Total Paid", aed(booking.totalAmount), true);
    row(
      "Payment Status",
      booking.paymentStatus.replace("_", " ").toUpperCase(),
    );

    /* ---------- Footer ---------- */
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(BRAND.gray)
      .text(
        "Kidventures, Dubai, UAE — for any questions, contact us through the website.",
        50,
        760,
        { align: "center", width: 495 },
      );

    doc.end();
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
  getBookingReceipt,
};
