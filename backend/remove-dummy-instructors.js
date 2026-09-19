/**
 * Dummy/test accounts ko poori tarah hatane wali ek dafa chalane wali script
 * — DB se bhi, is liye site se bhi khud-ba-khud gayab ho jayenge.
 *
 * Ye har match hone wale account ka SAARA data delete karti hai (chahe
 * instructor ho ya parent), taake koi "orphaned" (tooti hui) entry na rahe:
 *   - User account
 *   - (instructor ho to) InstructorProfile + unki saari Activities (classes)
 *     + un classes ke Reviews
 *   - (parent ho to) unke Children (bachon ke profiles) + unke likhe Reviews
 *     + unki Class requests
 *   - Dono taraf se: Bookings, Payments, Messages (bheje/mile)
 *
 * Kisi aur account (jo list me nahi) ko haath nahi lagati.
 *
 * SAFETY: Pehle sirf PREVIEW dikhati hai (kuch delete nahi hota). Counts
 * dekh kar tasalli ho jaye to "--confirm" ke sath dobara chalayein.
 *
 * Chalane ka tareeqa (backend folder ke andar se):
 *   node remove-dummy-instructors.js              <- sirf preview
 *   node remove-dummy-instructors.js --confirm    <- asal deletion
 *
 * STRONGLY RECOMMENDED: Deletion se pehle MongoDB Atlas se ek backup/export
 * le lein (Atlas dashboard -> Collections -> Export), taake agar kuch
 * ghalat ho to wapas la sakein. Ye action IRREVERSIBLE hai.
 *
 * Kaam hone ke baad ye file delete kar sakti hain.
 */

require("dotenv").config();
const mongoose = require("mongoose");

const CONFIRM = process.argv.includes("--confirm");

// Yehi woh dummy accounts hain jo hatane hain.
const DUMMY_NAMES = ["Maheen Ali", "Afsha"]; // admin dashboard ke dummy instructors
const DUMMY_EMAILS = [
  "zoeali196@gmail.com",
  "arianova.ugc@gmail.com",
  "syed.dayan.ali.786@gmail.com",
  "zohaa134@gmail.com",
  "jawadsarkar1725@gmail.com",
  "ibakersdozenstore@gmail.com",
  "sarwatfatima073@gmail.com",
  "zoha07871@gmail.com",
  "maheenali5959@gmail.com",
  "zohaali7182@gmail.com",
];

const run = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error("\n✗ MONGO_URI .env me nahi mila.");
      console.error("  Ye script backend folder ke andar se chalayein:\n");
      console.error("  cd C:\\Users\\hp\\kidventures\\backend");
      console.error("  node remove-dummy-instructors.js\n");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("\n✓ Connected to MongoDB\n");

    const db = mongoose.connection;
    const users = db.collection("users");

    /* ---------------- 1. Dummy accounts dhoondo ---------------- */
    const targets = await users
      .find({
        $or: [
          { role: "instructor", name: { $in: DUMMY_NAMES } },
          { email: { $in: DUMMY_EMAILS } },
        ],
      })
      .project({ name: 1, email: 1, role: 1 })
      .toArray();

    if (targets.length === 0) {
      console.log(
        "Koi bhi account in naamon/emails ke saath nahi mila — shayad pehle",
      );
      console.log("hi delete ho chuka hai. Kuch nahi kiya gaya.\n");
      process.exit(0);
    }

    console.log(`Ye accounts mile (${targets.length}):`);
    for (const t of targets)
      console.log(`     - ${t.name}  <${t.email}>  (${t.role})`);
    console.log("");

    const userIds = targets.map((t) => t._id);

    /* ---------------- 2. Instructor-side: unki classes dhoondo ---------------- */
    const activities = await db
      .collection("activities")
      .find({ instructor: { $in: userIds } })
      .project({ title: 1 })
      .toArray();
    const activityIds = activities.map((a) => a._id);

    /* ---------------- 3. Har related collection ke targets ---------------- */
    const relatedTargets = [
      {
        name: "reviews",
        // unki classes par mile reviews + khud unhone (parent hone ki
        // soorat me) kisi aur class par likhe reviews - dono
        filter: {
          $or: [{ activity: { $in: activityIds } }, { user: { $in: userIds } }],
        },
        label: "Reviews",
      },
      {
        name: "bookings",
        filter: {
          $or: [{ instructor: { $in: userIds } }, { parent: { $in: userIds } }],
        },
        label: "Bookings",
      },
      {
        name: "payments",
        filter: {
          $or: [{ instructor: { $in: userIds } }, { parent: { $in: userIds } }],
        },
        label: "Payments",
      },
      {
        name: "messages",
        filter: { $or: [{ sender: { $in: userIds } }, { recipient: { $in: userIds } }] },
        label: "Messages (bheje/mile)",
      },
      {
        name: "children",
        filter: { parent: { $in: userIds } },
        label: "Children (bachon ke profiles)",
      },
      {
        name: "classrequests",
        filter: {
          $or: [{ parent: { $in: userIds } }, { email: { $in: DUMMY_EMAILS } }],
        },
        label: "Class requests",
      },
      {
        name: "instructorprofiles",
        filter: { user: { $in: userIds } },
        label: "Instructor profiles",
      },
      {
        name: "activities",
        filter: { instructor: { $in: userIds } },
        label: `Activities (classes) — ${activities.map((a) => a.title).join(", ") || "koi nahi"}`,
      },
    ];

    console.log(
      CONFIRM
        ? "Deleting the following:\n"
        : "PREVIEW ONLY — abhi kuch delete nahi ho raha:\n",
    );

    for (const t of relatedTargets) {
      const count = await db.collection(t.name).countDocuments(t.filter);
      if (CONFIRM) {
        const res = await db.collection(t.name).deleteMany(t.filter);
        console.log(`   ${t.label}: ${res.deletedCount} deleted`);
      } else {
        console.log(`   ${t.label}: ${count} will be deleted`);
      }
    }

    // User account sab se aakhir me — baaki sab chiz hata chukne ke baad.
    if (CONFIRM) {
      const res = await users.deleteMany({ _id: { $in: userIds } });
      console.log(`   User accounts: ${res.deletedCount} deleted`);
    } else {
      console.log(`   User accounts: ${targets.length} will be deleted`);
    }

    if (!CONFIRM) {
      console.log(
        "\nKuch bhi delete nahi hua. Agar ye sahi lag raha hai, to yehi command",
      );
      console.log("--confirm ke sath dobara chalayein:\n");
      console.log("   node remove-dummy-instructors.js --confirm\n");
    } else {
      const remaining = await users
        .find({})
        .project({ name: 1, email: 1, role: 1 })
        .toArray();
      console.log(`\n✓ Cleanup complete. Ab database me ${remaining.length} account(s) hain:`);
      for (const u of remaining)
        console.log(`     - ${u.name} <${u.email}> (${u.role})`);
      console.log(
        "\nSite par bhi (Instructors page, admin dashboard, homepage) yeh accounts ab nahi dikhenge.\n",
      );
    }

    process.exit(0);
  } catch (error) {
    console.error(`\n✗ Failed: ${error.message}\n`);
    process.exit(1);
  }
};

run();
