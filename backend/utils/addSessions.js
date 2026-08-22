require("dotenv").config();
const mongoose = require("mongoose");
const guardDevScript = require("./guardDevScript");
guardDevScript("addSessions.js");

const Activity = require("../models/Activity");

/**
 * Maujooda active classes me aur session dates add karta hai (testing ke liye),
 * taake Activity Detail ke calendar me zyada dates selectable hon.
 * Chalane ka tareeqa:  node utils/addSessions.js
 *
 * Safe: sirf tab add karta hai jab class ke paas 4 se kam future sessions hon,
 * aur same date+time dobara nahi daalta. Baar baar chala sakti ho.
 */

const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
};

// aage ke ~3 hafte, har 3 din baad, do time slots
const TARGET = [
  { day: 3, time: "10:00", end: "11:00" },
  { day: 6, time: "15:00", end: "16:00" },
  { day: 9, time: "10:00", end: "11:00" },
  { day: 12, time: "15:00", end: "16:00" },
  { day: 16, time: "10:00", end: "11:00" },
  { day: 20, time: "15:00", end: "16:00" },
];

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✓ Connected to MongoDB\n");

    const activities = await Activity.find({ status: "active" });
    console.log(`Found ${activities.length} active classes\n`);

    let updated = 0;

    for (const a of activities) {
      const now = new Date();
      const futureCount = (a.sessions || []).filter(
        (s) => s?.date && new Date(s.date) >= now,
      ).length;

      if (futureCount >= 4) {
        continue; // pehle se kaafi hain
      }

      // maujooda date+time set (duplicate se bachne ke liye)
      const existing = new Set(
        (a.sessions || []).map(
          (s) => `${new Date(s.date).toDateString()}_${s.startTime}`,
        ),
      );

      let added = 0;
      for (const t of TARGET) {
        const date = daysFromNow(t.day);
        const key = `${date.toDateString()}_${t.time}`;
        if (existing.has(key)) continue;

        a.sessions.push({
          date,
          startTime: t.time,
          endTime: t.end,
          capacity: a.capacity || 12,
          seatsBooked: 0,
        });
        added++;
      }

      if (added > 0) {
        await a.save();
        updated++;
        console.log(`  + ${a.title}: added ${added} sessions`);
      }
    }

    console.log(`\n✓ Done. ${updated} classes updated.\n`);
    process.exit(0);
  } catch (error) {
    console.error(`\n✗ Failed: ${error.message}\n`);
    process.exit(1);
  }
};

run();
