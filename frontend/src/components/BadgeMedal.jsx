/**
 * BadgeMedal — chota, brand-colored (yellow/orange/brown) medal icon.
 *
 * `type` in 4 me se ek hona chahiyeh: "founding" | "popular" | "bronze" | "admin".
 * Har type ka apna color aur label BADGE_META me define hai — naya badge
 * add karna ho to bas yahan ek entry aur bana do.
 *
 * `size` medal ki width (px) hai — 40px+ par medal ke andar chota
 * uppercase label bhi dikhta hai (badges info page, instructor hero jaisi
 * badi jagah ke liye), chote size par (list/card me) sirf medal + tooltip.
 */
export const BADGE_META = {
  founding: {
    label: "Founding Instructor",
    short: "Founding",
    blurb:
      "Awarded automatically to the first instructors who joined Kidventures.",
    faceFrom: "#FFE9A8",
    faceTo: "#D9A521",
    ring: "#8B5E34",
    ribbonFrom: "#6B4226",
    ribbonTo: "#8B5E34",
  },
  popular: {
    label: "Popular This Month",
    short: "Popular",
    blurb:
      "Given to instructors with 5+ confirmed bookings in the current month.",
    faceFrom: "#FFC98A",
    faceTo: "#DE7A17",
    ring: "#8B5E34",
    ribbonFrom: "#6B4226",
    ribbonTo: "#8B5E34",
  },
  bronze: {
    label: "Highly Rated",
    short: "Bronze",
    blurb:
      "For instructors with a 4.5★ average rating from at least 5 reviews.",
    faceFrom: "#D8A768",
    faceTo: "#8C5A2B",
    ring: "#5C3D1E",
    ribbonFrom: "#4A2F16",
    ribbonTo: "#6B4226",
  },
  admin: {
    label: "Kidventures Pick",
    short: "Pick",
    blurb:
      "A hand-picked badge the Kidventures team awards to standout instructors.",
    faceFrom: "#FFEFB0",
    faceTo: "#C9971F",
    ring: "#8B5E34",
    ribbonFrom: "#6B4226",
    ribbonTo: "#8B5E34",
  },
};

export default function BadgeMedal({
  type,
  size = 26,
  showRibbon = true,
  showLabel = false,
  className = "",
}) {
  const meta = BADGE_META[type];
  if (!meta) return null;

  const faceId = `bm-face-${type}`;
  const ribId = `bm-rib-${type}`;
  const vbH = showRibbon ? 80 : 60;
  const cy = showRibbon ? 50 : 30;
  const height = size * (vbH / 60);

  return (
    <span
      title={meta.label}
      role="img"
      aria-label={meta.label}
      className={`inline-block align-middle ${className}`}
      style={{ width: size, height }}
    >
      <svg
        viewBox={`0 0 60 ${vbH}`}
        width={size}
        height={height}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={faceId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={meta.faceFrom} />
            <stop offset="100%" stopColor={meta.faceTo} />
          </linearGradient>
          <linearGradient id={ribId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={meta.ribbonFrom} />
            <stop offset="100%" stopColor={meta.ribbonTo} />
          </linearGradient>
        </defs>

        {showRibbon && (
          <>
            <polygon points="19,0 27,0 33,32 13,32" fill={`url(#${ribId})`} />
            <polygon
              points="33,0 41,0 47,32 27,32"
              fill={`url(#${ribId})`}
              opacity="0.82"
            />
          </>
        )}

        <circle
          cx="30"
          cy={cy}
          r="22"
          fill={`url(#${faceId})`}
          stroke={meta.ring}
          strokeWidth="2.5"
        />
        <circle
          cx="30"
          cy={cy}
          r="17.5"
          fill="none"
          stroke="#fff"
          strokeOpacity="0.55"
          strokeWidth="1"
        />

        {showLabel && size >= 40 ? (
          <text
            x="30"
            y={cy + 3}
            textAnchor="middle"
            fontSize="7.5"
            fontWeight="700"
            fill="#fff"
            fillOpacity="0.95"
            style={{ fontFamily: "system-ui, sans-serif", letterSpacing: 0.3 }}
          >
            {meta.short.toUpperCase()}
          </text>
        ) : (
          <text
            x="30"
            y={cy + 6.5}
            textAnchor="middle"
            fontSize="18"
            fill="#fff"
            fillOpacity="0.95"
          >
            ★
          </text>
        )}
      </svg>
    </span>
  );
}
