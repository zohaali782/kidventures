/**
 * Stars - rating ko 5 sitaron ki shakl mein dikhata hai.
 *
 * Pehle har card par sirf "★ 4.5 (3)" likha hota tha, ek chhote se text
 * mein, jo nazar hi nahi aata tha. Parents ke liye rating sab se ahem
 * cheezon mein se hai, is liye ab poore 5 sitare dikhte hain.
 *
 * Aadhe sitare ke liye koi alag icon nahi banaya: neeche khaali sitaron
 * ki qatar hai, aur upar bhari hui qatar jo rating ke hisaab se kaat di
 * jati hai (4.5 par 90% chaurai). Is tarah 4.3 aur 4.8 ka farq bhi
 * nazar aata hai, aur sirf ek hi SVG shape chalti rehti hai.
 */
export default function Stars({ value = 0, size = 16, className = "" }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  const pct = (v / 5) * 100;

  const Row = ({ fill }) => (
    <span className="flex" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={fill}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          className="shrink-0"
        >
          <polygon points="12 2.8 14.9 9 21.6 9.9 16.8 14.6 18 21.2 12 18 6 21.2 7.2 14.6 2.4 9.9 9.1 9" />
        </svg>
      ))}
    </span>
  );

  return (
    <span
      className={`relative inline-block align-middle leading-none text-brand-gold ${className}`}
      title={`${v.toFixed(1)} out of 5`}
    >
      <Row fill="none" />
      <span
        className="absolute left-0 top-0 overflow-hidden"
        style={{ width: `${pct}%` }}
      >
        <Row fill="currentColor" />
      </span>
    </span>
  );
}
