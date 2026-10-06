/**
 * Ek dafa chalane wali script - reviews ka purana unique index hatati hai.
 *
 * Chalane ka tareeqa (backend folder ke andar se):
 *   node fix-review-index.js
 *
 * ZAROORAT KYUN
 *
 * Pehle har review ke sath ek account juda hota tha, aur Review model par
 * ye index laga tha:
 *
 *   { activity: 1, user: 1 }  unique
 *
 * Us ka maqsad tha ke ek user ek class par sirf ek hi review de sake.
 *
 * Ab reviews bina login ke bhi likhi ja sakti hain, aur un me user khali
 * hota hai. Saadha unique index me do khali qadrein bhi "ek jaisi" ginti
 * hain, yani ek class par pehla mehmaan review to save ho jata lekin
 * doosra hamesha "duplicate key" se nakaam hota, aur user ko "You've
 * already reviewed this class" dikhta halanke us ne kabhi kuch nahi likha.
 *
 * Naya index wahi shart partialFilterExpression ke sath lagata hai, yani
 * rok sirf un reviews par jin me user mojood hai.
 *
 * Masla ye hai ke MongoDB ek hi key par do mukhtalif index nahi banne
 * deta, aur purana index database me pehle se mojood hai. Mongoose nayi
 * sharten khud se laago nahi karta, bas IndexOptionsConflict ki error
 * chup chaap log kar deta hai. Is liye purana index haath se hatana parta
 * hai, aur yehi ye script karti hai.
 *
 * Ye script koi review delete nahi karti, sirf index hatati hai. Naya
 * index server ke agle start par Mongoose khud bana deta hai. Dobara
 * chala dein to bhi kuch nahi bigarta.
 *
 * Kaam hone ke baad ye file delete kar sakti hain.
 */

require("dotenv").config();
const mongoose = require("mongoose");

const OLD_INDEX = "activity_1_user_1";
const NEW_INDEX = "activity_1_user_1_registered";

const run = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error("\n✗ MONGO_URI .env me nahi mila.");
      console.error("  Ye script backend folder ke andar se chalayein:\n");
      console.error("  cd C:\\Users\\hp\\kidventures\\backend");
      console.error("  node fix-review-index.js\n");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("\n✓ Connected to MongoDB\n");

    const collection = mongoose.connection.db.collection("reviews");
    const indexes = await collection.indexes();

    console.log("Abhi mojood indexes:");
    indexes.forEach((i) => console.log(`  ${i.name}`));
    console.log("");

    const hasOld = indexes.some((i) => i.name === OLD_INDEX);
    const hasNew = indexes.some((i) => i.name === NEW_INDEX);

    if (hasOld) {
      await collection.dropIndex(OLD_INDEX);
      console.log(`✓ Purana index "${OLD_INDEX}" hata diya gaya`);
    } else {
      console.log(`• Purana index "${OLD_INDEX}" mojood hi nahi, kuch nahi kiya`);
    }

    if (hasNew) {
      console.log(`• Naya index "${NEW_INDEX}" pehle se laga hua hai`);
    } else {
      /**
       * Naya index yahin bana dete hain. Mongoose server start par bhi
       * bana deta hai, lekin agar autoIndex band ho (kai log production
       * me band rakhte hain) to kabhi nahi banta aur "ek user ek review"
       * wali shart khamoshi se gum ho jati hai.
       */
      await collection.createIndex(
        { activity: 1, user: 1 },
        {
          unique: true,
          name: NEW_INDEX,
          partialFilterExpression: { user: { $type: "objectId" } },
        },
      );
      console.log(`✓ Naya index "${NEW_INDEX}" bana diya gaya`);
    }

    console.log(
      "\nAb ek account ek class par ek hi review de sakta hai, aur bina",
    );
    console.log("login ke jitne log chahen apna review likh sakte hain.\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("\n✗ Script fail ho gayi:", error.message, "\n");
    process.exit(1);
  }
};

run();
