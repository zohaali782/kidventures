const Booking = require("../models/Booking");
const User = require("../models/User");
const { sendEmail } = require("./sendEmail");
const tpl = require("./emailTemplates");

/**
 * Fundraiser booking expire hone se pehle instructor ko ek dafa yaad dilata hai.
 *
 * Booking 24 ghante ke liye seat rokti hai. Jo booking ab bhi "pending" hai
 * aur jis ke expire hone me REMIND_BEFORE_HOURS ghante ya kam reh gaye hain,
 * us ke instructor ko email jati hai. Har booking ko sirf ek dafa, kyunke
 * flag ek hi atomic update me set hota hai (do cron run ek email do dafa
 * nahi bhejte).
 *
 * server.js me har 10 minute chalta hai.
 */
const REMIND_BEFORE_HOURS = 4;

let isRunning = false;

const remindPendingFundraiser = async () => {
  if (isRunning) return;
  isRunning = true;

  try {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + REMIND_BEFORE_HOURS * 60 * 60 * 1000);

    const due = await Booking.find({
      source: "manual",
      status: "pending",
      "emailsSent.fundraiserReminder": { $ne: true },
      reservationExpiresAt: { $gt: now, $lte: windowEnd },
    })
      .select("_id")
      .limit(50);

    for (const item of due) {
      // Pehle flag set karo (sirf tab jab abhi tak set nahi): jo is me kamyab
      // hua wohi email bhejta hai.
      const booking = await Booking.findOneAndUpdate(
        {
          _id: item._id,
          status: "pending",
          "emailsSent.fundraiserReminder": { $ne: true },
        },
        { $set: { "emailsSent.fundraiserReminder": true } },
        { new: true },
      );

      if (!booking) continue;

      try {
        const instructor = await User.findById(booking.instructor).select(
          "name email",
        );
        if (!instructor?.email) continue;

        const hoursLeft = Math.max(
          Math.round((booking.reservationExpiresAt - now) / (60 * 60 * 1000)),
          1,
        );

        const mail = tpl.fundraiserReminderInstructor({
          instructorName: instructor.name,
          booking,
          hoursLeft,
        });
        await sendEmail({ to: instructor.email, ...mail });
      } catch (err) {
        console.error(
          `! Fundraiser reminder failed, booking ${booking._id}: ${err.message}`,
        );
      }
    }
  } catch (error) {
    console.error(`✗ Fundraiser reminder error: ${error.message}`);
  } finally {
    isRunning = false;
  }
};

module.exports = remindPendingFundraiser;
