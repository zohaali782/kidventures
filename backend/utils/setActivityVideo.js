/**
 * Kisi activity mein video lagane ke liye (Cloudinary video URL).
 *
 * Chalane ka tareeqa (backend folder se):
 *   node utils/setActivityVideo.js "crochet" "https://res.cloudinary.com/rwnkpzbs/video/upload/v123/crochet_class.mp4"
 *
 * Video hatane ke liye URL ki jagah "" likho.
 * Title ka koi bhi hissa kaafi hai. Agar ek se zyada activities milen to
 * sab ke naam dikha ke ruk jata hai, taake galat activity mein video na lage.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Activity = require("../models/Activity");
const { cleanVideoUrl } = require("./safeUrl");

(async () => {
  const [search, url] = process.argv.slice(2);
  if (!search || url === undefined) {
    console.log('Use: node utils/setActivityVideo.js "<title ka hissa>" "<video url>"');
    process.exit(1);
  }
  const safe = cleanVideoUrl(url);
  if (safe === null) {
    console.log("URL qabool nahi: apni Cloudinary ki https video URL do (.../video/upload/...)");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const esc = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const found = await Activity.find({ title: new RegExp(esc, "i") }).select("title videoUrl");
  if (found.length === 0) console.log("Koi activity nahi mili:", search);
  else if (found.length > 1) {
    console.log("Ek se zyada mili, title aur specific likho:");
    found.forEach((a) => console.log(" -", a.title));
  } else {
    found[0].videoUrl = safe;
    await found[0].save();
    console.log("Video set ho gayi:", found[0].title, "=>", safe || "(hata di)");
  }
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
