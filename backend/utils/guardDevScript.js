/**
 * Dev-only scripts ke liye guard.
 *
 * seed.js / seedActivities.js / addSessions.js sab .env ka MONGO_URI use
 * karte hain. Agar production ki .env ke saath chal jayen (ya kisi ne server
 * par chala di), to yeh scripts LIVE database me test data daal deti hain —
 * aur seedActivities to ek instructor account bhi bana deti thi.
 *
 * Is liye har script apne shuru me yeh guard chalati hai.
 * Jaan boojh kar production par chalana ho to: ALLOW_SEED=yes node utils/seed.js
 */
const guardDevScript = (scriptName) => {
  const isProd = process.env.NODE_ENV === "production";
  const override = process.env.ALLOW_SEED === "yes";

  if (isProd && !override) {
    console.error(
      `\n✗ ${scriptName} production me nahi chal sakti.\n` +
        `  Yeh script test data banati hai — live database ke liye nahi hai.\n` +
        `  Waqai zaroorat ho to: ALLOW_SEED=yes node utils/${scriptName}\n`,
    );
    process.exit(1);
  }

  if (isProd && override) {
    console.warn(
      `\n! WARNING: ${scriptName} PRODUCTION database par chal rahi hai.\n`,
    );
  }
};

module.exports = guardDevScript;
