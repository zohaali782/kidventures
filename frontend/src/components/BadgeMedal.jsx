import foundingFull from "../assets/badges/founding-full.png";
import foundingCoin from "../assets/badges/founding-coin.png";
import popularFull from "../assets/badges/popular-full.png";
import popularCoin from "../assets/badges/popular-coin.png";
import bronzeFull from "../assets/badges/bronze-full.png";
import bronzeCoin from "../assets/badges/bronze-coin.png";
import adminFull from "../assets/badges/admin-full.png";
import adminCoin from "../assets/badges/admin-coin.png";

/**
 * BadgeMedal — asli photoreal medal images (gold/enamel look) use karta hai,
 * hand-drawn SVG ki jagah. Har badge ka apna PNG hai, do variants me:
 *  - "full"  -> medal + ribbon (bade/hero jagah ke liye, jaise badges info page)
 *  - "coin"  -> sirf gol medal, ribbon ke bagair (chote inline badge ke liye,
 *               jaise instructor card me naam ke agay)
 * Naya badge add karna ho to `IMAGES` me ek entry aur `BADGE_META` me
 * label/blurb add kar dena.
 *
 * NOTE: `showLabel` prop ab sirf backward-compatibility ke liye accept hoti
 * hai (pehle SVG text ke liye thi) - ab label image ke andar hi engraved
 * hai, isliye ye prop kuch nahi karti. Baaki saari calling files me koi
 * change ki zaroorat nahi.
 */
export const BADGE_META = {
  founding: {
    label: "Founding Instructor",
    blurb:
      "Awarded automatically to the first instructors who joined Kidventures.",
  },
  popular: {
    label: "Popular This Month",
    blurb:
      "Given to instructors with 5+ confirmed bookings in the current month.",
  },
  bronze: {
    label: "Highly Rated",
    blurb:
      "For instructors with a 4.5★ average rating from at least 5 reviews.",
  },
  admin: {
    label: "Kidventures Pick",
    blurb:
      "A hand-picked badge the Kidventures team awards to standout instructors.",
  },
};

// Har image ka apna aspect ratio (height/width) - taake `size` (width) diye
// jaane par height sahi proportion me nikle aur medal khinch/squeeze na ho.
const IMAGES = {
  founding: {
    full: foundingFull,
    fullRatio: 366 / 300,
    coin: foundingCoin,
    coinRatio: 110 / 160,
  },
  popular: {
    full: popularFull,
    fullRatio: 356 / 300,
    coin: popularCoin,
    coinRatio: 105 / 160,
  },
  bronze: {
    full: bronzeFull,
    fullRatio: 395 / 300,
    coin: bronzeCoin,
    coinRatio: 136 / 160,
  },
  admin: {
    full: adminFull,
    fullRatio: 365 / 300,
    coin: adminCoin,
    coinRatio: 117 / 160,
  },
};

export default function BadgeMedal({
  type,
  size = 26,
  showRibbon = true,
  // eslint-disable-next-line no-unused-vars
  showLabel,
  className = "",
}) {
  const meta = BADGE_META[type];
  const img = IMAGES[type];
  if (!meta || !img) return null;

  const src = showRibbon ? img.full : img.coin;
  const ratio = showRibbon ? img.fullRatio : img.coinRatio;
  const height = Math.round(size * ratio);

  return (
    <img
      src={src}
      alt={meta.label}
      title={meta.label}
      width={size}
      height={height}
      className={`inline-block align-middle ${className}`}
      style={{
        filter: "drop-shadow(0 3px 3px rgba(0,0,0,0.35))",
        objectFit: "contain",
      }}
    />
  );
}
