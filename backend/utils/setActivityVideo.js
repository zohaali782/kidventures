/**
 * Kisi activity mein ek ya zyada videos lagane ke liye (Cloudinary video URL).
 *
 * Chalane ka tareeqa (backend folder se):
 *   node utils/setActivityVideo.js "crochet" "<url1>" "<url2>"
 *
 * Pehla URL main video hoti hai, baqi uske baad. Sab hatane ke liye
 * URL ki jagah "" likho.
 * Title ka koi bhi hissa kaafi hai. Agar ek se zyada activities milen to
 * sab ke naam dikha ke ruk jata hai, taake galat activity mein video na lage.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Activity = require("../models/Activity");
const { cleanVideoUrl } = require("./safeUrl");

(async () => {
  const [search, ...urls] = process.argv.slice(2);
  if (!search || urls.length === 0) {
    console.log('Use: node utils/setActivityVideo.js "<title ka hissa>" "<url1>" "<url2>"');
    process.exit(1);
  }
  const safe = [];
  for (const u of urls) {
    const c = cleanVideoUrl(u);
    if (c === null) {
      console.log("URL qabool nahi:", u, "\nApni Cloudinary ki https video URL do (.../video/upload/...)");
      process.exit(1);
    }
    if (c) safe.push(c);
  }
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const esc = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const found = await Activity.find({ title: new RegExp(esc, "i") }).select("title videoUrl videoUrls");
  if (found.length === 0) console.log("Koi activity nahi mili:", search);
  else if (found.length > 1) {
    console.log("Ek se zyada mili, title aur specific likho:");
    found.forEach((a) => console.log(" -", a.title));
  } else {
    found[0].videoUrl = safe[0] || "";
    found[0].videoUrls = safe;
    await found[0].save();
    console.log("Video set ho gayi:", found[0].title);
    safe.forEach((u, i) => console.log(" ", i + 1, u));
    if (safe.length === 0) console.log("  (sab videos hata di)");
  }
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
