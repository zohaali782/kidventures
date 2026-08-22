const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465, // 465 = implicit TLS

    // 587 par nodemailer STARTTLS use karta hai, lekin requireTLS ke baghair
    // server mana kare to woh chup chaap PLAINTEXT par bhej deta hai —
    // yaani SMTP password aur email ka matn network par khula chala jata.
    requireTLS: Number(process.env.SMTP_PORT) !== 465,
    tls: { rejectUnauthorized: true }, // jaali certificate accept na ho

    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  return transporter;
}

/**
 * Recipient ki shakl theek hai ya nahi.
 *
 * Newline ya comma wali "email" se header injection ho sakti hai —
 * attacker apne Bcc/extra recipients daal kar aap ke SMTP account se
 * spam bhej sakta hai. Is liye ek hi saaf email address allow karte hain.
 */
const isValidRecipient = (value) =>
  typeof value === "string" &&
  value.length <= 254 &&
  /^[^\s@,;:<>"'\\]+@[^\s@,;:<>"'\\]+\.[^\s@,;:<>"'\\]+$/.test(value.trim());

/**
 * Logs me poora email address na jaye — woh PII hai aur hosting platform
 * ke logs kaafi logon ko nazar aate hain. Sirf itna dikhate hain ke
 * debugging ho sake.
 */
const maskEmail = (email) => {
  const [name = "", domain = ""] = String(email).split("@");
  const shown = name.slice(0, 2);
  return `${shown}${"*".repeat(Math.max(name.length - 2, 1))}@${domain}`;
};

async function sendEmail({ to, subject, html }) {
  if (!to) return { skipped: true, reason: "no recipient" };

  if (!isValidRecipient(to)) {
    console.warn("[email] invalid recipient, skipping");
    return { skipped: true, reason: "invalid recipient" };
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn("[email] SMTP not configured, skipping:", subject);
    return { skipped: true, reason: "smtp not configured" };
  }

  // Subject me newline ho to woh extra SMTP headers ban sakti hai
  const safeSubject = String(subject ?? "")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, 180);

  try {
    const info = await getTransporter().sendMail({
      from:
        process.env.EMAIL_FROM || `"Kidventures" <${process.env.SMTP_USER}>`,
      to: to.trim(),
      subject: safeSubject,
      html,
      text: String(html || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    });

    console.log("[email] sent:", safeSubject, "->", maskEmail(to), info.messageId);
    return { ok: true };
  } catch (err) {
    console.error("[email] FAILED:", safeSubject, "->", maskEmail(to), err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { sendEmail };
