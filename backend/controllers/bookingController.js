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
 * Payment na hone par seat kitni der rok kar rakhni hai.
 */
const RESERVATION_MINUTES = 15;

/**
 * @desc    Nayi booking banana (seat reserve karna)
 * @route   POST /api/bookings
 * @access  Parent
 *
 * Body: { activityId, sessionId, childIds: [], parentNotes }
 * YA multi-day bundle ke liye: { activityId, bundleId, childIds: [], parentNotes }
 *
 * NOTE: qeemat body se NAHI aati - do istisna hain: (1) flexiblePricing
 * wali class par body ka "customAmount" (neeche validate hone ke baad),
 * (2) bundle wali booking par bundle ki apni fixed `price`. Warna hamesha
 * database se, activity ki asli price uthai jati hai - frontend chahe
 * kuch bhi bheje.
 */
const createBooking = async (req, res, next) => {
  try {
    const {
      activityId,
      sessionId,
      bundleId,
      childIds,
      parentNotes,
      customAmount,
    } = req.body;

    if (
      !activityId ||
      (!sessionId && !bundleId) ||
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

    // Charity fundraiser classes don't go through normal checkout - parent
    // donates via the instructor's fundraiser link and verifies on
    // WhatsApp instead, so this endpoint must never reserve a seat for
    // one (defense in depth - frontend already hides/blocks this too).
    if (activity.fundraiser?.enabled) {
      return res.status(400).json({
        success: false,
        message:
          "This class is booked through its fundraiser link, not here",
      });
    }

    /**
     * BUNDLE vs SINGLE SESSION.
     *
     * `sessionsToReserve` normalizes both paths into the same shape (an
     * array of the actual session subdocuments), so seat reservation
     * below can be written once and work for either a single session
     * (array of 1) or a multi-day bundle (array of 2+).
     */
    let bundle = null;
    let sessionsToReserve = [];

    if (bundleId) {
      bundle = activity.bundles?.id(bundleId);
      if (!bundle || bundle.status !== "active") {
        return res.status(400).json({
          success: false,
          message: "This bundle is not available",
        });
      }

      sessionsToReserve = bundle.sessionIds
        .map((id) => activity.sessions.id(id))
        .filter(Boolean);

      if (sessionsToReserve.length !== bundle.sessionIds.length) {
        return res.status(400).json({
          success: false,
          message: "This bundle is misconfigured, please contact support",
        });
      }

      const now = new Date();
      const bad = sessionsToReserve.find(
        (s) => s.status !== "scheduled" || new Date(s.date) < now,
      );
      if (bad) {
        return res.status(400).json({
          success: false,
          message:
            "One of the dates in this bundle is no longer available",
        });
      }
    } else {
      const session = activity.sessions.id(sessionId);

      if (!session || session.status !== "scheduled") {
        return res
          .status(400)
          .json({ success: false, message: "This session is not available" });
      }

      // Guzri hui date par booking nahi
      if (new Date(session.date) < new Date()) {
        return res.status(400).json({
          success: false,
          message: "This session has already passed",
        });
      }

      sessionsToReserve = [session];
    }

    /**
     * FLEXIBLE PRICING: agar instructor ne apni class par ye on kar rakha
     * hai, to fixed activity.price ke bajaye parent jo amount bheje wahi
     * per-child price banti hai - lekin seat reserve hone se PEHLE hi
     * validate karna zaroori hai (warna invalid amount par bhi seat
     * atomically reserve ho chuki hogi aur wapas release karni parti).
     * Bundles apni khud ki fixed price rakhte hain - flexible pricing
     * sirf normal single-session booking par lagu hoti hai.
     */
    let pricePerChild = bundle ? bundle.price : activity.price;
    if (!bundle && activity.flexiblePricing?.enabled) {
      const amount = Number(customAmount);
      const minAmount = Number(activity.flexiblePricing.minAmount) || 0;

      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid amount",
        });
      }
      if (amount < minAmount) {
        return res.status(400).json({
          success: false,
          message: `Please enter an amount of at least AED ${minAmount} per child`,
        });
      }
      // Sanity cap - typo/abuse se bachao, suggested price se bahut zyada
      // upar ki koi wajah nahi honi chahiye.
      const sanityCap = Math.max(activity.price, minAmount, 1) * 20 + 5000;
      if (amount > sanityCap) {
        return res.status(400).json({
          success: false,
          message: "That amount looks too high, please double-check it",
        });
      }
      pricePerChild = amount;
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

    // Wohi bacha in sessions (single ya bundle ki koi bhi date) me pehle
    // se booked to nahi? - dusri bundle bookings bhi check hoti hain
    // kyunke unka bhi sessionId in hi dates par hota hai.
    const sessionIdsInvolved = sessionsToReserve.map((s) => s._id);
    const alreadyBooked = await Booking.findOne({
      activity: activityId,
      "children.child": { $in: uniqueChildIds },
      status: { $in: ["pending", "confirmed"] },
      $or: [
        { sessionId: { $in: sessionIdsInvolved } },
        { "bundleSessions.sessionId": { $in: sessionIdsInvolved } },
      ],
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
     *
     * Bundle ke case me EK HI update call me SAB sessions increment hoti
     * hain (arrayFilters se, har session ka apna alag identifier) - aur
     * filter me har session ka apna $elemMatch hota hai, is liye document
     * sirf tab match karta hai jab BUNDLE KI HAR EK session me seat bachi
     * ho. Ek bhi session full ho to poori booking fail ho jati hai - koi
     * partial reservation nahi hoti.
     */
    const arrayFilters = sessionsToReserve.map((s, i) => ({
      [`s${i}._id`]: s._id,
    }));
    const incFields = Object.fromEntries(
      sessionsToReserve.map((s, i) => [
        `sessions.$[s${i}].seatsBooked`,
        numberOfChildren,
      ]),
    );

    const reserved = await Activity.findOneAndUpdate(
      {
        _id: activityId,
        status: "active",
        $and: sessionsToReserve.map((s) => ({
          sessions: {
            $elemMatch: {
              _id: s._id,
              status: "scheduled",
              capacity: s.capacity, // capacity beech me badli to fail
              seatsBooked: { $lte: s.capacity - numberOfChildren },
            },
          },
        })),
      },
      { $inc: incFields },
      { new: true, arrayFilters },
    );

    if (!reserved) {
      const seatsLeft = Math.min(
        ...sessionsToReserve.map((s) =>
          Math.max(s.capacity - s.seatsBooked, 0),
        ),
      );

      return res.status(409).json({
        success: false,
        message:
          seatsLeft === 0
            ? bundle
              ? "Sorry, one of the dates in this bundle is now full"
              : "Sorry, this session is now full"
            : `Only ${seatsLeft} seat(s) left`,
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
     * SIBLING DISCOUNT: ab yeh PLATFORM ka faisla nahi - har instructor
     * apni class par khud decide karta hai ke sibling discount ho ya
     * nahi, aur kitne percent (activity.siblingDiscount, 0-50%,
     * activityController.js me hamesha sanitize/clamp hota hai).
     *
     * Kidventures ka 15% commission HAMESHA full (pre-discount) price par
     * calculate hota hai - is discount ka POORA cost instructor ki apni
     * earning se aata hai, platform ke commission se bilkul nahi
     * (client ke saath confirm shuda faisla). Safety clamp sirf itna hai
     * ke instructor ki earning kabhi negative na ho.
     *
     * Misaal (AED 175 ki class, 2 bachay, 15% commission, instructor ne
     * 10% sibling discount rakha hai):
     *   subtotalBeforeDiscount = 350     (175 × 2)
     *   commissionAmount       = 52.5    (15% of 350 - hamesha full price)
     *   discountAmount         = 35      (10% of 350, instructor ka apna faisla)
     *   subtotal (parent pays) = 315     (350 - 35)
     *   instructorEarning      = 262.5   (350 - 52.5 - 35, discount instructor
     *                                     ki earning se kata)
     *   totalAmount            = 315     (parent bilkul yehi deta hai)
     *
     * Sab kuch server par, database wali activity ke hisaab se calculate
     * hota hai - body se kuch nahi liya jata.
     * NOTE: yahan jaan boojh kar decimal round nahi kiya - jo bhi asli
     * number bane wohi rakha jata hai (koi Math.round nahi).
     */
    const subtotalBeforeDiscount = pricePerChild * numberOfChildren;
    const commissionPercent = getCommissionPercent();
    const commissionAmount = subtotalBeforeDiscount * (commissionPercent / 100);

    // Discount sirf 2+ bachon par, aur sirf agar is instructor ne apni
    // class ke liye on kar rakha hai.
    const hasSiblingDiscount =
      numberOfChildren > 1 && !!activity.siblingDiscount?.enabled;
    const discountPercent = hasSiblingDiscount
      ? activity.siblingDiscount.percent
      : 0;
    const rawDiscountAmount = hasSiblingDiscount
      ? subtotalBeforeDiscount * (discountPercent / 100)
      : 0;

    // Instructor ki earning discount se pehle hi.
    const instructorEarningBeforeDiscount =
      subtotalBeforeDiscount - commissionAmount;

    // Safety clamp: instructor ki earning kabhi negative na ho -
    // discount uski apni earning se zyada nahi kata ja sakta.
    const discountAmount = Math.min(
      rawDiscountAmount,
      instructorEarningBeforeDiscount,
    );

    const subtotal = subtotalBeforeDiscount - discountAmount;

    // Poora discount instructor ki earning se aata hai - commission par
    // koi asar nahi (commission hamesha full price par tay ho chuka).
    const instructorEarning = instructorEarningBeforeDiscount - discountAmount;

    const totalAmount = subtotal; // parent isse zyada kuch nahi deta

    /* -------------------------- 5. Booking -------------------------- */
    // Bundle ho to sab dates dikhane ke liye chronological order me
    // sort kar dete hain - pehli (earliest) date hi canonical
    // sessionId/sessionDate/startTime/endTime bantay hain (purana code
    // - listing sort, reminders, receipts - inhi fields ko padhta hai).
    const sortedSessions = [...sessionsToReserve].sort(
      (a, b) => new Date(a.date) - new Date(b.date),
    );
    const primarySession = sortedSessions[0];

    try {
      const booking = await Booking.create({
        parent: req.user._id,
        activity: activity._id,
        activityTitle: activity.title,
        instructor: activity.instructor,

        sessionId: primarySession._id,
        sessionDate: primarySession.date,
        startTime: primarySession.startTime,
        endTime: primarySession.endTime,

        ...(bundle && {
          bundleId: bundle._id,
          bundleTitle: bundle.title,
          bundleSessions: sortedSessions.map((s) => ({
            sessionId: s._id,
            date: s.date,
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        }),

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
      // Booking banane me masla ho gaya to reserve ki hui seats wapas chhor do
      // (bundle ki HAR session ki, agar bundle thi) - warna woh hamesha ke
      // liye block ho jatin.
      const decFields = Object.fromEntries(
        Object.entries(incFields).map(([key, val]) => [key, -val]),
      );
      await Activity.updateOne(
        { _id: activityId },
        { $inc: decFields },
        { arrayFilters },
      ).catch((err) =>
        // Error chupana nahi — yeh woh soorat hai jahan seat kisi ke kaam
        // aaye baghair block ho jati hai, aur kisi ko pata nahi chalta.
        console.error(
          `! Seat rollback failed — activity ${activityId}, session(s) ` +
            `${sessionIdsInvolved.join(",")}, ${numberOfChildren} seat(s): ${err.message}`,
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

    // Seats wapas chhor do taake koi aur book kar sake. Bundle booking ho to
    // uski HAR session ki seat release honi chahiye, na ke sirf primary
    // (canonical) sessionId ki — warna baqi dates hamesha ke liye block
    // rehtin.
    const sessionIdsToRelease =
      cancelled.bundleSessions && cancelled.bundleSessions.length > 0
        ? cancelled.bundleSessions.map((s) => s.sessionId)
        : [cancelled.sessionId];

    const releaseArrayFilters = sessionIdsToRelease.map((id, i) => ({
      [`s${i}._id`]: id,
    }));
    const releaseIncFields = Object.fromEntries(
      sessionIdsToRelease.map((id, i) => [
        `sessions.$[s${i}].seatsBooked`,
        -cancelled.numberOfChildren,
      ]),
    );

    const seatResult = await Activity.updateOne(
      {
        _id: cancelled.activity,
        $and: sessionIdsToRelease.map((id) => ({
          sessions: {
            $elemMatch: {
              _id: id,
              seatsBooked: { $gte: cancelled.numberOfChildren },
            },
          },
        })),
      },
      { $inc: releaseIncFields },
      { arrayFilters: releaseArrayFilters },
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
          `activity ${cancelled.activity}, session(s) ${sessionIdsToRelease.join(",")}`,
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

    // Bundle booking me is date ka sessionId primary na ho (i.e. bundle ki
    // pehli date na ho) to bhi wo bookingSessions me maujood hogi - dono
    // jagah check karo, warna bundle ke doosre din ki attendee list khali
    // dikhegi.
    const bookings = await Booking.find({
      activity: req.params.activityId,
      status: "confirmed",
      $or: [
        { sessionId: req.params.sessionId },
        { "bundleSessions.sessionId": req.params.sessionId },
      ],
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
    if (booking.bundleTitle) {
      row("Bundle", booking.bundleTitle);
    }
    if (booking.bundleSessions && booking.bundleSessions.length > 0) {
      // Bundle booking - har din ki apni date/time dikhao, sirf primary
      // (canonical) session nahi - warna parent ko lagega sirf ek din
      // book hua hai.
      booking.bundleSessions.forEach((s, i) => {
        row(`Date ${i + 1}`, fmtDate(s.date));
        row(
          `Time ${i + 1}`,
          `${s.startTime}${s.endTime ? " – " + s.endTime : ""}`,
        );
      });
    } else {
      row("Date", fmtDate(booking.sessionDate));
      row(
        "Time",
        `${booking.startTime}${booking.endTime ? " – " + booking.endTime : ""}`,
      );
    }
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
