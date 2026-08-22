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
 *
 * -------------------------------------------------------------------------
 * SECURITY / INTEGRITY NOTE
 *
 * Purana code find() karta tha, phir booking.save() se cancel karta tha.
 * In dono ke darmiyan agar Stripe ka webhook aa jata (payment kamyab), to
 * yeh cron us PAID booking ko cancel kar deta — paise le liye, seat gayi.
 *
 * Ab ek hi atomic findOneAndUpdate use hoti hai jis me shart dobara lagi hai:
 * "sirf tab cancel karo jab booking ab bhi pending aur unpaid ho".
 * Agar us lamhe payment aa chuka tha to update match hi nahi karti aur
 * booking ko haath nahi lagta.
 * -------------------------------------------------------------------------
 */
// Agar pichla run abhi chal raha ho to naya shuru na ho — warna do runs
// ek hi booking par kaam kar ke seats do dafa release kar sakte hain.
let isRunning = false;

const releaseExpiredReservations = async () => {
  if (isRunning) return;
  isRunning = true;

  try {
    const now = new Date();

    // Woh bookings jo abhi tak pending hain aur jinki reservation guzar chuki
    const expired = await Booking.find({
      status: "pending",
      paymentStatus: { $in: ["unpaid", "failed"] },
      reservationExpiresAt: { $lt: now },
    })
      .select("_id activity sessionId numberOfChildren")
      .limit(100);

    if (expired.length === 0) return;

    let released = 0;
    let skipped = 0;

    for (const booking of expired) {
      // 1. Booking cancel karo — lekin sirf tab jab woh ab bhi pending ho.
      //    Yehi shart race condition ko rokti hai.
      const cancelled = await Booking.findOneAndUpdate(
        {
          _id: booking._id,
          status: "pending",
          paymentStatus: { $in: ["unpaid", "failed"] },
        },
        {
          $set: {
            status: "cancelled",
            cancellation: {
              cancelledBy: "system",
              cancelledAt: now,
              reason: "Reservation expired - payment not completed in time",
            },
          },
        },
        { new: true },
      );

      if (!cancelled) {
        // Is dauran payment aa gaya ya kisi aur process ne handle kar liya.
        skipped++;
        continue;
      }

      // 2. Ab seat wapas chhodo. Pehle cancel, phir seat — is tarteeb se
      //    seat kabhi do dafa release nahi hoti.
      try {
        const result = await Activity.updateOne(
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
        );

        if (result.modifiedCount === 0) {
          // Purana code yahan error chupa deta tha (.catch(() => {})), jis se
          // seat hamesha ke liye block ho jati aur kisi ko pata na chalta.
          console.error(
            `! Seat release failed — booking ${booking._id}, activity ${booking.activity}, session ${booking.sessionId}`,
          );
        }
      } catch (err) {
        console.error(
          `! Seat release error — booking ${booking._id}: ${err.message}`,
        );
      }

      released++;
    }

    if (released > 0 || skipped > 0) {
      console.log(
        `✓ Reservations: ${released} released, ${skipped} skipped (already paid/handled)`,
      );
    }
  } catch (error) {
    console.error(`✗ Reservation cleanup error: ${error.message}`);
  } finally {
    isRunning = false;
  }
};

module.exports = releaseExpiredReservations;
