/**
 * Ek dafa chalane wali script — purane accounts theek karti hai.
 *
 * Chalane ka tareeqa (backend folder me):
 *   node fix-old-users.js
 *
 * Masla: yeh script se pehle bane accounts me "emailVerified" field maujood
 * hi nahi thi. Login ka naya check `if (!user.emailVerified)` hai, aur
 * missing field undefined (falsy) hoti hai — yaani purane users, admin
 * samet, login nahi kar paate.
 *
 * Hal: jin users me yeh field hai hi nahi, un par emailVerified: true laga
 * do. Yeh woh log hain jo naya system aane se pehle account bana chuke the.
 *
 * Naye users par koi asar nahi — un me field pehle se hoti hai.
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
      console.error("  node fix-old-users.js\n");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("\n✓ Connected to MongoDB\n");

    const users = mongoose.connection.collection("users");

    // Pehle dikhao kis kis par asar hoga
    const affected = await users
      .find({ emailVerified: { $exists: false } })
      .project({ email: 1, role: 1 })
      .toArray();

    if (affected.length === 0) {
      console.log("✓ Koi purana account nahi mila — sab pehle se theek hain.\n");
      process.exit(0);
    }

    console.log(`Yeh ${affected.length} account theek kiye jayenge:`);
    for (const u of affected) {
      console.log(`  - ${u.email}  (${u.role})`);
    }

    const result = await users.updateMany(
      { emailVerified: { $exists: false } },
      { $set: { emailVerified: true } },
    );

    console.log(`\n✓ Updated: ${result.modifiedCount} account(s)`);
    console.log("  Ab yeh sab login kar sakte hain.\n");

    process.exit(0);
  } catch (error) {
    console.error(`\n✗ Failed: ${error.message}\n`);
    process.exit(1);
  }
};

run();
