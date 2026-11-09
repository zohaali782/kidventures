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

    // SMTP kabhi hamesha ke liye latak na jaye
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,

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
 *
 * NOTE: pehle yahan apostrophe (') bhi excluded thi, is liye "o'brien@..."
 * jaisi (bilkul valid) emails "invalid recipient" bol kar chup chaap skip
 * ho jati thin — un accounts ko koi verification/reset email kabhi nahi
 * jati thi. Apostrophe local-part mein valid hai, is liye ab allowed hai.
 */
const isValidRecipient = (value) =>
  typeof value === "string" &&
  value.length <= 254 &&
  /^[^\s@,;:<>"\\]+@[^\s@,;:<>"\\]+\.[^\s@,;:<>"\\]+$/.test(value.trim());

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

  // From ka ADDRESS hamesha wahi hona chahiye jis account se login karke
  // bhej rahe hain (SMTP_USER). Agar SMTP Gmail ka ho aur From
  // hello@kidventures.ae ho, to SPF/DKIM fail hote hain aur Gmail/Outlook
  // email chup chaap spam ya gayab kar dete hain, jabke logs "sent" kehte hain.
  // EMAIL_FROM se sirf naam ("Kidventures") lete hain, aur agar us ka
  // address alag ho to woh reply-to ban jata hai.
  const smtpUser = process.env.SMTP_USER.trim();
  const fromEnv = (process.env.EMAIL_FROM || "").trim();
  const fromMatch = fromEnv.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  const fromName = (fromMatch ? fromMatch[1] : "").trim() || "Kidventures";
  const fromAddr = (fromMatch ? fromMatch[2] : fromEnv).trim();
  const replyTo =
    fromAddr && fromAddr.includes("@") && fromAddr.toLowerCase() !== smtpUser.toLowerCase()
      ? fromAddr
      : undefined;

  try {
    const info = await getTransporter().sendMail({
      from: { name: fromName, address: smtpUser },
      ...(replyTo ? { replyTo } : {}),
      to: to.trim(),
      subject: safeSubject,
      html,
      text: String(html || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    });

    // Server ne email waqai accept ki ya reject, dono log mein dikhta hai
    if (info.rejected && info.rejected.length) {
      console.error("[email] REJECTED by SMTP:", safeSubject, "->", maskEmail(to), info.response);
      return { ok: false, error: "rejected" };
    }
    console.log(
      "[email] sent:", safeSubject, "->", maskEmail(to),
      "| from:", maskEmail(smtpUser), "| via:", process.env.SMTP_HOST,
      "|", info.response,
    );
    return { ok: true };
  } catch (err) {
    console.error("[email] FAILED:", safeSubject, "->", maskEmail(to), err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { sendEmail };
