import foundingFull from "../assets/badges/founding-full.png";
import foundingFull2x from "../assets/badges/founding-full@2x.png";
import foundingFull3x from "../assets/badges/founding-full@3x.png";
import popularFull from "../assets/badges/popular-full.png";
import popularFull2x from "../assets/badges/popular-full@2x.png";
import popularFull3x from "../assets/badges/popular-full@3x.png";
import bronzeFull from "../assets/badges/bronze-full.png";
import bronzeFull2x from "../assets/badges/bronze-full@2x.png";
import bronzeFull3x from "../assets/badges/bronze-full@3x.png";
import adminFull from "../assets/badges/admin-full.png";
import adminFull2x from "../assets/badges/admin-full@2x.png";
import adminFull3x from "../assets/badges/admin-full@3x.png";

/**
 * BadgeMedal - do bilkul alag shakal me aata hai, kyunke ek hi photoreal
 * medal image dono jagah kaam nahi karti:
 *
 *  variant="chip"  (DEFAULT, instructor card / profile header ke liye)
 *      Pura chip inline SVG + text hai, yani VECTOR. Zoom out, zoom in,
 *      retina, koi bhi screen - kabhi blur ya pixel nahi hoga, kyunke
 *      browser har zoom level par is ko dobara draw karta hai.
 *      Text label bhi saath hai, isliye parent ko foran samajh aata hai
 *      ke instructor ne kaunsa badge jeeta hai (pehle wala chota medal
 *      sirf ek sunehri dhabba lagta tha).
 *
 *  variant="medal"  (sirf /badges info page jaise bade showcase ke liye)
 *      Asli photoreal medal PNG, ab 1x/2x/3x srcset ke saath. Browser
 *      screen ki density aur zoom ke hisab se sahi file uthata hai,
 *      isliye ye bhi sharp rehta hai.
 *
 * Blur ki asal wajah kya thi: purani asset sirf 300px (full) aur 160px
 * (coin) chaurhi thi aur usay 20-22px par dikhaya ja raha tha. Itna bara
 * downscale karne par browser ki filtering photoreal detail ko ghol deti
 * hai, aur zoom karne par wapas upscale hone se pixel phat-te the.
 * Vector chip us masle ko jar se khatam kar deta hai.
 *
 * Naya badge add karna ho to: BADGE_META me entry, ICONS me ek SVG,
 * aur MEDALS me image imports. Baaki sab khud chal jayega.
 */

export const BADGE_META = {
  founding: {
    label: "Founding Instructor",
    short: "Founding",
    blurb:
      "Awarded automatically to the first instructors who joined Kidventures.",
    // rang jaan boojh kar medal ke ribbon se match kiye gaye hain, taake
    // chota chip aur bara medal ek hi award lagein
    ink: "#7A5713",
    bg: "#FBF0D2",
    border: "#E6C878",
  },
  popular: {
    label: "Popular This Month",
    short: "Popular",
    blurb:
      "Given to instructors with 5+ confirmed bookings in the current month.",
    ink: "#B2361C",
    bg: "#FDE7DF",
    border: "#F1B29C",
  },
  bronze: {
    label: "Highly Rated",
    short: "Top Rated",
    blurb:
      "For instructors with a 4.5★ average rating from at least 5 reviews.",
    ink: "#0C666B",
    bg: "#DFF3F3",
    border: "#93CFD2",
  },
  admin: {
    label: "Kidventures Pick",
    short: "KV Pick",
    blurb:
      "A hand-picked badge the Kidventures team awards to standout instructors.",
    ink: "#1C4A88",
    bg: "#E5EEFA",
    border: "#A4C2E6",
  },
};

/* Chaar simple shapes: dhaal, shola, sitara, chamak. Jaan boojh kar
   moti aur khaali jagah wali rakhi hain taake 13px par bhi saaf paRhi
   jayein - barik detail chote size par hamesha ghul jati hai. */
const ICONS = {
  // dhaal + "I", bilkul medal ke shield motif jaisa
  founding: (
    <path d="M12 2.6 4.6 5.1v6.2c0 4.3 3 7.6 7.4 9.1 4.4-1.5 7.4-4.8 7.4-9.1V5.1L12 2.6Zm1.3 12.9h-2.6V9.9H9.1V7.8h4.2v7.7Z" />
  ),
  // shola = "abhi in demand hai". 3 log wala icon 12px par ghul jata tha.
  // shola = "abhi in demand hai". 3 logon wala icon 13px par ghul jata tha.
  popular: (
    <path d="M12 1.7c3.9 3.4 6.6 6.3 6.6 10.4 0 4-3 7-6.6 7s-6.6-3-6.6-7c0-2.1.9-3.9 2.1-5.3.1 1.5.8 2.4 1.9 2.4 1.3 0 2-1.2 2-3 0-2 .1-3.4.6-4.5Z" />
  ),
  bronze: (
    <path d="m12 2.6 2.83 5.73 6.32.92-4.57 4.46 1.08 6.3L12 17.03l-5.66 2.98 1.08-6.3-4.57-4.46 6.32-.92L12 2.6Z" />
  ),
  admin: (
    <path d="M12 2.3 14.7 9.3 21.7 12 14.7 14.7 12 21.7 9.3 14.7 2.3 12 9.3 9.3 12 2.3Z" />
  ),
};

const MEDALS = {
  founding: { src: foundingFull, x2: foundingFull2x, x3: foundingFull3x, ratio: 1.4987 },
  popular: { src: popularFull, x2: popularFull2x, x3: popularFull3x, ratio: 1.4547 },
  bronze: { src: bronzeFull, x2: bronzeFull2x, x3: bronzeFull3x, ratio: 1.4944 },
  admin: { src: adminFull, x2: adminFull2x, x3: adminFull3x, ratio: 1.5006 },
};

const CHIP_SIZES = {
  sm: { font: 11, icon: 13, padY: 3, padX: 8, gap: 5 },
  md: { font: 12.5, icon: 14, padY: 4.5, padX: 10, gap: 6 },
};

export default function BadgeMedal({
  type,
  variant = "chip",
  // chip ke liye: "sm" (card) ya "md" (profile header)
  size = "sm",
  // false karo to sirf gol icon dikhega (tooltip me naam rahega)
  withLabel = true,
  // "short" -> Founding / Popular / Top Rated / KV Pick
  // "full"  -> poora naam
  labelStyle,
  // variant="medal" ke liye CSS width px me
  width = 96,
  className = "",
  // purani calls tootein na, in dono ki ab koi zaroorat nahi
  // eslint-disable-next-line no-unused-vars
  showRibbon,
  // eslint-disable-next-line no-unused-vars
  showLabel,
}) {
  const meta = BADGE_META[type];
  if (!meta) return null;

  if (variant === "medal") {
    const m = MEDALS[type];
    if (!m) return null;
    return (
      <img
        src={m.src}
        srcSet={`${m.src} 1x, ${m.x2} 2x, ${m.x3} 3x`}
        alt={meta.label}
        title={meta.label}
        width={width}
        height={Math.round(width * m.ratio)}
        loading="lazy"
        decoding="async"
        className={`inline-block align-middle ${className}`}
        style={{
          width,
          height: "auto",
          filter: "drop-shadow(0 6px 10px rgba(61,43,31,0.22))",
        }}
      />
    );
  }

  const s = CHIP_SIZES[size] || CHIP_SIZES.sm;
  const text =
    (labelStyle || (size === "md" ? "full" : "short")) === "full"
      ? meta.label
      : meta.short;

  const icon = (
    <svg
      viewBox="0 0 24 24"
      width={s.icon}
      height={s.icon}
      fill="currentColor"
      aria-hidden="true"
      style={{ flex: "none", display: "block" }}
    >
      {ICONS[type]}
    </svg>
  );

  const base = {
    display: "inline-flex",
    alignItems: "center",
    color: meta.ink,
    background: meta.bg,
    border: `1px solid ${meta.border}`,
    lineHeight: 1,
    whiteSpace: "nowrap",
    verticalAlign: "middle",
  };

  if (!withLabel) {
    const box = s.icon + s.padY * 2 + 4;
    return (
      <span
        title={meta.label}
        aria-label={meta.label}
        className={className}
        style={{
          ...base,
          justifyContent: "center",
          width: box,
          height: box,
          borderRadius: "50%",
        }}
      >
        {icon}
      </span>
    );
  }

  return (
    <span
      title={meta.label}
      className={className}
      style={{
        ...base,
        gap: s.gap,
        padding: `${s.padY}px ${s.padX}px`,
        borderRadius: 999,
        fontSize: s.font,
        fontWeight: 700,
        letterSpacing: "0.01em",
      }}
    >
      {icon}
      {text}
    </span>
  );
}

/**
 * BadgeRow - chhota helper, taake har page par wahi chaar if-checks
 * dobara na likhne paRein. `badges` wahi object hai jo API deta hai:
 * { founding: true, popular: false, ... }
 */
export function BadgeRow({ badges, size = "sm", labelStyle, className = "" }) {
  if (!badges) return null;
  const earned = ["founding", "popular", "bronze", "admin"].filter(
    (t) => badges[t]
  );
  if (earned.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {earned.map((t) => (
        <BadgeMedal key={t} type={t} size={size} labelStyle={labelStyle} />
      ))}
    </div>
  );
}
