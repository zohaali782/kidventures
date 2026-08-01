const Booking = require("../models/Booking");
const Activity = require("../models/Activity");

/**
 * Expire hui reservations ki seats wapas chhodta hai.
 *
 * Jab parent booking karta hai to 15 minute ke liye seat rukti hai.
 * Agar us dauran payment na ho, to ye function woh seat wapas free
 * kar deta hai taake koi aur book kar sake.
 *
 * server.js me har 2 minute baad chalta hai.
 */
const releaseExpiredReservations = async () => {
  try {
    const now = new Date();

    // Woh bookings jo abhi tak pending hain aur jinki reservation guzar chuki
    const expired = await Booking.find({
      status: "pending",
      paymentStatus: { $in: ["unpaid", "failed"] },
      reservationExpiresAt: { $lt: now },
    }).limit(100);

    if (expired.length === 0) return;

    for (const booking of expired) {
      // Seat wapas chhodo
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

      booking.status = "cancelled";
      booking.cancellation = {
        cancelledBy: "system",
        cancelledAt: now,
        reason: "Reservation expired - payment not completed in time",
      };
      await booking.save();
    }

    console.log(`✓ Released ${expired.length} expired reservation(s)`);
  } catch (error) {
    console.error(`✗ Reservation cleanup error: ${error.message}`);
  }
};

module.exports = releaseExpiredReservations;
