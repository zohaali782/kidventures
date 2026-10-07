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
     * FLEXIBLE ("delegate") PRICING: agar instructor ne apni class par ye on
     * kar rakha hai, to fixed price ke bajaye parent jo amount bheje wahi
     * per-child price banti hai - lekin seat reserve hone se PEHLE hi
     * validate karna zaroori hai (warna invalid amount par bhi seat
     * atomically reserve ho chuki hogi aur wapas release karni parti).
     *
     * Ye bundle par bhi lagu hoti hai: us soorat me bundle ki apni price
     * sirf "suggested" (combined) amount ban jati hai, aur minAmount wahi
     * class wala floor rehta hai. Frontend bhi yehi dikhata hai (dekho
     * BookingPage.jsx ka suggestedPricePerChild).
     */
    const suggestedPrice = bundle ? bundle.price : activity.price;
    let pricePerChild = suggestedPrice;

    if (activity.flexiblePricing?.enabled) {
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
      const sanityCap = Math.max(suggestedPrice, minAmount, 1) * 20 + 5000;
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
     * (Airbnb-host style, Uber-rider-surcharge NAHI).
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
        sessionLabel: primarySession.label,

        ...(bundle && {
          bundleId: bundle._id,
          bundleTitle: bundle.title,
          bundleSessions: sortedSessions.map((s) => ({
            sessionId: s._id,
            date: s.date,
            startTime: s.startTime,
            endTime: s.endTime,
            label: s.label,
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
        // Error chupana nahi, yeh woh soorat hai jahan seat kisi ke kaam
        // aaye baghair block ho jati hai, aur kisi ko pata nahi chalta.
        console.error(
          `! Seat rollback failed, activity ${activityId}, session(s) ` +
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
 * Fundraiser booking kitni der tak bina tasdeeq ke seat roke rakh sakti hai.
 *
 * Aam booking me ye 15 minute hai, kyunke parent usi waqt card se payment
 * kar raha hota hai. Yahan parent ko pehle charity ki site par jana hai,
 * donate karna hai, phir WhatsApp par screenshot bhejna hai, aur phir
 * instructor ko usay dekh kar confirm karna hai. Ye sab 15 minute me nahi
 * hota, is liye poora din diya hai.
 */
const FUNDRAISER_HOLD_HOURS = 24;

/**
 * Dono fundraiser raaston ki mushtarak jaanch (parent khud bhare ya
 * instructor haath se likhe). Ghalti ho to { error } wapas karta hai,
 * warna saaf suthra data.
 *
 * Ek hi jagah rakhne ki wajah: seat reserve karne wali ganit nazuk hai,
 * aur do jagah copy ho jaye to ek jagah ki tabdeeli doosri jagah reh
 * jati hai.
 */
const prepareFundraiserBooking = async ({
  activityId,
  sessionIds,
  parentName,
  numberOfChildren,
  childNames,
}) => {
  if (!activityId || !Array.isArray(sessionIds) || sessionIds.length === 0) {
    return {
      error: { code: 400, message: "Please choose a class and at least one date" },
    };
  }

  const name = String(parentName || "").trim();
  if (!name) {
    return { error: { code: 400, message: "Please enter the parent's name" } };
  }

  /**
   * Number.isInteger ka check zaroori hai: Number("abc") = NaN hota hai
   * aur NaN ka har comparison false, yaani "NaN < 1" bhi false. Aisi
   * value aage seat reserve karne wali ganit ko kharab kar deti.
   */
  const kids = Number(numberOfChildren);
  if (!Number.isInteger(kids) || kids < 1 || kids > 10) {
    return {
      error: {
        code: 400,
        message: "Number of children must be a whole number between 1 and 10",
      },
    };
  }

  const activity = await Activity.findById(activityId);
  if (!activity) {
    return { error: { code: 404, message: "Class not found" } };
  }

  /**
   * Sirf fundraiser classes. Aam class par agar ye raasta khula hota to
   * koi bhi bina paise diye seats bhar sakta tha. Wahan payment ka apna
   * poora raasta mojood hai.
   */
  if (!activity.fundraiser?.enabled) {
    return {
      error: {
        code: 400,
        message: "This way of booking is only for charity fundraiser classes",
      },
    };
  }

  const wantedIds = [...new Set(sessionIds.map(String))];
  const sessionsToReserve = wantedIds
    .map((id) => activity.sessions.find((ses) => String(ses._id) === id))
    .filter(Boolean);

  if (sessionsToReserve.length !== wantedIds.length) {
    return {
      error: {
        code: 400,
        message: "One of the selected dates no longer exists on this class",
      },
    };
  }

  // Bachon ke naam ek line me bhi likhe ja sakte hain, comma se alag.
  // Naam marzi ke hain, lekin agar diye hain to tadaad se zyada nahi ho
  // sakte, warna seat ka hisaab aur naamon ki list chup chaap alag alag
  // ho jate.
  const names = String(childNames || "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);

  if (names.length > kids) {
    return {
      error: {
        code: 400,
        message: `You entered ${names.length} names but only ${kids} child${
          kids === 1 ? "" : "ren"
        }. Please check the count.`,
      },
    };
  }

  return { activity, sessionsToReserve, name, kids, names };
};

/**
 * Seats ko atomically rok leta hai, bilkul wohi tareeqa jo aam booking me
 * hai: check aur update ek hi database operation me, taake do log ek hi
 * lamhe me aakhri seat na le sakein. Ek bhi date full ho to kuch bhi
 * reserve nahi hota, aadhi booking nahi banti.
 */
const reserveFundraiserSeats = async ({ activity, sessionsToReserve, kids }) => {
  const arrayFilters = sessionsToReserve.map((ses, i) => ({
    [`s${i}._id`]: ses._id,
  }));
  const incFields = Object.fromEntries(
    sessionsToReserve.map((ses, i) => [`sessions.$[s${i}].seatsBooked`, kids]),
  );

  const reserved = await Activity.findOneAndUpdate(
    {
      _id: activity._id,
      $and: sessionsToReserve.map((ses) => ({
        sessions: {
          $elemMatch: {
            _id: ses._id,
            capacity: ses.capacity, // capacity beech me badli to fail
            seatsBooked: { $lte: ses.capacity - kids },
          },
        },
      })),
    },
    { $inc: incFields },
    { new: true, arrayFilters },
  );

  if (!reserved) {
    const seatsLeft = Math.min(
      ...sessionsToReserve.map((ses) =>
        Math.max(ses.capacity - ses.seatsBooked, 0),
      ),
    );
    return { ok: false, seatsLeft, incFields, arrayFilters };
  }

  return { ok: true, incFields, arrayFilters };
};

/**
 * Reserve ki hui seats wapas chhorta hai. Jab booking banane me koi masla
 * aa jaye to ye zaroori hai, warna woh seats kisi ke kaam aaye baghair
 * hamesha ke liye block ho jati hain aur kisi ko khabar nahi hoti.
 */
const releaseFundraiserSeats = async (activityId, incFields, arrayFilters) => {
  const decFields = Object.fromEntries(
    Object.entries(incFields).map(([key, val]) => [key, -val]),
  );

  await Activity.updateOne(
    { _id: activityId },
    { $inc: decFields },
    { arrayFilters },
  ).catch((err) =>
    console.error(
      `! Fundraiser seat rollback failed, activity ${activityId}: ${err.message}`,
    ),
  );
};

/** Booking ka woh hissa jo dono raaston me bilkul ek jaisa hai */
const fundraiserBookingFields = ({ activity, sessionsToReserve, kids, names }) => {
  const sortedSessions = [...sessionsToReserve].sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  );
  const primarySession = sortedSessions[0];

  return {
    source: "manual",

    activity: activity._id,
    activityTitle: activity.title,
    instructor: activity.instructor,

    sessionId: primarySession._id,
    sessionDate: primarySession.date,
    startTime: primarySession.startTime,
    endTime: primarySession.endTime,
    sessionLabel: primarySession.label,

    // Ek se zyada date ho to sab bundleSessions me, bilkul bundle booking
    // ki tarah. Seat release aur attendee list isi field ko padhti hain,
    // is liye cancel par saari dates ki seat wapas aati hai.
    ...(sortedSessions.length > 1 && {
      bundleSessions: sortedSessions.map((ses) => ({
        sessionId: ses._id,
        date: ses.date,
        startTime: ses.startTime,
        endTime: ses.endTime,
        label: ses.label,
      })),
    }),

    children: names.map((n) => ({ name: n })),
    numberOfChildren: kids,

    /**
     * Paisa Kidventures se guzra hi nahi, is liye yahan sab 0 hai. Agar
     * yahan class ki qeemat likh dete to admin ki revenue aur instructor
     * ki earnings dono me aisa paisa shamil ho jata jo kabhi hamare
     * account me aaya hi nahi.
     */
    pricePerChild: 0,
    subtotalBeforeDiscount: 0,
    discountPercent: 0,
    discountAmount: 0,
    subtotal: 0,
    currency: activity.currency,
    commissionPercent: 0,
    commissionAmount: 0,
    instructorEarning: 0,
    totalAmount: 0,
  };
};

/**
 * @desc    Charity fundraiser class ki seat parent khud rok leta hai
 * @route   POST /api/bookings/fundraiser
 * @access  Public, login ki zaroorat nahi
 *
 * Body: { activityId, sessionIds: [], parentName, parentPhone, parentEmail,
 *         numberOfChildren, childNames, notes }
 *
 * YE KYUN BANA
 *
 * Fundraiser class par payment charity ki apni website par hoti hai. Woh
 * humein kuch wapas nahi bhejti, is liye "paisa aa gaya" wali khabar
 * hum tak sirf WhatsApp ke screenshot se pohanchti hai. Us ka matlab ye
 * nikla ke parent jo kuch bhi chunta tha woh kahin save hi nahi hota tha,
 * aur instructor ko sab kuch dobara haath se likhna parta tha.
 *
 * Ab parent donation link par jane se PEHLE ye chhota form bharta hai.
 * Booking usi waqt ban jati hai aur seat us ke naam ruk jati hai, magar
 * "pending" halat me. Phir woh donate karta hai aur WhatsApp par
 * screenshot bhejta hai jis me booking number bhi likha hota hai.
 * Instructor sirf Confirm dabata hai.
 *
 * Seat {FUNDRAISER_HOLD_HOURS} ghante tak ruki rehti hai. Jo log form
 * bhar ke gayab ho jayen un ki seat khud ba khud khul jati hai, kyunke
 * yahan paymentStatus "unpaid" rakha hai aur releaseExpiredReservations
 * wahi dekh kar seat chhor deta hai. Tasdeeq ke baad hi woh "external"
 * banta hai.
 */
const reserveFundraiserSpot = async (req, res, next) => {
  try {
    const prepared = await prepareFundraiserBooking(req.body);

    if (prepared.error) {
      return res
        .status(prepared.error.code)
        .json({ success: false, message: prepared.error.message });
    }

    const { activity, sessionsToReserve, name, kids, names } = prepared;

    /**
     * Khula raasta hai, is liye class ka "active" hona zaroori hai. Draft,
     * pending ya suspended class ka id kisi ke haath lag jaye to us par
     * bahar se booking nahi honi chahiye. (Instructor wale haath se likhne
     * wale raaste par ye shart nahi, kyunke wo guzri hui ya archive ho
     * chuki class ka record bhi daal sakta hai.)
     */
    if (activity.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "This class is not open for bookings right now",
      });
    }

    const phone = String(req.body.parentPhone || "").trim();
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Please enter your WhatsApp number",
      });
    }

    /**
     * DOUBLE SUBMIT SE BACHAO.
     *
     * Button do dafa dab jaye, ya parent form bhar kar wapas aa kar phir
     * bhar de, to do bookings ban jatin aur dugni seats ruk jatin. Yahan
     * koi account nahi hota, is liye pehchan ke liye number hi hai.
     */
    const alreadyWaiting = await Booking.findOne({
      activity: activity._id,
      source: "manual",
      status: "pending",
      "offlineParent.phone": phone,
    }).select("bookingNumber");

    if (alreadyWaiting) {
      return res.status(409).json({
        success: false,
        message:
          "You already have a spot held on this class. Check your WhatsApp, " +
          `your booking number is ${alreadyWaiting.bookingNumber}.`,
        bookingNumber: alreadyWaiting.bookingNumber,
      });
    }

    const { ok, seatsLeft, incFields, arrayFilters } =
      await reserveFundraiserSeats({ activity, sessionsToReserve, kids });

    if (!ok) {
      return res.status(409).json({
        success: false,
        message:
          seatsLeft === 0
            ? "Sorry, one of these dates is now full"
            : `Only ${seatsLeft} seat(s) left on one of these dates`,
        seatsAvailable: seatsLeft,
      });
    }

    try {
      const booking = await Booking.create({
        ...fundraiserBookingFields({ activity, sessionsToReserve, kids, names }),

        offlineParent: {
          name,
          phone: phone.slice(0, 40),
          email: String(req.body.parentEmail || "").trim().slice(0, 160),
        },

        // Tasdeeq hone tak "pending" aur "unpaid". Isi se seat khud
        // chhutti hai agar parent donate hi na kare.
        status: "pending",
        paymentStatus: "unpaid",
        reservationExpiresAt: new Date(
          Date.now() + FUNDRAISER_HOLD_HOURS * 60 * 60 * 1000,
        ),

        parentNotes: String(req.body.notes || "").slice(0, 500),
      });

      res.status(201).json({
        success: true,
        message: `Your spot is held for ${FUNDRAISER_HOLD_HOURS} hours. Please donate and send your screenshot on WhatsApp.`,
        bookingNumber: booking.bookingNumber,
        booking,
      });
    } catch (bookingError) {
      await releaseFundraiserSeats(activity._id, incFields, arrayFilters);
      throw bookingError;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Charity fundraiser class ki booking haath se likhna
 * @route   POST /api/bookings/manual
 * @access  Instructor (apni class) / Admin
 *
 * Body: { activityId, sessionIds: [], parentName, parentPhone, parentEmail,
 *         numberOfChildren, childNames, notes }
 *
 * Ye raasta tab ke liye hai jab parent ne form na bhara ho, misaal ke taur
 * par seedha WhatsApp par message kar diya ho, ya booking us waqt ki ho jab
 * ye form mojood hi nahi tha. Instructor ne screenshot apni aankhon se dekh
 * liya hai, is liye ye booking seedha confirmed banti hai.
 */
const createManualBooking = async (req, res, next) => {
  try {
    const prepared = await prepareFundraiserBooking(req.body);

    if (prepared.error) {
      return res
        .status(prepared.error.code)
        .json({ success: false, message: prepared.error.message });
    }

    const { activity, sessionsToReserve, name, kids, names } = prepared;

    const isAdmin = req.user.role === "admin";
    const isOwner =
      activity.instructor?.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res
        .status(403)
        .json({ success: false, message: "This is not your class" });
    }

    const { ok, seatsLeft, incFields, arrayFilters } =
      await reserveFundraiserSeats({ activity, sessionsToReserve, kids });

    if (!ok) {
      return res.status(409).json({
        success: false,
        message:
          seatsLeft === 0
            ? "One of these dates is already full"
            : `Only ${seatsLeft} seat(s) left on one of these dates`,
        seatsAvailable: seatsLeft,
      });
    }

    try {
      const booking = await Booking.create({
        ...fundraiserBookingFields({ activity, sessionsToReserve, kids, names }),

        recordedBy: req.user._id,
        offlineParent: {
          name,
          phone: String(req.body.parentPhone || "").trim().slice(0, 40),
          email: String(req.body.parentEmail || "").trim().slice(0, 160),
        },

        // Instructor screenshot dekh chuka hai, is liye seedha confirmed
        status: "confirmed",
        paymentStatus: "external",

        parentNotes: String(req.body.notes || "").slice(0, 500),
      });

      res.status(201).json({
        success: true,
        message: "Booking added. The seats are now reserved.",
        booking,
      });
    } catch (bookingError) {
      await releaseFundraiserSeats(activity._id, incFields, arrayFilters);
      throw bookingError;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Fundraiser bookings jo tasdeeq ka intezar kar rahi hain
 * @route   GET /api/bookings/fundraiser/pending
 * @access  Instructor (apni classes) / Admin
 *
 * getInstructorBookings jaan boojh kar "pending" bookings nahi dikhati,
 * kyunke aam pending booking ka matlab hai "paisa abhi aaya hi nahi" aur
 * us ke bachon ke naam aur allergy notes instructor ko nahi dikhne
 * chahiyen. Yahan maamla alag hai: ye wohi bookings hain jo instructor ne
 * khud confirm karni hain, aur sirf fundraiser classes ki hain.
 */
const getPendingFundraiserBookings = async (req, res, next) => {
  try {
    const filter = {
      source: "manual",
      status: "pending",
    };

    // Admin sab dekh sakta hai, instructor sirf apni classes ki
    if (req.user.role !== "admin") {
      filter.instructor = req.user._id;
    }

    const bookings = await Booking.find(filter)
      .populate("activity", "title slug")
      .sort({ createdAt: 1 });

    res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Fundraiser booking ki payment confirm karna
 * @route   PUT /api/bookings/fundraiser/:id/confirm
 * @access  Instructor (apni class) / Admin
 *
 * Instructor ne WhatsApp par donation ka screenshot dekh liya, ab seat
 * pakki ho jati hai: reservationExpiresAt hat jata hai (warna cleanup
 * usay cancel kar deta) aur paymentStatus "external" ban jata hai, jis ka
 * matlab hai paisa charity ke paas gaya, hamare paas nahi.
 */
const confirmFundraiserBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking || booking.source !== "manual") {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    const isAdmin = req.user.role === "admin";
    const isOwner =
      booking.instructor?.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res
        .status(403)
        .json({ success: false, message: "This is not your class" });
    }

    if (booking.status === "confirmed") {
      return res.status(400).json({
        success: false,
        message: "This booking is already confirmed",
      });
    }

    /**
     * ATOMIC: shart update ke andar hai. Agar in do lamhon ke beech cleanup
     * ne seat chhor kar booking cancel kar di (24 ghante poore ho gaye), to
     * ye update match hi nahi karegi aur hum cancelled booking ko dobara
     * zinda nahi karenge, jis ki seat ja chuki hoti hai.
     */
    const confirmed = await Booking.findOneAndUpdate(
      { _id: booking._id, status: "pending" },
      {
        $set: {
          status: "confirmed",
          paymentStatus: "external",
          recordedBy: req.user._id,
        },
        $unset: { reservationExpiresAt: "" },
      },
      { new: true },
    );

    if (!confirmed) {
      return res.status(409).json({
        success: false,
        message:
          "This spot expired and the seat was released. Please add the booking again.",
      });
    }

    res.json({
      success: true,
      message: "Booking confirmed. The seat is now theirs.",
      booking: confirmed,
    });
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
     * Instructor ko sirf confirmed bookings dikhani chahiyen, "pending"
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
      /**
       * Email bhi chahiye: online class ka Zoom link instructor ko khud
       * parent tak pohanchana hota hai, aur sirf number se email nahi
       * bheji ja sakti. (Fundraiser booking me account hi nahi hota, wahan
       * naam aur number offlineParent me hote hain.)
       */
      .populate("parent", "name email phone")
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

    // ACCESS CHECK - teen me se koi ek hona zaroori hai.
    // Manual (fundraiser) booking ka koi parent account hota hi nahi, is
    // liye optional chaining - warna yahan null par crash hota tha.
    const userId = req.user._id.toString();
    const isParent = booking.parent?._id?.toString() === userId;
    const isInstructor = booking.instructor._id.toString() === userId;
    const isAdmin = req.user.role === "admin";

    if (!isParent && !isInstructor && !isAdmin) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    /**
     * ONLINE CLASS KA JOINING LINK.
     *
     * Sirf us booking ke sath jata hai jo confirmed ho. Pending booking
     * ka matlab hai paisa abhi aaya hi nahi, aur cancelled ka matlab seat
     * ja chuki, dono surton me link nahi milna chahiye warna koi bhi seat
     * reserve kar ke, bina paise diye, link le kar class me baith jata.
     *
     * Field model me "select: false" hai, is liye alag se maanga ja raha
     * hai. Class ka format online na ho to kuch nahi bhejte.
     */
    let onlineLink = "";

    if (booking.status === "confirmed" || booking.status === "completed") {
      const activityDoc = await Activity.findById(
        booking.activity?._id || booking.activity,
      )
        .select("+location.onlineLink format")
        .lean();

      if (activityDoc?.format === "online") {
        onlineLink = activityDoc.location?.onlineLink || "";
      }
    }

    res.json({ success: true, booking, onlineLink });
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

    const userId = req.user._id.toString();
    const isParent = booking.parent?.toString() === userId;
    const isAdmin = req.user.role === "admin";

    /**
     * Manual (fundraiser) booking kisi parent account ki nahi hoti, usay
     * cancel karne wala wohi instructor hona chahiye jiski class hai,
     * warna koi usay cancel hi nahi kar pata.
     */
    const isOwnInstructor =
      booking.source === "manual" &&
      booking.instructor?.toString() === userId;

    if (!isParent && !isAdmin && !isOwnInstructor) {
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
     * REFUND TIER, site ke Refund & Cancellation page wali policy:
     *   48h+     -> full refund
     *   24h-48h  -> partial ho sakta hai (provider ki policy par)
     *   24h se kam -> aam tor par kuch nahi
     *
     * Asli paisa yahan wapas nahi hota, cancelBooking sirf seat free karta
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
     * us confirmation ko MITA deta, paise kat jate aur booking cancelled
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
            cancelledBy: isAdmin
              ? "admin"
              : isOwnInstructor
                ? "instructor"
                : "parent",
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
    // (canonical) sessionId ki, warna baqi dates hamesha ke liye block
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
        `! Seat release error, booking ${cancelled.bookingNumber}: ${err.message}`,
      );
      return null;
    });

    // Pehle yahan .catch(() => {}) tha, seat block ho jati aur kisi ko
    // pata na chalta.
    if (seatResult && seatResult.modifiedCount === 0) {
      console.error(
        `! Seat release failed, booking ${cancelled.bookingNumber}, ` +
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
    const attendees = bookings.flatMap((booking) => {
      /**
       * BUGFIX: pehle seedha booking.children par map hota tha. Aam booking
       * me har bache ka record hota hai, lekin fundraiser wali booking me
       * naam dena lazmi nahi. Naam na diye hon to children khali hota hai,
       * aur map khali list deta, yaani wo bachay attendee list me nazar hi
       * na aate halanke un ki seats ja chuki hoti hain. Instructor ginti
       * kam dekh kar pareshan hota.
       *
       * Ab naam na hon to numberOfChildren ke barabar khaali rows banti
       * hain, taake ginti hamesha seats se mel khaye.
       */
      const named = booking.children || [];
      const total = Math.max(booking.numberOfChildren || 0, named.length, 1);

      // Jitne naam diye hain wo, aur baqi seats ke liye khaali rows, taake
      // ginti hamesha numberOfChildren ke barabar rahe. (Fundraiser form me
      // 2 bachon ke liye sirf 1 naam likhna bhi jaiz hai.)
      const rows = Array.from({ length: total }, (_, i) => named[i] || {});

      return rows.map((child) => ({
        name: child.name || "Name not given",
        age: child.age,
        allergies: child.allergies || "None",
        // Manual booking par parent account nahi hota, naam/number
        // offlineParent me hote hain
        parentName: booking.parent?.name || booking.offlineParent?.name,
        parentPhone: booking.parent?.phone || booking.offlineParent?.phone,
        bookingNumber: booking.bookingNumber,
      }));
    });

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
    const isParent = booking.parent?._id?.toString() === userId;
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
    row("Instructor", booking.instructor?.name || "-");
    if (booking.bundleTitle) {
      row("Bundle", booking.bundleTitle);
    }
    if (booking.bundleSessions && booking.bundleSessions.length > 0) {
      // Bundle booking - har din ki apni date/time dikhao, sirf primary
      // (canonical) session nahi - warna parent ko lagega sirf ek din
      // book hua hai.
      booking.bundleSessions.forEach((s, i) => {
        row(s.label ? `Date ${i + 1} (${s.label})` : `Date ${i + 1}`, fmtDate(s.date));
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
        "Kidventures, Dubai, UAE. For any questions, contact us through the website.",
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
  createManualBooking,
  reserveFundraiserSpot,
  getPendingFundraiserBookings,
  confirmFundraiserBooking,
  getMyBookings,
  getInstructorBookings,
  getBookingById,
  cancelBooking,
  getSessionAttendees,
  getBookingReceipt,
};
