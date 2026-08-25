/**
 * Pre-launch data reset — ek dafa chalane wali script.
 *
 * Ye karti hai:
 *   1. Admin ke ilawa HAR user delete kar deti hai (instructors + parents dono).
 *   2. Un sab se juri hui cheezein bhi delete kar deti hai, taake koi
 *      "orphaned" (tooti hui) entry na rahe:
 *        - Activities (saari classes)
 *        - Instructor profiles
 *        - Bookings
 *        - Payments
 *        - Reviews
 *        - Messages
 *        - Children (parent ke bachon ke profiles)
 *        - Class requests
 *   3. Categories (Art & Painting, Coding, waghera) ko HAATH NAHI lagati —
 *      wo taxonomy hai, test data nahi.
 *
 * SAFETY: Ye script pehle sirf ek PREVIEW dikhati hai (kuch delete nahi karti).
 * Jab aap counts dekh kar tasalli kar lein ke sahi hai, tab dobara
 * "--confirm" flag ke sath chalayein taake asal mein delete ho.
 *
 * Chalane ka tareeqa (backend folder ke andar se):
 *   node reset-data.js              <- sirf preview, kuch delete nahi hoga
 *   node reset-data.js --confirm    <- asal deletion
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

const run = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error("\n✗ MONGO_URI .env me nahi mila.");
      console.error("  Ye script backend folder ke andar se chalayein:\n");
      console.error("  cd C:\\Users\\hp\\kidventures\\backend");
      console.error("  node reset-data.js\n");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("\n✓ Connected to MongoDB\n");

    const db = mongoose.connection;
    const users = db.collection("users");

    // Admin accounts — ye kabhi delete nahi honge.
    const admins = await users
      .find({ role: "admin" })
      .project({ email: 1 })
      .toArray();

    if (admins.length === 0) {
      console.error(
        "✗ Database me koi admin account nahi mila! Ruk rahi hoon — pehle",
      );
      console.error(
        "  confirm karein ke aapka admin account 'role: admin' ke sath maujood hai,",
      );
      console.error("  warna sab kuch delete ho jayega aur koi login access nahi rahega.\n");
      process.exit(1);
    }

    console.log(`Ye admin account(s) SAFE rahenge (${admins.length}):`);
    for (const a of admins) console.log(`     - ${a.email}`);
    console.log("");

    // Har collection jo clear honi hai
    const targets = [
      { name: "users", filter: { role: { $ne: "admin" } }, label: "Non-admin users (instructors + parents)" },
      { name: "instructorprofiles", filter: {}, label: "Instructor profiles" },
      { name: "activities", filter: {}, label: "Activities (classes)" },
      { name: "bookings", filter: {}, label: "Bookings" },
      { name: "payments", filter: {}, label: "Payments" },
      { name: "reviews", filter: {}, label: "Reviews" },
      { name: "messages", filter: {}, label: "Messages" },
      { name: "children", filter: {}, label: "Children (parent's kid profiles)" },
      { name: "classrequests", filter: {}, label: "Class requests" },
    ];

    const categoriesCount = await db.collection("categories").countDocuments();

    console.log(
      CONFIRM
        ? "Deleting the following:\n"
        : "PREVIEW ONLY — abhi kuch delete nahi ho raha:\n",
    );

    for (const t of targets) {
      const count = await db.collection(t.name).countDocuments(t.filter);
      if (CONFIRM) {
        const res = await db.collection(t.name).deleteMany(t.filter);
        console.log(`   ${t.label}: ${res.deletedCount} deleted`);
      } else {
        console.log(`   ${t.label}: ${count} will be deleted`);
      }
    }

    console.log(`\nCategories: ${categoriesCount} — ye chhedi nahi jayengi.\n`);

    if (!CONFIRM) {
      console.log(
        "Kuch bhi delete nahi hua. Agar ye sahi lag raha hai, to yehi command",
      );
      console.log("--confirm ke sath dobara chalayein:\n");
      console.log("   node reset-data.js --confirm\n");
    } else {
      const remaining = await users
        .find({})
        .project({ email: 1, role: 1 })
        .toArray();
      console.log(`✓ Cleanup complete. Ab database me ${remaining.length} user hain:`);
      for (const u of remaining) console.log(`     - ${u.email} (${u.role})`);
      console.log("");
    }

    process.exit(0);
  } catch (error) {
    console.error(`\n✗ Failed: ${error.message}\n`);
    process.exit(1);
  }
};

run();
