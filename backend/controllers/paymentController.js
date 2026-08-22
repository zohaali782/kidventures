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

  // Stripe ko foran 200 de do (warna woh baar baar bhejta rahega),
  // kaam background me karo.
  res.json({ received: true });

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await onPaymentSucceeded(event.data.object);
        break;

      case "payment_intent.payment_failed":
        await onPaymentFailed(event.data.object);
        break;

      default:
        // baqi events se abhi koi kaam nahi
        break;
    }
  } catch (err) {
    console.error(`✗ Webhook handler error: ${err.message}`);
  }
};

/**
 * Payment kaamyab - booking confirm karo.
 */
const onPaymentSucceeded = async (paymentIntent) => {
  const bookingId = paymentIntent.metadata?.bookingId;
  if (!bookingId) return;

  const booking = await Booking.findById(bookingId);
  if (!booking) return;

  // Pehle se confirmed hai to dobara kuch na karo (webhook do baar aa sakta hai)
  if (booking.status === "confirmed" || booking.paymentStatus === "paid")
    return;

  booking.status = "confirmed";
  booking.paymentStatus = "paid";
  booking.reservationExpiresAt = undefined; // ab seat pakki hai
  await booking.save();

  // Class ke stats update
  await Activity.updateOne(
    { _id: booking.activity },
    {
      $inc: {
        "stats.totalBookings": 1,
        "stats.totalStudents": booking.numberOfChildren,
      },
    },
  ).catch(() => {});

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
    const maxRefundable = payment.amount - alreadyRefunded;

    const refundAmount = req.body.amount
      ? Number(req.body.amount)
      : maxRefundable;

    if (refundAmount <= 0 || refundAmount > maxRefundable) {
      return res.status(400).json({
        success: false,
        message: `Refund must be between 0 and ${maxRefundable} ${payment.currency}`,
      });
    }

    // Stripe par refund
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount: toFils(refundAmount),
      reason: "requested_by_customer",
    });

    // Record update
    payment.refunds.push({
      amount: refundAmount,
      reason: req.body.reason?.slice(0, 300),
      stripeRefundId: refund.id,
      issuedBy: req.user._id,
    });
    payment.totalRefunded = alreadyRefunded + refundAmount;
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
