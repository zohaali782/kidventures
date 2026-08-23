/**
 * Testing ke baad ka cleanup — ek dafa chalane wali script.
 *
 * Chalane ka tareeqa (backend folder me):
 *   node cleanup.js
 *
 * Yeh do kaam karti hai:
 *   1. Har account ka login lock hata deti hai (lockedUntil + failedLoginAttempts)
 *      — lockout test ke baad account 15 minute ke liye band ho jata hai.
 *   2. Test ke dauran bane fake accounts delete kar deti hai
 *      (roletest..., weak..., @example.com wale) — pehle un ka role dikha kar.
 *
 * Aap ke asli accounts (admin, instructor, parent) ko haath nahi lagati.
 *
 * Kaam hone ke baad yeh file delete kar sakti hain.
 */

require("dotenv").config();
const mongoose = require("mongoose");

const run = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error("\n✗ MONGO_URI .env me nahi mila.");
      console.error("  Yeh script backend folder ke andar se chalayein:\n");
      console.error("  cd C:\\Users\\hp\\kidventures\\backend");
      console.error("  node cleanup.js\n");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("\n✓ Connected to MongoDB\n");

    const users = mongoose.connection.collection("users");

    /* ---------------- 1. Locks hatao ---------------- */
    const locked = await users
      .find({ lockedUntil: { $exists: true } })
      .project({ email: 1 })
      .toArray();

    if (locked.length === 0) {
      console.log("1. Locks: koi account locked nahi tha.");
    } else {
      await users.updateMany(
        {},
        { $unset: { lockedUntil: "", failedLoginAttempts: "" } },
      );
      console.log(`1. Locks hataye (${locked.length}):`);
      for (const u of locked) console.log(`     - ${u.email}`);
      console.log("   Ab yeh accounts foran login kar sakte hain.");
    }

    /* ---------------- 2. Test accounts delete ---------------- */
    const testFilter = {
      $or: [
        { email: /^roletest\./ },
        { email: /^weak\./ },
        { email: /@example\.com$/ },
        { email: /@kidventures\.local$/ },
      ],
    };

    const testUsers = await users
      .find(testFilter)
      .project({ email: 1, role: 1 })
      .toArray();

    console.log("");
    if (testUsers.length === 0) {
      console.log("2. Test accounts: koi nahi mila.");
    } else {
      console.log(`2. Yeh test accounts delete kiye jayenge (${testUsers.length}):`);
      for (const u of testUsers) {
        // role escalation test ka nateeja yahan dikh jayega
        const flag = u.role === "admin" ? "   <-- ADMIN! yeh masla hai" : "";
        console.log(`     - ${u.email}  (role: ${u.role})${flag}`);
      }

      const res = await users.deleteMany(testFilter);
      console.log(`   Deleted: ${res.deletedCount}`);
    }

    /* ---------------- 3. Bache hue accounts ---------------- */
    const remaining = await users
      .find({})
      .project({ email: 1, role: 1, emailVerified: 1 })
      .toArray();

    console.log("");
    console.log(`3. Ab database me ${remaining.length} account hain:`);
    for (const u of remaining) {
      console.log(
        `     - ${u.email}  (${u.role}, verified: ${u.emailVerified === true})`,
      );
    }

    console.log("\n✓ Cleanup complete\n");
    process.exit(0);
  } catch (error) {
    console.error(`\n✗ Failed: ${error.message}\n`);
    process.exit(1);
  }
};

run();
