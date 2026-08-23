const stripe = require("../config/stripe");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Activity = require("../models/Activity");
const { sendEmail } = require("../utils/sendEmail");
const tpl = require("../utils/emailTemplates");

/**
 * Stripe amounts "smallest unit" me hote hain. AED ke liye fils
 * (1 AED = 100 fils). To 138 AED = 13800 fils.
 */
const toFils = (aed) => Math.round(aed * 100);

/** Paisa hamesha 2 decimal par — warna 87.49999999 jaisi rakam ban jati hai. */
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * @desc    Payment shuru karna - Stripe PaymentIntent banata hai
 * @route   POST /api/payments/create-intent
 * @access  Parent
 *
 * Body: { bookingId }
 *
 * Frontend ko "clientSecret" milta hai jis se woh Stripe ka card
 * form dikhata hai. Card ki tafseel kabhi hamare server par nahi aati -
 * seedha parent ke browser se Stripe ke paas jati hai.
 */
const createPaymentIntent = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res
        .status(400)
        .json({ success: false, message: "Booking ID is required" });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    // OWNERSHIP: sirf apni booking ka payment
    if (booking.parent.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Not your booking" });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `This booking is already ${booking.status}`,
      });
    }

    if (booking.paymentStatus === "paid") {
      return res
        .status(400)
        .json({ success: false, message: "This booking is already paid" });
    }

    // Reservation expire to nahi ho gayi?
    if (
      booking.reservationExpiresAt &&
      booking.reservationExpiresAt < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "Your seat reservation has expired. Please book again.",
      });
    }

    /**
     * Ek hi booking par baar baar naya intent na bane - agar pehle se
     * hai to wohi wapas do. Warna har "Pay" click par naya intent banta.
     */
    let payment = await Payment.findOne({
      booking: booking._id,
      status: { $in: ["pending", "processing"] },
    });

    let paymentIntent;

    if (payment?.stripePaymentIntentId) {
      paymentIntent = await stripe.paymentIntents.retrieve(
        payment.stripePaymentIntentId,
      );

      // Agar rakam badal gayi (nahi honi chahiye) to naya banega
      if (paymentIntent.amount !== toFils(booking.totalAmount)) {
        paymentIntent = null;
      }
    }

    if (!paymentIntent) {
      paymentIntent = await stripe.paymentIntents.create({
        amount: toFils(booking.totalAmount),
        currency: (booking.currency || "AED").toLowerCase(),
        // metadata webhook me kaam aati hai - kaunsi booking hai
        metadata: {
          bookingId: booking._id.toString(),
          bookingNumber: booking.bookingNumber,
          parentId: booking.parent.toString(),
        },
        automatic_payment_methods: { enabled: true },
      });

      // Payment record banao ya update karo
      if (!payment) {
        payment = new Payment({
          booking: booking._id,
          parent: booking.parent,
          instructor: booking.instructor,
          amount: booking.totalAmount,
          currency: booking.currency,
          commissionAmount: booking.commissionAmount,
          instructorAmount: booking.instructorEarning,
        });
      }

      payment.stripePaymentIntentId = paymentIntent.id;
      payment.status = "pending";
      await payment.save();

      booking.payment = payment._id;
      await booking.save();
    }

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      amount: booking.totalAmount,
      currency: booking.currency,
      bookingNumber: booking.bookingNumber,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Stripe webhook - payment ka asli faisla yahan hota hai
 * @route   POST /api/payments/webhook
 * @access  Public (magar Stripe ki signature se verify hota hai)
 *
 * YE SAB SE AHEM SECURITY POINT HAI:
 *
 * Booking sirf yahan confirm hoti hai - frontend ke "payment ho gaya"
 * kehne par NAHI. Kyunke frontend jhoot bol sakta hai. Stripe seedha
 * hamare server se baat karta hai aur har message par apni signature
 * lagata hai, jo sirf hamare webhook secret se verify hoti hai.
 *
 * Yani koi banda "booking confirm kar do" ki jaali request nahi bhej
 * sakta - uske paas Stripe ki signature nahi hogi.
 *
 * NOTE: is route ko RAW body chahiye (JSON parse nahi hona chahiye) -
 * server.js me iska khaas intezam hai.
 */
const handleWebhook = async (req, res) => {
  const signature = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body, // raw buffer
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error(`✗ Webhook signature verification failed: ${err.message}`);
    // 400 - Stripe ko batao ke ye message reject hua
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  /**
   * ZAROORI: pehle kaam, phir 200.
   *
   * Pehle yahan 200 foran bhej diya jata tha aur kaam baad me hota tha.
   * Agar us kaam me DB error aa jata (connection blip waghera), to Stripe
   * ko lagta ke sab theek hai aur woh DOBARA nahi bhejta — parent ka paisa
   * kat chuka hota aur booking kabhi confirm na hoti.
   *
   * DB writes chhoti hain (Stripe 20+ second deta hai). Emails phir bhi
   * fire-and-forget hain, to woh response ko nahi rokte.
   *
   * Error par 500 dete hain taake Stripe khud dobara koshish kare.
   */
  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await onPaymentSucceeded(event.data.object);
        break;

      case "payment_intent.payment_failed":
        await onPaymentFailed(event.data.object);
        break;

      /**
       * Refund kahin se bhi hua ho — admin dashboard se, Stripe Dashboard
       * se, ya Stripe ne khud dispute par kiya ho — yeh event aata hai.
       *
       * Is ke baghair Stripe Dashboard se kiya gaya refund hamare database
       * ko pata hi nahi chalta: booking "paid" dikhti rehti, Refunds tab me
       * pari rehti, aur instructor ko us booking ka payout ho jata jis ka
       * paisa parent ko wapas ja chuka hai.
       */
      case "charge.refunded":
        await onChargeRefunded(event.data.object);
        break;

      default:
        // baqi events se abhi koi kaam nahi
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error(`✗ Webhook handler error (${event.type}): ${err.message}`);
    res.status(500).json({ received: false });
  }
};

/**
 * Payment kaamyab - booking confirm karo.
 */
const onPaymentSucceeded = async (paymentIntent) => {
  const bookingId = paymentIntent.metadata?.bookingId;
  if (!bookingId) return;

  /**
   * ATOMIC: booking sirf tab confirm hoti hai jab woh AB BHI pending ho.
   *
   * Pehle yahan sirf yeh dekha jata tha ke booking already confirmed/paid
   * to nahi. Us se ek khatarnak surat nikalti thi: parent ne pending booking
   * cancel kar di (seats chhor di gayin), phir Stripe ka webhook aaya, aur
   * cancelled booking dobara "confirmed" ban gayi — jabke seat kisi aur ko
   * ja chuki hoti. Session oversold, aur kisi ko khabar nahi.
   *
   * Ab shart update ke andar hi hai: pending nahi to haath hi nahi lagta.
   */
  const booking = await Booking.findOneAndUpdate(
    { _id: bookingId, status: "pending", paymentStatus: { $ne: "paid" } },
    {
      $set: { status: "confirmed", paymentStatus: "paid" },
      $unset: { reservationExpiresAt: "" }, // ab seat pakki hai
    },
    { new: true },
  );

  if (!booking) {
    // Update match nahi hui — do wajuhat ho sakti hain
    const existing = await Booking.findById(bookingId);

    if (!existing) return;

    // (a) Yehi webhook pehle bhi aa chuka tha — Stripe dobara bhejta hai
    if (existing.status === "confirmed" || existing.paymentStatus === "paid") {
      return;
    }

    // (b) Booking cancel/expire ho chuki thi aur us ke baad paisa aa gaya.
    //     Yeh paisa parent ko wapas karna hoga — insaan ko dekhna parega.
    console.error(
      `! PAYMENT RECEIVED FOR ${existing.status.toUpperCase()} BOOKING ` +
        `${existing.bookingNumber} — refund required (intent ${paymentIntent.id})`,
    );

    await Payment.updateOne(
      { stripePaymentIntentId: paymentIntent.id },
      {
        $set: {
          status: "succeeded",
          paidAt: new Date(),
          needsAttention: true,
          attentionReason: `Booking was "${existing.status}" when the payment arrived. Refund the parent.`,
        },
      },
    );

    return;
  }

  // Class ke stats update
  const statsResult = await Activity.updateOne(
    { _id: booking.activity },
    {
      $inc: {
        "stats.totalBookings": 1,
        "stats.totalStudents": booking.numberOfChildren,
      },
    },
  ).catch((err) => {
    // Pehle yahan .catch(() => {}) tha — error chup chaap gum ho jata tha
    console.error(
      `! Stats update failed for activity ${booking.activity}: ${err.message}`,
    );
    return null;
  });

  if (statsResult && statsResult.matchedCount === 0) {
    console.error(`! Stats update matched no activity: ${booking.activity}`);
  }

  // Payment record update
  const charge = paymentIntent.latest_charge;
  const update = {
    status: "succeeded",
    paidAt: new Date(),
  };

  if (typeof charge === "string") {
    update.stripeChargeId = charge;
  }

  await Payment.updateOne(
    { stripePaymentIntentId: paymentIntent.id },
    { $set: update },
  );

  // Confirmation emails - parent ko receipt, instructor ko new-booking alert.
  // Fire-and-forget: Stripe ko response upar hi bhej diya gaya hai.
  sendBookingEmails(booking._id).catch((e) =>
    console.error("[email] booking emails failed:", e.message),
  );

  console.log(`✓ Booking confirmed: ${booking.bookingNumber}`);
};

/**
 * Confirmation emails - parent ko receipt, instructor ko new-booking alert.
 * Duplicate na jayen isliye emailsSent.confirmation flag check karte hain.
 */
const sendBookingEmails = async (bookingId) => {
  const booking = await Booking.findById(bookingId)
    .populate("parent", "name email")
    .populate("instructor", "name email");

  if (!booking || booking.emailsSent?.confirmation) return;

  const parentMail = tpl.bookingConfirmedParent({
    parentName: booking.parent?.name,
    booking,
  });
  await sendEmail({ to: booking.parent?.email, ...parentMail });

  const instructorMail = tpl.newBookingInstructor({
    instructorName: booking.instructor?.name,
    booking,
  });
  await sendEmail({ to: booking.instructor?.email, ...instructorMail });

  booking.emailsSent = { ...booking.emailsSent, confirmation: true };
  await booking.save();
};

/**
 * Refund hua — chahe hamare admin panel se ya Stripe Dashboard se.
 *
 * Stripe har charge par `amount_refunded` (fils me) bhejta hai — yaani ab
 * tak KUL kitna refund ho chuka. Hum usi ko sach mante hain, kyunki wohi
 * asal paise ka record hai.
 *
 * Yeh handler idempotent hai: wohi event dobara aaye to kuch nahi badalta.
 */
const onChargeRefunded = async (charge) => {
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;

  if (!paymentIntentId) return;

  const payment = await Payment.findOne({
    stripePaymentIntentId: paymentIntentId,
  });

  if (!payment) {
    console.error(
      `! charge.refunded for unknown payment intent ${paymentIntentId}`,
    );
    return;
  }

  // Stripe fils me deta hai, hum AED me rakhte hain
  const totalRefunded = round2((charge.amount_refunded || 0) / 100);

  // Pehle se yehi rakam record hai to kuch karne ki zaroorat nahi
  // (duplicate webhook, ya hamare apne admin refund ka echo)
  if (round2(payment.totalRefunded || 0) === totalRefunded) return;

  const fullRefund = totalRefunded >= round2(payment.amount);

  payment.totalRefunded = totalRefunded;
  payment.status = fullRefund ? "refunded" : "partially_refunded";

  // Refund ho gaya to instructor ko payout nahi hona chahiye
  if (fullRefund && payment.payoutStatus === "pending") {
    payment.payoutStatus = "cancelled";
    payment.payoutNote = "Booking was fully refunded";
  }

  await payment.save();

  /* ----------------------------- Booking ----------------------------- */
  const booking = await Booking.findById(payment.booking);
  if (!booking) return;

  booking.paymentStatus = fullRefund ? "refunded" : "partially_refunded";

  if (fullRefund && !["cancelled", "refunded"].includes(booking.status)) {
    booking.status = "refunded";

    // Seat wapas chhor do — sirf tab jab booking pehle cancel na hui ho
    // (cancel ke waqt seat pehle hi chhori ja chuki hoti hai)
    const seatResult = await Activity.updateOne(
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
    ).catch((err) => {
      console.error(
        `! Seat release error on webhook refund — ${booking.bookingNumber}: ${err.message}`,
      );
      return null;
    });

    if (seatResult && seatResult.modifiedCount === 0) {
      console.error(
        `! Seat release failed on webhook refund — ${booking.bookingNumber}`,
      );
    }
  }

  // Refund ho chuka hai to admin ki qatar me pari rehne ka koi matlab nahi
  if (booking.cancellation?.refundStatus === "pending_review") {
    booking.cancellation.refundStatus = "processed";
    booking.cancellation.reviewNote =
      "Auto-resolved: refund detected from Stripe";
  }

  await booking.save();

  console.log(
    `✓ Refund synced from Stripe: ${booking.bookingNumber} — ` +
      `${totalRefunded} ${payment.currency} (${fullRefund ? "full" : "partial"})`,
  );
};

/**
 * Payment fail - seat wapas chhor do.
 */
const onPaymentFailed = async (paymentIntent) => {
  const bookingId = paymentIntent.metadata?.bookingId;
  if (!bookingId) return;

  const booking = await Booking.findById(bookingId);
  if (!booking || booking.status !== "pending") return;

  booking.paymentStatus = "failed";
  await booking.save();

  await Payment.updateOne(
    { stripePaymentIntentId: paymentIntent.id },
    {
      $set: {
        status: "failed",
        failureReason:
          paymentIntent.last_payment_error?.message || "Payment failed",
      },
    },
  );

  // Seat abhi wapas nahi chhorte - parent dobara try kar sakta hai
  // jab tak reservation expire na ho. Cron expire par khud chhod dega.
  console.log(`! Payment failed for booking: ${booking.bookingNumber}`);
};

/**
 * @desc    Admin refund kare
 * @route   POST /api/payments/:bookingId/refund
 * @access  Admin
 *
 * Body: { amount (optional - poora ya kuch hissa), reason }
 */
const refundPayment = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    if (
      booking.paymentStatus !== "paid" &&
      booking.paymentStatus !== "partially_refunded"
    ) {
      return res.status(400).json({
        success: false,
        message: "This booking has no completed payment to refund",
      });
    }

    const payment = await Payment.findOne({
      booking: booking._id,
      status: { $in: ["succeeded", "partially_refunded"] },
    });

    if (!payment?.stripePaymentIntentId) {
      return res
        .status(404)
        .json({ success: false, message: "Payment record not found" });
    }

    // Kitna refund - agar amount nahi diya to poora bacha hua
    const alreadyRefunded = payment.totalRefunded || 0;
    const maxRefundable = round2(payment.amount - alreadyRefunded);

    let refundAmount;

    if (req.body.amount === undefined || req.body.amount === null || req.body.amount === "") {
      refundAmount = maxRefundable;
    } else {
      refundAmount = Number(req.body.amount);

      /**
       * Number.isFinite ka check ZAROORI hai.
       *
       * Number("abc") = NaN, aur NaN ka har comparison false hota hai —
       * yaani "NaN <= 0" bhi false aur "NaN > max" bhi false. Pehle wale
       * code me aisi rakam dono checks paar kar jati thi aur Stripe ko
       * NaN chala jata tha.
       */
      if (!Number.isFinite(refundAmount)) {
        return res
          .status(400)
          .json({ success: false, message: "Refund amount must be a number" });
      }

      refundAmount = round2(refundAmount);
    }

    if (refundAmount <= 0 || refundAmount > maxRefundable) {
      return res.status(400).json({
        success: false,
        message: `Refund must be between 0 and ${maxRefundable} ${payment.currency}`,
      });
    }

    /**
     * DOUBLE REFUND SE BACHAO.
     *
     * Do admin (ya ek admin ka double click) ek sath refund kar dein to
     * dono ka maxRefundable check pass ho sakta hai aur Stripe par do
     * refunds chali jati hain — asal paisa dobara wapas.
     *
     * Is liye Stripe call se PEHLE totalRefunded ko atomically barha kar
     * jagah "reserve" karte hain. Yeh update sirf tab match karti hai jab
     * totalRefunded ab bhi wohi ho jo humne parha tha.
     */
    const reserved = await Payment.findOneAndUpdate(
      { _id: payment._id, totalRefunded: alreadyRefunded },
      { $set: { totalRefunded: round2(alreadyRefunded + refundAmount) } },
      { new: true },
    );

    if (!reserved) {
      return res.status(409).json({
        success: false,
        message:
          "Another refund for this booking is already in progress. Please refresh and check.",
      });
    }

    // Stripe par refund
    let refund;
    try {
      refund = await stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        amount: toFils(refundAmount),
        reason: "requested_by_customer",
      });
    } catch (stripeError) {
      // Stripe ne mana kar diya — reserve ki hui rakam wapas chhor do,
      // warna aage ke jaiz refunds block ho jayenge.
      await Payment.updateOne(
        { _id: payment._id },
        { $set: { totalRefunded: alreadyRefunded } },
      ).catch((e) =>
        console.error(
          `! Refund rollback failed for payment ${payment._id}: ${e.message}`,
        ),
      );
      throw stripeError;
    }

    // Record update
    payment.refunds.push({
      amount: refundAmount,
      reason: req.body.reason?.slice(0, 300),
      stripeRefundId: refund.id,
      issuedBy: req.user._id,
    });
    payment.totalRefunded = reserved.totalRefunded;
    payment.status =
      payment.totalRefunded >= payment.amount
        ? "refunded"
        : "partially_refunded";
    await payment.save();

    // Booking update
    const fullRefund = payment.totalRefunded >= payment.amount;
    booking.paymentStatus = fullRefund ? "refunded" : "partially_refunded";

    if (fullRefund && booking.status !== "cancelled") {
      booking.status = "refunded";

      // Seats wapas chhod do
      const seatResult = await Activity.updateOne(
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
      ).catch((err) => {
        console.error(
          `! Seat release error on refund — booking ${booking.bookingNumber}: ${err.message}`,
        );
        return null;
      });

      // Pehle yahan .catch(() => {}) tha — seat hamesha ke liye block ho
      // jati aur kisi ko pata na chalta.
      if (seatResult && seatResult.modifiedCount === 0) {
        console.error(
          `! Seat release failed on refund — booking ${booking.bookingNumber}, ` +
            `activity ${booking.activity}, session ${booking.sessionId}`,
        );
      }
    }

    await booking.save();

    // Refund confirmation email - Stripe/DB update ho chuke, response se pehle
    // await kar rahe hain kyunke ye admin-triggered hai (webhook ki tarah
    // latency-sensitive nahi), lekin fail hone par bhi refund process rukna
    // nahi chahiye - isliye catch laga hai.
    try {
      const parentUser = await require("../models/User")
        .findById(booking.parent)
        .select("name email");
      await sendEmail({
        to: parentUser?.email,
        ...tpl.refundConfirmed({
          parentName: parentUser?.name,
          booking,
          refundAmount,
        }),
      });
    } catch (e) {
      console.error("[email] refund email failed:", e.message);
    }

    res.json({
      success: true,
      message: `Refunded ${refundAmount} ${payment.currency}`,
      totalRefunded: payment.totalRefunded,
      booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Instructor / admin ke liye earnings summary
 * @route   GET /api/payments/earnings
 * @access  Instructor
 */
const getEarnings = async (req, res, next) => {
  try {
    const instructorId = req.user._id;

    const payments = await Payment.find({
      instructor: instructorId,
      status: { $in: ["succeeded", "partially_refunded"] },
    })
      .populate("booking", "bookingNumber activityTitle sessionDate")
      .sort({ createdAt: -1 });

    const totalEarned = payments.reduce(
      (sum, p) => sum + p.instructorAmount,
      0,
    );
    const pending = payments
      .filter((p) => p.payoutStatus === "pending")
      .reduce((sum, p) => sum + p.instructorAmount, 0);
    const paidOut = payments
      .filter((p) => p.payoutStatus === "paid")
      .reduce((sum, p) => sum + p.instructorAmount, 0);

    res.json({
      success: true,
      summary: {
        totalEarned: Math.round(totalEarned * 100) / 100,
        pendingPayout: Math.round(pending * 100) / 100,
        paidOut: Math.round(paidOut * 100) / 100,
        currency: "AED",
      },
      count: payments.length,
      payments,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPaymentIntent,
  handleWebhook,
  refundPayment,
  getEarnings,
};
