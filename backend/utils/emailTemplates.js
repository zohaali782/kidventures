const BRAND = {
  gold: "#F4C542",
  orange: "#F5941F",
  brown: "#3D2B1F",
  cream: "#FBEDDE",
};

const APP = () =>
  process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173";

/**
 * SECURITY — esc()
 *
 * In emails ka har hissa user ka likha hua hota hai: class ka title
 * (instructor likhta hai), bachay ka naam (parent likhta hai), rejection
 * reason (admin likhta hai). Agar wo seedha HTML me chala jaye to koi bhi
 * apna markup inject kar sakta hai — misaal ke taur par class ka title:
 *
 *   Painting</td></tr><tr><td><a href="https://fake-site.com">Payment failed, click here</a>
 *
 * Nateeja: har parent ko Kidventures ke asli domain se phishing link jata.
 * Is liye har interpolated value esc() se guzarti hai.
 */
const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * href me sirf hamare apne app ke http/https URLs jayenge.
 * Warna "javascript:" ya kisi aur domain ka link inject ho sakta hai.
 */
const safeUrl = (url) => {
  try {
    const parsed = new URL(String(url), APP());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return APP();
    }
    return esc(parsed.toString());
  } catch {
    return APP();
  }
};

/**
 * Subject line me user ka data aata hai (class ka title). Us me newline ho
 * to SMTP header injection ho sakti hai — attacker apne extra headers (Bcc
 * waghera) daal sakta hai. Is liye newlines hata kar length cap kar dete hain.
 */
const subj = (text) =>
  String(text ?? "")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, 180);

// amounts already stored as AED numbers (not fils) in Booking model
const aed = (n) => `AED ${Number(n || 0).toFixed(2)}`;

const fmtDate = (date, startTime) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";

  const d = parsed.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  // NOTE: yahan escape nahi karte — row() aur body me daalte waqt hota hai,
  // warna double-escaping ho jati hai.
  return startTime ? `${d}, ${startTime}` : d;
};

function layout({ heading, body, ctaText, ctaUrl }) {
  return `
<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:${BRAND.cream};font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.cream};padding:24px 12px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">

        <tr><td style="background:${BRAND.gold};padding:20px 24px;">
          <span style="font-size:22px;font-weight:bold;color:${BRAND.brown};">Kidventures</span>
        </td></tr>

        <tr><td style="padding:28px 24px 8px 24px;">
          <h1 style="margin:0 0 16px 0;font-size:20px;color:${BRAND.brown};">${esc(heading)}</h1>
          <div style="font-size:15px;line-height:1.6;color:#444;">${body}</div>
        </td></tr>

        ${
          ctaText && ctaUrl
            ? `
        <tr><td style="padding:8px 24px 28px 24px;">
          <a href="${safeUrl(ctaUrl)}" style="display:inline-block;background:${BRAND.orange};color:#ffffff;
             text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;font-size:15px;">
            ${esc(ctaText)}
          </a>
        </td></tr>`
            : `<tr><td style="height:20px;"></td></tr>`
        }

        <tr><td style="background:${BRAND.brown};padding:16px 24px;">
          <p style="margin:0;font-size:12px;color:#d9cec5;line-height:1.5;">
            Kidventures, Dubai, UAE<br>
            Need help? Visit <a href="${APP()}/contact" style="color:${BRAND.gold};">our contact page</a>.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}

/**
 * NOTE: `body` yahan raw HTML hai (neeche wale functions markup banate hain).
 * Is liye har template ke andar user ki har value esc() se guzarni ZAROORI hai.
 */
function row(label, value) {
  return `<tr>
    <td style="padding:6px 0;color:#777;font-size:14px;">${esc(label)}</td>
    <td style="padding:6px 0;color:${BRAND.brown};font-size:14px;font-weight:bold;text-align:right;">${esc(value)}</td>
  </tr>`;
}

/* ---------- 1. Parent: booking confirmed ---------- */
function bookingConfirmedParent({ parentName, booking }) {
  const kids = (booking.children || []).map((c) => c.name).join(", ");

  const discountLine =
    Number(booking.discountAmount) > 0
      ? row(
          `Sibling discount (${booking.discountPercent}%)`,
          `- ${aed(booking.discountAmount)}`,
        )
      : "";

  return {
    subject: subj(`Booking confirmed: ${booking.activityTitle}`),
    html: layout({
      heading: `You're booked in, ${parentName || "there"}!`,
      body: `
        <p style="margin:0 0 16px 0;">Payment received. Your spot for
        <strong>${esc(booking.activityTitle)}</strong> is confirmed.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee;margin-bottom:16px;">
          ${row("Class", booking.activityTitle)}
          ${row("When", fmtDate(booking.sessionDate, booking.startTime))}
          ${row("Children", kids)}
          ${discountLine}
          ${row("Total paid", aed(booking.totalAmount))}
          ${row("Booking ref", booking.bookingNumber)}
        </table>
        <p style="margin:0;font-size:13px;color:#777;">
          Cancel more than 48 hours before the class for a full refund.
          Between 24 and 48 hours a partial refund may apply. Within
          24 hours, bookings are generally non-refundable.
        </p>`,
      ctaText: "View my bookings",
      ctaUrl: `${APP()}/parent/dashboard`,
    }),
  };
}

/* ---------- 2. Instructor: new booking ---------- */
function newBookingInstructor({ instructorName, booking }) {
  return {
    subject: subj(`New booking: ${booking.activityTitle}`),
    html: layout({
      heading: `New booking, ${instructorName || "there"}`,
      body: `
        <p style="margin:0 0 16px 0;">A parent just booked
        <strong>${esc(booking.numberOfChildren)} child${Number(booking.numberOfChildren) > 1 ? "ren" : ""}</strong>
        into your class.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee;margin-bottom:16px;">
          ${row("Class", booking.activityTitle)}
          ${row("Session", fmtDate(booking.sessionDate, booking.startTime))}
          ${row("Children", String(booking.numberOfChildren))}
          ${row("Your earning", aed(booking.instructorEarning))}
        </table>
        <p style="margin:0;font-size:13px;color:#777;">
          Child names and any allergy notes are in your dashboard.
        </p>`,
      ctaText: "Open dashboard",
      ctaUrl: `${APP()}/instructor/dashboard`,
    }),
  };
}

/* ---------- 3. Instructor approved ---------- */
function instructorApproved({ name }) {
  return {
    subject: "You're approved on Kidventures",
    html: layout({
      heading: `Welcome aboard, ${name || "there"}!`,
      body: `
        <p style="margin:0 0 12px 0;">Your instructor profile has been verified and approved.
        You can now create classes and start taking bookings.</p>
        <p style="margin:0;">Every new class goes through a quick review before it goes live,
        so create yours early.</p>`,
      ctaText: "Create your first class",
      ctaUrl: `${APP()}/instructor/create-class`,
    }),
  };
}

/* ---------- 4. Instructor rejected ---------- */
function instructorRejected({ name, reason }) {
  return {
    subject: "About your Kidventures application",
    html: layout({
      heading: `Hi ${name || "there"}`,
      body: `
        <p style="margin:0 0 12px 0;">We weren't able to approve your instructor profile just yet.</p>
        ${
          reason
            ? `<p style="margin:0 0 12px 0;padding:12px;background:${BRAND.cream};
          border-radius:8px;"><strong>Reason:</strong> ${esc(reason)}</p>`
            : ""
        }
        <p style="margin:0;">You can update your details and submit again any time.</p>`,
      ctaText: "Update my profile",
      ctaUrl: `${APP()}/instructor/dashboard`,
    }),
  };
}

/* ---------- 5. Class approved / live ---------- */
function classApproved({ name, activity }) {
  return {
    subject: subj(`Your class is live: ${activity.title}`),
    html: layout({
      heading: "Your class is now live",
      body: `
        <p style="margin:0 0 12px 0;">Hi ${esc(name || "there")}, <strong>${esc(activity.title)}</strong>
        has been approved and is now visible to parents.</p>
        <p style="margin:0;">You'll get an email each time someone books.</p>`,
      ctaText: "View class",
      ctaUrl: `${APP()}/activities/${activity._id}`,
    }),
  };
}

/* ---------- 6. Refund confirmation ---------- */
function refundConfirmed({ parentName, booking, refundAmount }) {
  return {
    subject: subj(`Refund processed: ${booking.activityTitle}`),
    html: layout({
      heading: `Refund confirmed, ${parentName || "there"}`,
      body: `
        <p style="margin:0 0 16px 0;">Your refund for <strong>${esc(booking.activityTitle)}</strong>
        has been processed.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee;margin-bottom:16px;">
          ${row("Booking ref", booking.bookingNumber)}
          ${row("Refund amount", aed(refundAmount))}
        </table>
        <p style="margin:0;font-size:13px;color:#777;">
          It can take 5-10 business days to appear on your statement.
        </p>`,
    }),
  };
}

/* ---------- 7. Email verification ---------- */
function verifyEmail({ name, verifyUrl }) {
  return {
    subject: subj("Confirm your Kidventures email"),
    html: layout({
      heading: `Almost there, ${name || "there"}!`,
      body: `
        <p style="margin:0 0 12px 0;">Please confirm your email address so we know
        we can reach you about your bookings.</p>
        <p style="margin:0;font-size:13px;color:#777;">
          This link expires in 24 hours. If you didn't create a Kidventures
          account, you can safely ignore this email.
        </p>`,
      ctaText: "Confirm my email",
      ctaUrl: verifyUrl,
    }),
  };
}

/* ---------- 8. Password reset ---------- */
function passwordReset({ name, resetUrl }) {
  return {
    subject: subj("Reset your Kidventures password"),
    html: layout({
      heading: `Password reset, ${name || "there"}`,
      body: `
        <p style="margin:0 0 12px 0;">We got a request to reset your Kidventures
        password. Click the button below to choose a new one.</p>
        <p style="margin:0 0 12px 0;font-size:13px;color:#777;">
          This link works once and expires in 1 hour.
        </p>
        <p style="margin:0;font-size:13px;color:#777;">
          If you didn't ask for this, you can ignore this email — your password
          stays as it is.
        </p>`,
      ctaText: "Choose a new password",
      ctaUrl: resetUrl,
    }),
  };
}

/* ---------- 9. Password changed (confirmation) ---------- */
function passwordChanged({ name }) {
  return {
    subject: subj("Your Kidventures password was changed"),
    html: layout({
      heading: `Password updated, ${name || "there"}`,
      body: `
        <p style="margin:0 0 12px 0;">Your Kidventures password was just changed,
        and you've been logged out everywhere else.</p>
        <p style="margin:0;font-size:13px;color:#777;">
          If this wasn't you, reset your password immediately and contact us.
        </p>`,
      ctaText: "Log in",
      ctaUrl: `${APP()}/login`,
    }),
  };
}

module.exports = {
  bookingConfirmedParent,
  newBookingInstructor,
  instructorApproved,
  instructorRejected,
  classApproved,
  refundConfirmed,
  verifyEmail,
  passwordReset,
  passwordChanged,
};
