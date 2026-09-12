/**
 * BadgeMedal — realistic gold/bronze medal icon with a striped ribbon
 * (yellow/orange/brown, Kidventures brand colors), engraved two-line text,
 * a glossy bevel and a soft drop shadow — built entirely in SVG (no image
 * files), so it stays crisp at any size and never depends on an external
 * asset.
 *
 * `type` in 4 me se ek hona chahiyeh: "founding" | "popular" | "bronze" | "admin".
 * Har type ka apna metal color BADGE_META me define hai — naya badge add
 * karna ho to bas yahan ek entry aur bana do.
 *
 * `size` medal ki width (px) hai. `showRibbon` false ho to sirf coin
 * (list/card me chote inline badge ke liye). `showLabel` + size >= 40 par
 * medal ke andar engraved do-line text bhi dikhta hai (badges info page,
 * instructor hero jaisi badi jagah ke liye) - lambe words (jaise
 * "Kidventures") automatically thoda compress ho jate hain (SVG
 * textLength) taake circle se bahar na niklein.
 */
export const BADGE_META = {
  founding: {
    label: "Founding Instructor",
    short: "Founding",
    lines: ["Founding", "Instructor"],
    blurb:
      "Awarded automatically to the first instructors who joined Kidventures.",
    faceHi: "#FFF3C4",
    faceMid: "#F2C94C",
    faceLo: "#B8860B",
    ring: "#6B4226",
  },
  popular: {
    label: "Popular This Month",
    short: "Popular",
    lines: ["Popular", "This Month"],
    blurb:
      "Given to instructors with 5+ confirmed bookings in the current month.",
    faceHi: "#FFDCAE",
    faceMid: "#F2994A",
    faceLo: "#C25E00",
    ring: "#6B4226",
  },
  bronze: {
    label: "Highly Rated",
    short: "Bronze",
    lines: ["Highly", "Rated"],
    blurb:
      "For instructors with a 4.5★ average rating from at least 5 reviews.",
    faceHi: "#E4C29A",
    faceMid: "#B08D57",
    faceLo: "#6B4226",
    ring: "#4A2F16",
  },
  admin: {
    label: "Kidventures Pick",
    short: "Pick",
    lines: ["Kidventures", "Pick"],
    blurb:
      "A hand-picked badge the Kidventures team awards to standout instructors.",
    faceHi: "#FFF6D8",
    faceMid: "#FFD770",
    faceLo: "#C9971F",
    ring: "#6B4226",
  },
};

// Ribbon ek hi design/rang har badge ke liye - sirf medal ka metal color
// badalta hai (jaisa asli medal sets me hota hai: ribbon same, rank alag).
const RIBBON_STRIPES = ["#4A2F16", "#D9720C", "#F2C94C", "#D9720C", "#4A2F16"];

const FONT_SIZE = 7.5;
const MAX_TEXT_WIDTH = 32; // viewBox units - circle ke andar safe text area

/** Line lambi ho to compress kar deti hai (textLength), warna natural chhod deti hai. */
function fitText(line) {
  const estWidth = line.length * FONT_SIZE * 0.6;
  if (estWidth > MAX_TEXT_WIDTH) {
    return { textLength: MAX_TEXT_WIDTH, lengthAdjust: "spacingAndGlyphs" };
  }
  return {};
}

export default function BadgeMedal({
  type,
  size = 26,
  showRibbon = true,
  showLabel = false,
  className = "",
}) {
  const meta = BADGE_META[type];
  if (!meta) return null;

  const uid = `bm-${type}-${showRibbon ? "r" : "n"}-${showLabel ? "l" : "p"}`;
  const faceId = `${uid}-face`;
  const ribId = `${uid}-rib`;
  const glowId = `${uid}-glow`;

  const vbW = 60;
  const r = 21;
  // Ribbon tail chhoti rakhi hai (medal ke top se bas thoda upar) - taake
  // hanging medal ka clearance zyada bada na ho aur upar wala content na dabay.
  const vbH = showRibbon ? 74 : 60;
  const cy = showRibbon ? 50 : 30;
  const height = size * (vbH / vbW);
  const bigLabel = showLabel && size >= 40;

  return (
    <span
      title={meta.label}
      role="img"
      aria-label={meta.label}
      className={`inline-block align-middle ${className}`}
      style={{
        width: size,
        height,
        filter: "drop-shadow(0 3px 3px rgba(0,0,0,0.35))",
      }}
    >
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        width={size}
        height={height}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Glossy metal sphere: highlight offset toward the top-left */}
          <radialGradient id={faceId} cx="38%" cy="32%" r="75%">
            <stop offset="0%" stopColor={meta.faceHi} />
            <stop offset="55%" stopColor={meta.faceMid} />
            <stop offset="100%" stopColor={meta.faceLo} />
          </radialGradient>
          <linearGradient id={ribId} x1="0" y1="0" x2="1" y2="0">
            {RIBBON_STRIPES.map((c, i) => (
              <stop
                key={i}
                offset={`${(i / (RIBBON_STRIPES.length - 1)) * 100}%`}
                stopColor={c}
              />
            ))}
          </linearGradient>
          <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {showRibbon && (
          <>
            <polygon
              points="16,0 27,0 27,34 21.5,27 16,34"
              fill={`url(#${ribId})`}
            />
            <polygon
              points="33,0 44,0 44,34 38.5,27 33,34"
              fill={`url(#${ribId})`}
              opacity="0.88"
            />
          </>
        )}

        {/* Outer bezel */}
        <circle cx="30" cy={cy} r={r} fill={meta.ring} />
        <circle cx="30" cy={cy} r={r - 2.2} fill={`url(#${faceId})`} />
        {/* Inner bevel ring for a "rim" look */}
        <circle
          cx="30"
          cy={cy}
          r={r - 5.5}
          fill="none"
          stroke="#fff"
          strokeOpacity="0.4"
          strokeWidth="1"
        />
        <circle
          cx="30"
          cy={cy}
          r={r - 2.2}
          fill="none"
          stroke="#000"
          strokeOpacity="0.18"
          strokeWidth="1"
        />
        {/* Specular highlight */}
        <ellipse
          cx="23"
          cy={cy - 8}
          rx="10"
          ry="6"
          fill={`url(#${glowId})`}
          transform={`rotate(-25 23 ${cy - 8})`}
        />

        {bigLabel ? (
          // Sirf EK chhota word (meta.short) - do lines circle me kabhi
          // theek se fit nahi hoti, ek chhota word hamesha saaf dikhta hai.
          <text
            x="30"
            y={cy + 2.7}
            textAnchor="middle"
            fontSize={FONT_SIZE}
            fontWeight="700"
            fill={meta.ring}
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            {...fitText(meta.short)}
          >
            {meta.short}
          </text>
        ) : (
          <text
            x="30"
            y={cy + 6}
            textAnchor="middle"
            fontSize="17"
            fill={meta.ring}
            fillOpacity="0.9"
          >
            ★
          </text>
        )}
      </svg>
    </span>
  );
}
