// Kisi user ka email manually "verified" mark karta hai, taake woh login kar sake.
// Chalane ka tareeqa (backend folder me):   node verify-user.js user@email.com
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

const email = (process.argv[2] || "").toLowerCase().trim();
if (!email) {
  console.log("Email likhein:  node verify-user.js user@email.com");
  process.exit(1);
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne({ email });
  if (!user) {
    console.log("Yeh email database me nahi mili:", email);
  } else if (user.emailVerified) {
    console.log("Pehle se verified hai:", email, "| role:", user.role);
  } else {
    user.emailVerified = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyExpires = undefined;
    await user.save({ validateBeforeSave: false });
    console.log("DONE: verified ho gaya ->", email, "| role:", user.role);
  }
  await mongoose.disconnect();
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
