// SMTP test — chalane ka tareeqa (backend folder me):  node test-email.js
// Yeh .env se SMTP settings le kar (1) Gmail se connection check karta hai
// aur (2) aap ke apne SMTP_USER inbox par ek test email bhejta hai.
// Kaam ho jaye to yeh file delete kar dein.
require("dotenv").config();
const nodemailer = require("nodemailer");

const port = Number(process.env.SMTP_PORT || 587);
console.log("SMTP_HOST :", process.env.SMTP_HOST || "(MISSING)");
console.log("SMTP_PORT :", port);
console.log("SMTP_USER :", process.env.SMTP_USER ? "set" : "(MISSING)");
console.log("SMTP_PASS :", process.env.SMTP_PASS ? `set (${process.env.SMTP_PASS.length} chars)` : "(MISSING)");
console.log("SERVER_URL:", process.env.SERVER_URL || "(MISSING)");
console.log("------------------------------------------");

const t = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure: port === 465,
  requireTLS: port !== 465,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

(async () => {
  try {
    await t.verify();
    console.log("STEP 1 OK: Gmail se connection + login theek hai");
  } catch (e) {
    console.log("STEP 1 FAILED:", e.code || "", e.message);
    if (/timeout|ETIMEDOUT|ECONNREFUSED|ENETUNREACH/i.test(e.message + e.code))
      console.log(">> Port block hai (host/ISP/firewall). Gmail tak pohanch hi nahi rahe.");
    if (/535|Invalid login|Username and Password not accepted/i.test(e.message))
      console.log(">> App password ghalat/expire. Google Account > Security > App passwords se naya banayein.");
    process.exit(1);
  }
  try {
    const info = await t.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_USER,
      subject: "Kidventures SMTP test",
      text: "Agar yeh email mili hai to SMTP bilkul theek chal raha hai.",
    });
    console.log("STEP 2 OK: test email bhej di —", info.messageId);
    console.log(">> Inbox (aur Spam) check karein.");
  } catch (e) {
    console.log("STEP 2 FAILED:", e.code || "", e.message);
  }
})();
