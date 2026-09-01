import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../datepicker-theme.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import FavoriteButton from "../components/FavoriteButton";
import RecentlyViewed from "../components/RecentlyViewed";
import api from "../api/axios";
import heroImg from "../assets/hero.jpg"; // hero image: src/assets/hero.jpg

/* Cloudinary URL ko resize+auto-optimize karta hai. Agar URL Cloudinary
   ka na ho (jaise koi purani/manual image), waisi hi wapas kar deta hai. */
const cldOptimize = (url, width = 400) => {
  if (!url || !url.includes("res.cloudinary.com")) return url;
  return url.replace("/upload/", `/upload/w_${width},q_auto,f_auto/`);
};

/* ============================================================
   ICONS (sab SVG, koi emoji nahi) — ye frontend cheez hai, backend se nahi aati
   ============================================================ */
const CatIcon = ({ children }) => (
  <svg
    width="30"
    height="30"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#F5941F"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

// Category name -> icon. Backend sirf naam bhejta hai, icon yahan match karte hain.
// Jo naam match na ho uske liye neeche DefaultCatIcon use hota hai (crash nahi hoga).
const iconByCategory = {
  "Art & Painting": (
    <CatIcon>
      <path d="M12 2a10 10 0 0 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.6-1.4-.3-.3-.4-.7-.4-1.1 0-1 .8-1.8 1.8-1.8H17a5 5 0 0 0 5-5c0-4.4-4.5-8-10-8z" />
      <circle cx="7.5" cy="11.5" r="1" />
      <circle cx="10.5" cy="7.5" r="1" />
      <circle cx="15" cy="8" r="1" />
    </CatIcon>
  ),
  "Pottery & Clay": (
    <CatIcon>
      <path d="M8 3h8l-1 3a5 5 0 0 1 3 4.6V15a6 6 0 0 1-12 0v-4.4A5 5 0 0 1 9 6L8 3z" />
      <line x1="6" y1="21" x2="18" y2="21" />
    </CatIcon>
  ),
  Coding: (
    <CatIcon>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </CatIcon>
  ),
  Robotics: (
    <CatIcon>
      <rect x="4" y="8" width="16" height="12" rx="3" />
      <line x1="12" y1="4" x2="12" y2="8" />
      <circle cx="12" cy="3" r="1.2" />
      <circle cx="9" cy="13" r="1" />
      <circle cx="15" cy="13" r="1" />
      <line x1="9.5" y1="17" x2="14.5" y2="17" />
    </CatIcon>
  ),
  Baking: (
    <CatIcon>
      <path d="M6 13h12l-1.2 7.2a1 1 0 0 1-1 .8H8.2a1 1 0 0 1-1-.8L6 13z" />
      <path d="M5 13a3.5 3.5 0 0 1 2-6.3 3.5 3.5 0 0 1 5-2.2 3.5 3.5 0 0 1 5 2.2A3.5 3.5 0 0 1 19 13" />
    </CatIcon>
  ),
  Chess: (
    <CatIcon>
      <path d="M10 3h4l-1 3h2l-1.5 5h1L16 18H8l1.5-7h1L9 6h2l-1-3z" />
      <line x1="6" y1="21" x2="18" y2="21" />
      <line x1="8" y1="18" x2="16" y2="18" />
    </CatIcon>
  ),
  "Public Speaking": (
    <CatIcon>
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="8" y1="21" x2="16" y2="21" />
    </CatIcon>
  ),
  "STEM & Science": (
    <CatIcon>
      <path d="M9 2v6.5L4.5 17A2.5 2.5 0 0 0 6.7 21h10.6a2.5 2.5 0 0 0 2.2-4L15 8.5V2" />
      <line x1="8" y1="2" x2="16" y2="2" />
      <line x1="7" y1="15" x2="17" y2="15" />
    </CatIcon>
  ),
};
const DefaultCatIcon = (
  <CatIcon>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12h8M12 8v8" />
  </CatIcon>
);
const getCatIcon = (name) => iconByCategory[name] || DefaultCatIcon;

const SearchIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#F5941F"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const PinIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#3FA9E0"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const CalIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#F4C542"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const UserIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#3D2B1F"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const ShieldIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#3FA9E0"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);
const BookingIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#F5941F"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <path d="M9 16l2 2 4-4" />
  </svg>
);

/* "How It Works" step icons — currentColor taake har card apna accent
   rang khud de sake (bg-brand-cream badge ke andar). */
const HowIcon = ({ children, size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);
const IcDiscoverStep = (p) => (
  <HowIcon {...p}>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </HowIcon>
);
const IcBookStep = (p) => (
  <HowIcon {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <path d="M9 16l2 2 4-4" />
  </HowIcon>
);
const IcAttendStep = (p) => (
  <HowIcon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 13.5s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </HowIcon>
);
const IcReviewStep = (p) => (
  <HowIcon {...p}>
    <polygon points="12 2 15 8.5 22 9.5 17 14.5 18.5 21.5 12 18 5.5 21.5 7 14.5 2 9.5 9 8.5 12 2" />
  </HowIcon>
);

/* ============================================================
   API RESPONSE NORMALIZERS  <-- backend ka data yahan safe text/number/url mein badalta hai
   Ye helpers guarantee dete hain ke React ko kabhi RAW object na mile (warna page blank ho jata hai).
   Agar field naam alag ho to sirf yahan adjust karna.
   ============================================================ */

// backend array direct de ya { data:[...] } / { activities:[...] } — dono handle
const toList = (d) =>
  Array.isArray(d)
    ? d
    : d?.activities ||
      d?.instructors ||
      d?.categories ||
      d?.data ||
      d?.results ||
      [];

const fmtDate = (v) => {
  if (!v) return "";
  const dt = new Date(v);
  return isNaN(dt)
    ? ""
    : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

// kisi bhi value ko SAFE display-string banao (string / number / object sab handle)
const asText = (v) => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "object")
    return v.name || v.label || v.title || v.area || v.city || "";
  return "";
};

// location string bhi ho sakti hai ya object { area, city, address } — safe string do
const pickLocation = (v) => {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object")
    return v.area || v.city || v.name || v.label || v.address || "";
  return "";
};

// image string ho ya object { url } / { secure_url } — safe URL (ya null) do
const pickImg = (...vals) => {
  for (const v of vals) {
    if (!v) continue;
    if (typeof v === "string") return v;
    if (typeof v === "object") {
      if (v.url) return v.url;
      if (v.secure_url) return v.secure_url;
    }
  }
  return null;
};

// number safe banao (object aa jaye to bhi crash na ho)
const asNum = (v) => {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "object")
    return Number(v.average ?? v.value ?? v.count ?? 0) || 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

const normActivity = (a) => ({
  id: a._id || a.id,
  title: asText(a.title) || asText(a.name) || "Activity",
  ageGroup:
    asText(a.ageGroup) ||
    (a.ageMin != null && a.ageMax != null ? `${a.ageMin}-${a.ageMax}` : ""),
  date: a.nextSession?.date ? fmtDate(a.nextSession.date) : fmtDate(a.date),
  time: asText(a.nextSession?.startTime || a.nextSession?.time || a.time),
  location:
    pickLocation(a.location) ||
    pickLocation(a.area) ||
    pickLocation(a.neighborhood) ||
    (a.isOnline ? "Online" : ""),
  // Parent bilkul yehi deta hai — commission instructor ki earning se katta hai.
  price: a.price ?? "",
  rating: asNum(a.rating ?? a.averageRating),
  reviews: asNum(a.reviews ?? a.reviewCount ?? a.numReviews),
  image: pickImg(a.images?.[0], a.coverImage, a.image),
});

const normInstructor = (i) => ({
  id: i.user?._id || i.user || i._id || i.id,
  name:
    asText(i.name) ||
    asText(i.displayName) ||
    asText(i.user?.name) ||
    "Instructor",
  subject:
    asText(i.subject) ||
    asText(i.headline) ||
    asText(i.categories?.[0]) ||
    asText(i.specialty),
  rating: asNum(i.rating ?? i.averageRating),
  reviews: asNum(i.reviews ?? i.reviewCount),
  experience: asText(i.experience ?? i.yearsExperience ?? i.experienceYears),
  location:
    pickLocation(i.location) || pickLocation(i.area) || pickLocation(i.city),
  photo: pickImg(i.photo, i.avatar, i.profilePhoto, i.user?.avatar),
});

/* ============================================================
   SMALL UI HELPERS
   ============================================================ */
const CardSkeleton = ({ className = "" }) => (
  <div className={`animate-pulse rounded-2xl bg-brand-cream ${className}`} />
);

const RetryBox = ({ onRetry }) => (
  <div className="w-full rounded-2xl bg-brand-cream/60 px-6 py-8 text-center">
    <p className="mb-3 text-sm text-brand-brown/70">
      Couldn&apos;t load this section. Please check your connection and try
      again.
    </p>
    <button
      onClick={onRetry}
      className="cursor-pointer rounded-[10px] bg-brand-orange px-5 py-2 text-sm font-bold text-white"
    >
      Retry
    </button>
  </div>
);

function Dropdown({
  icon,
  label,
  value,
  options,
  onChange,
  placeholder,
  align = "left",
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <div className="relative flex flex-col rounded-lg bg-white px-2 py-1.5 md:min-w-[130px] md:flex-1 md:rounded-none md:bg-transparent md:px-3 md:py-2">
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-[11px] font-bold text-brand-brown md:text-[13px]">
          {label}
        </span>
      </div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mt-0.5 flex items-center justify-between gap-1 overflow-hidden whitespace-nowrap text-left text-[11px] md:mt-1 md:text-[13px]"
      >
        <span
          className={`truncate ${selected?.value ? "text-brand-brown" : "text-gray-400"}`}
        >
          {selected?.value ? selected.label : placeholder}
        </span>
        <span className="text-[9px] text-gray-400">▼</span>
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-[998]"
            onClick={() => setOpen(false)}
          />
          {/*
            SCROLL BUG FIX: pehle yeh hamesha "left-0" tha, jis ki wajah se
            teesre (rightmost) dropdown — jaise mobile par "Age" — ka panel
            (min-w-[180px]) screen ke right edge se bahar nikal jata tha.
            Us se poori page ki scrollWidth viewport se zyada ho jati thi,
            aur page mobile par side-to-side drag/scroll hone lagti thi
            (jaisa user ne report kiya: "screen fixed nahi rehti, hath se
            move hoti hai"). Ab rightmost dropdown "right-0" (align="right")
            leta hai taake panel screen ke andar hi khule, bahar na nikle.
            max-w-[calc(100vw-2rem)] ek extra safety hai taake chhoti
            screens par bhi panel kabhi viewport se bara na ho.
          */}
          <div
            className={`absolute top-full z-[999] mt-2 max-h-[240px] w-max max-w-[calc(100vw-2rem)] min-w-[180px] overflow-y-auto rounded-xl bg-white p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.15)] ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            {options.map((o) => (
              <button
                type="button"
                key={o.value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`block w-full whitespace-nowrap rounded-lg px-3.5 py-2.5 text-left text-[13px] hover:bg-gray-100 ${
                  value === o.value
                    ? "bg-brand-cream font-bold text-brand-brown"
                    : "font-medium text-brand-brown"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* Date filter — ab preset codes ("today"/"weekend"...) ki jagah asli
   calendar hai. Panel wahi "Dropdown" jaisa dikhta hai, andar sirf
   react-datepicker inline calendar hai. */
function DateDropdown({ icon, label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const display = value
    ? value.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
  return (
    <div className="relative flex flex-col rounded-lg bg-white px-2 py-1.5 md:min-w-[130px] md:flex-1 md:rounded-none md:bg-transparent md:px-3 md:py-2">
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-[11px] font-bold text-brand-brown md:text-[13px]">
          {label}
        </span>
      </div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mt-0.5 flex items-center justify-between gap-1 overflow-hidden whitespace-nowrap text-left text-[11px] md:mt-1 md:text-[13px]"
      >
        <span
          className={`truncate ${value ? "text-brand-brown" : "text-gray-400"}`}
        >
          {value ? display : "Any date"}
        </span>
        <span className="text-[9px] text-gray-400">▼</span>
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-[998]"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full z-[999] mt-2 w-max max-w-[calc(100vw-2rem)] rounded-xl bg-white p-2 shadow-[0_8px_30px_rgba(0,0,0,0.15)]">
            <DatePicker
              selected={value}
              onChange={(date) => {
                onChange(date);
                setOpen(false);
              }}
              minDate={new Date()}
              inline
            />
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="mt-1 w-full rounded-lg px-3 py-2 text-center text-[12px] font-semibold text-brand-orange hover:bg-brand-cream"
              >
                Clear date
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SectionHeader({ title, link }) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <h2 className="m-0 text-xl font-bold text-brand-brown sm:text-2xl">
        {title}
      </h2>
      <Link
        to={link}
        className="text-[13px] font-semibold text-brand-orange no-underline"
      >
        View all →
      </Link>
    </div>
  );
}

/* ============================================================
   MOMENTS MARQUEE (auto-scrolling image band)
   Real class photos hosted on Cloudinary, resized+auto-optimized
   via w_500,q_auto,f_auto transformation for fast load.
   ============================================================ */
const galleryImages = [
  "https://res.cloudinary.com/rwnkpzbs/image/upload/w_500,q_auto,f_auto/v1786558300/kid1.jpg",
  "https://res.cloudinary.com/rwnkpzbs/image/upload/w_500,q_auto,f_auto/v1786620602/kid2.jpg",
  "https://res.cloudinary.com/rwnkpzbs/image/upload/w_500,q_auto,f_auto/v1786620616/kid3.jpg",
  "https://res.cloudinary.com/rwnkpzbs/image/upload/w_500,q_auto,f_auto/v1786620667/kid4.jpg",
  "https://res.cloudinary.com/rwnkpzbs/image/upload/w_500,q_auto,f_auto/v1786620672/kid8.png",
  "https://res.cloudinary.com/rwnkpzbs/image/upload/w_500,q_auto,f_auto/v1786620673/kid6.png",
  "https://res.cloudinary.com/rwnkpzbs/image/upload/w_500,q_auto,f_auto/v1786620674/kid7.png",
  "https://res.cloudinary.com/rwnkpzbs/image/upload/w_500,q_auto,f_auto/v1786620674/kid5.png",
  "https://res.cloudinary.com/rwnkpzbs/image/upload/w_500,q_auto,f_auto/v1786620716/kid10.png",
  "https://res.cloudinary.com/rwnkpzbs/image/upload/w_500,q_auto,f_auto/v1786620716/kid9.png",
];

function MomentsMarquee() {
  return (
    <section className="overflow-hidden bg-brand-cream/40 py-8">
      <p className="mb-4 text-center text-xs font-semibold tracking-[0.15em] text-brand-brown/60">
        MOMENTS FROM OUR CLASSES
      </p>
      <div className="group relative flex overflow-hidden">
        {/* strip do baar (duplicate) taake loop seamless rahe */}
        <div className="flex w-max animate-[kvmarquee_16s_linear_infinite] gap-4 pr-4 group-hover:[animation-play-state:paused] motion-reduce:animate-none sm:animate-[kvmarquee_28s_linear_infinite]">
          {[...galleryImages, ...galleryImages].map((src, i) => (
            <img
              key={i}
              src={src}
              alt="A moment from a Kidventures class"
              loading="lazy"
              className="h-36 w-56 shrink-0 rounded-2xl object-cover shadow-[0_2px_14px_rgba(61,43,31,0.10)] sm:h-40 sm:w-64"
            />
          ))}
        </div>
      </div>
      <style>{`@keyframes kvmarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </section>
  );
}

/* ============================================================
   HOMEPAGE
   ============================================================ */
function Homepage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [dateValue, setDateValue] = useState(null);
  const [age, setAge] = useState("");

  // Location aur "Online classes only" ek doosre ko exclude karte hain -
  // ek class ya to kisi jagah par hoti hai ya online, dono nahi.
  const handleLocationChange = (val) => {
    setLocation(val);
    if (val) setOnlineOnly(false);
  };
  const handleOnlineToggle = (checked) => {
    setOnlineOnly(checked);
    if (checked) setLocation("");
  };

  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [topInstructors, setTopInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(false);
    try {
      const [catRes, actRes, insRes] = await Promise.allSettled([
        api.get("/categories"),
        api.get("/activities", {
          params: { isFeatured: true, status: "active", limit: 4 },
        }),
        api.get("/instructors", { params: { limit: 4, sort: "-rating" } }),
      ]);

      if (catRes.status === "fulfilled")
        setCategories(toList(catRes.value.data));
      if (actRes.status === "fulfilled")
        setFeatured(toList(actRes.value.data).map(normActivity).slice(0, 4));
      if (insRes.status === "fulfilled")
        setTopInstructors(
          toList(insRes.value.data).map(normInstructor).slice(0, 4),
        );

      if ([catRes, actRes, insRes].every((r) => r.status === "rejected"))
        setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (keyword) params.append("search", keyword);
    if (onlineOnly) params.append("location", "Online");
    else if (location) params.append("location", location);
    if (dateValue) {
      // Local date (YYYY-MM-DD) — toISOString() UTC ki wajah se ek din
      // peeche/aage chali jati, is liye khud bana rahe hain.
      const y = dateValue.getFullYear();
      const m = String(dateValue.getMonth() + 1).padStart(2, "0");
      const d = String(dateValue.getDate()).padStart(2, "0");
      params.append("date", `${y}-${m}-${d}`);
    }
    if (age) params.append("age", age);
    navigate(`/activities?${params.toString()}`);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-sans text-brand-brown [color-scheme:light]">
      {/* SEO */}
      <Helmet>
        <title>
          Kidventures — Kids&apos; Activities &amp; Classes in Dubai
        </title>
        <meta
          name="description"
          content="Discover and book trusted kids' activities and classes across Dubai — art, coding, robotics, baking and more. Verified instructors, easy booking."
        />
      </Helmet>

      <Navbar />

      {/* ================= HERO ================= */}
      <section className="relative flex min-h-[440px] items-center px-4 py-8 sm:px-6 md:px-10">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={heroImg}
            alt="Children happily taking part in creative and educational activities"
            className="h-full w-full object-cover object-right [filter:saturate(1.15)_contrast(1.06)]"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-cream/70 via-brand-cream/25 to-transparent md:bg-gradient-to-r md:from-brand-cream/90 md:via-brand-cream/35 md:via-55% md:to-transparent md:to-88%" />
        </div>

        <div className="relative w-full max-w-3xl">
          <h1 className="mb-2 text-[23px] font-bold leading-tight text-brand-brown [text-shadow:0_1px_14px_rgba(255,255,255,0.7)] sm:text-[28px] md:text-[32px] md:[text-shadow:0_1px_16px_rgba(255,255,255,0.6)]">
            Discover Inspiring Activities for Every Child
          </h1>
          <p className="mb-5 text-sm font-medium text-brand-brown [text-shadow:0_1px_10px_rgba(255,255,255,0.85)] md:font-normal md:text-brand-brown/85 md:[text-shadow:0_1px_12px_rgba(255,255,255,0.5)]">
            Trusted instructors. Exciting experiences. Endless possibilities.
          </p>

          {/* SEARCH BAR */}
          <div className="rounded-2xl bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
            <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-stretch md:gap-0">
              {/* Keyword — mobile pe full width, desktop pe pehla khaana */}
              <div className="flex flex-col px-3 py-2 md:min-w-[200px] md:flex-[2]">
                <div className="flex items-center gap-1.5">
                  <SearchIcon />
                  <span className="text-[13px] font-bold text-brand-brown">
                    What would you like to learn?
                  </span>
                </div>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="e.g. Pottery, Coding, Baking"
                  className="mt-1 w-full border-none bg-transparent p-0 text-[13px] text-brand-brown outline-none placeholder:text-gray-400"
                />
              </div>

              {/* Filters — mobile: 3-column compact grid | desktop: inline row with dividers */}
              <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-brand-cream/30 p-1.5 md:flex md:flex-1 md:gap-0 md:divide-x md:divide-gray-200 md:rounded-none md:border-l md:border-gray-200 md:bg-transparent md:p-0 md:pl-1">
                <Dropdown
                  icon={<PinIcon />}
                  label="Location"
                  placeholder="Any location"
                  value={location}
                  onChange={handleLocationChange}
                  options={[
                    { value: "", label: "Any location" },
                    { value: "Jumeirah", label: "Jumeirah" },
                    { value: "Mirdif", label: "Mirdif" },
                    { value: "Arabian Ranches", label: "Arabian Ranches" },
                  ]}
                />
                <DateDropdown
                  icon={<CalIcon />}
                  label="Date"
                  value={dateValue}
                  onChange={setDateValue}
                />
                <Dropdown
                  icon={<UserIcon />}
                  label="Age"
                  placeholder="Any age"
                  value={age}
                  onChange={setAge}
                  align="right"
                  options={[
                    { value: "", label: "Any age" },
                    { value: "3-5", label: "3 - 5 years" },
                    { value: "6-8", label: "6 - 8 years" },
                    { value: "9-12", label: "9 - 12 years" },
                    { value: "13-16", label: "13 - 16 years" },
                  ]}
                />
              </div>

              {/* Button — mobile full width, desktop right side */}
              <button
                onClick={handleSearch}
                className="h-12 w-full cursor-pointer whitespace-nowrap rounded-[10px] bg-brand-orange px-6 text-sm font-bold text-white md:ml-2 md:w-auto md:self-center"
              >
                Find Activities
              </button>
            </div>

            {/* "Online" ab Location dropdown me nahi — apna alag toggle hai,
                kyunke ek class ya to kisi jagah hoti hai ya online, dono nahi */}
            <label className="mt-1.5 flex w-fit cursor-pointer items-center gap-2 px-3 text-[12px] font-medium text-brand-brown/80">
              <input
                type="checkbox"
                checked={onlineOnly}
                onChange={(e) => handleOnlineToggle(e.target.checked)}
                className="h-3.5 w-3.5 accent-brand-orange"
              />
              Online classes only
            </label>
          </div>

          {/* INFO CARDS */}
          <div className="mt-[18px] flex flex-col gap-3.5 sm:flex-row">
            <div className="flex items-center gap-2.5 rounded-[10px] bg-white px-4 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.08)]">
              <ShieldIcon />
              <div>
                <div className="text-xs font-bold text-brand-brown">
                  Verified Instructors
                </div>
                <div className="text-[10px] text-brand-brown/60">
                  All our instructors are vetted
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-[10px] bg-white px-4 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.08)]">
              <BookingIcon />
              <div>
                <div className="text-xs font-bold text-brand-brown">
                  Easy Booking
                </div>
                <div className="text-[10px] text-brand-brown/60">
                  Book in minutes, stress-free
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= MOMENTS MARQUEE ================= */}
      <MomentsMarquee />

      {/* Recently viewed (agar koi class dekhi ho) */}
      <RecentlyViewed />

      {/* ================= CATEGORIES ================= */}
      <section className="bg-white px-4 py-12 sm:px-6 md:px-10">
        <SectionHeader title="Browse by Category" link="/activities" />
        {loading ? (
          <div className="flex flex-wrap gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <CardSkeleton key={i} className="h-[96px] w-[46%] sm:w-28" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <p className="text-sm text-brand-brown/60">No categories yet.</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {categories.map((cat) => (
              <button
                key={cat._id || cat.id || cat.name}
                onClick={() =>
                  navigate(
                    `/activities?category=${encodeURIComponent(cat.slug || cat.name)}`,
                  )
                }
                className="w-[46%] cursor-pointer rounded-2xl bg-white px-2.5 py-4 text-center shadow-[0_2px_12px_rgba(61,43,31,0.08)] transition hover:-translate-y-0.5 sm:w-28"
              >
                <div className="flex justify-center">
                  {getCatIcon(cat.name)}
                </div>
                <div className="mt-1.5 text-xs font-semibold text-brand-brown">
                  {asText(cat.name)}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ================= FEATURED ACTIVITIES ================= */}
      <section className="bg-white px-4 pb-12 pt-2 sm:px-6 md:px-10">
        <SectionHeader title="Featured Activities" link="/activities" />
        {loading ? (
          <div className="flex flex-wrap gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton
                key={i}
                className="h-[280px] w-full sm:w-[calc(50%-10px)] lg:w-[230px]"
              />
            ))}
          </div>
        ) : error && featured.length === 0 ? (
          <RetryBox onRetry={loadData} />
        ) : featured.length === 0 ? (
          <p className="text-sm text-brand-brown/60">
            No featured activities right now.
          </p>
        ) : (
          <div className="flex flex-wrap gap-5">
            {featured.map((a) => (
              <div
                key={a.id}
                className="w-full overflow-hidden rounded-2xl bg-white shadow-[0_2px_14px_rgba(61,43,31,0.10)] sm:w-[calc(50%-10px)] lg:w-[230px]"
              >
                <Link to={`/activity/${a.id}`} className="block no-underline">
                  <div className="relative">
                    {a.image ? (
                      <img
                        src={cldOptimize(a.image, 400)}
                        alt={a.title}
                        loading="lazy"
                        className="h-[130px] w-full object-cover"
                      />
                    ) : (
                      <div className="h-[130px] w-full bg-brand-cream" />
                    )}
                    <FavoriteButton
                      item={a}
                      className="absolute right-2 top-2"
                    />
                  </div>
                  <div className="px-3 pt-3">
                    <div className="text-sm font-bold text-brand-brown">
                      {a.title}
                    </div>
                    {a.ageGroup && (
                      <div className="text-xs text-brand-brown/70">
                        Ages {a.ageGroup}
                      </div>
                    )}
                    {(a.date || a.time) && (
                      <div className="text-xs text-brand-brown/70">
                        {[a.date, a.time].filter(Boolean).join(" · ")}
                      </div>
                    )}
                    {a.location && (
                      <div className="text-xs text-brand-brown/70">
                        {a.location}
                      </div>
                    )}
                    <div className="mt-1.5 flex justify-between text-[13px] font-bold text-brand-brown">
                      <span>{a.price !== "" ? `AED ${a.price}` : ""}</span>
                      <span className="text-brand-gold">
                        ★ {a.rating} ({a.reviews})
                      </span>
                    </div>
                  </div>
                </Link>
                <div className="px-3 pb-3">
                  <Link
                    to={`/activity/${a.id}`}
                    className="mt-2.5 block cursor-pointer rounded-[10px] bg-brand-sky py-2.5 text-center font-bold text-white no-underline"
                  >
                    Book Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ================= INSTRUCTORS ================= */}
      <section className="bg-brand-cream px-4 pb-12 pt-2 sm:px-6 md:px-10">
        <SectionHeader title="Meet Our Top Instructors" link="/instructors" />
        {loading ? (
          <div className="flex flex-wrap gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton
                key={i}
                className="h-[220px] w-full bg-white sm:w-[calc(50%-10px)] lg:w-[220px]"
              />
            ))}
          </div>
        ) : topInstructors.length === 0 ? (
          <p className="text-sm text-brand-brown/60">
            Instructors coming soon.
          </p>
        ) : (
          <div className="flex flex-wrap gap-5">
            {topInstructors.map((ins) => (
              <div
                key={ins.id}
                className="w-full rounded-2xl bg-white p-[18px] text-center sm:w-[calc(50%-10px)] lg:w-[220px]"
              >
                {ins.photo ? (
                  <img
                    src={cldOptimize(ins.photo, 120)}
                    alt={`${ins.name} — instructor`}
                    loading="lazy"
                    className="mx-auto mb-2.5 h-[60px] w-[60px] rounded-full object-cover"
                  />
                ) : (
                  <div className="mx-auto mb-2.5 h-[60px] w-[60px] rounded-full bg-brand-gold" />
                )}
                <div className="font-bold text-brand-brown">{ins.name}</div>
                {ins.subject && (
                  <div className="text-xs text-brand-brown/70">
                    {ins.subject}
                  </div>
                )}
                <div className="text-xs text-brand-gold">
                  ★ {ins.rating} ({ins.reviews})
                </div>
                {ins.experience !== "" && (
                  <div className="text-[11px] text-brand-brown/60">
                    {ins.experience} years experience
                  </div>
                )}
                {ins.location && (
                  <div className="mb-2.5 text-[11px] text-brand-brown/60">
                    <span className="inline-flex items-center justify-center gap-1">
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#3FA9E0"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {ins.location}
                    </span>
                  </div>
                )}
                <Link
                  to={`/instructor/${ins.id}`}
                  className="mt-1 block w-full rounded-[10px] border-2 border-brand-orange bg-white py-2 text-center font-bold text-brand-orange no-underline"
                >
                  View Profile
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="bg-white px-4 py-12 text-center sm:px-6 md:px-10">
        <h2 className="mb-8 text-xl font-bold text-brand-brown sm:text-2xl">
          How Kidventures Works
        </h2>
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
          {[
            {
              step: "Discover",
              desc: "Explore activities by category, age, location and more.",
              Icon: IcDiscoverStep,
              color: "#F5941F",
            },
            {
              step: "Book",
              desc: "Choose your preferred date and book in minutes.",
              Icon: IcBookStep,
              color: "#3FA9E0",
            },
            {
              step: "Attend",
              desc: "Enjoy the class and have an amazing experience!",
              Icon: IcAttendStep,
              color: "#D9A400",
            },
            {
              step: "Review",
              desc: "Share your feedback and help others choose.",
              Icon: IcReviewStep,
              color: "#F5941F",
            },
          ].map((s, i) => (
            <div
              key={s.step}
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5"
            >
              <div
                className="relative mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-cream sm:h-14 sm:w-14"
                style={{ color: s.color }}
              >
                <s.Icon size={24} />
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-orange text-[10px] font-bold text-white">
                  {i + 1}
                </span>
              </div>
              <div className="mb-1 text-sm font-bold text-brand-brown sm:text-base">
                {s.step}
              </div>
              <div className="text-xs leading-relaxed text-brand-brown/70 sm:text-[13px]">
                {s.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="mx-4 mb-12 rounded-[20px] bg-brand-cream px-6 py-10 text-center sm:mx-6 md:mx-10">
        <h2 className="text-xl font-bold text-brand-orange sm:text-2xl">
          Ready to start your child&apos;s adventure?
        </h2>
        <p className="mb-4 text-brand-brown/70">
          Find the perfect activity today, right here in Dubai.
        </p>
        <Link
          to="/activities"
          className="inline-block rounded-[10px] bg-brand-orange px-7 py-3 font-bold text-white no-underline"
        >
          Explore Activities
        </Link>
      </section>

      {/* ================= REQUEST A CLASS ================= */}
      <section className="mx-4 mb-12 flex flex-wrap items-center justify-between gap-5 rounded-[20px] border-2 border-dashed border-brand-orange px-6 py-8 sm:mx-6 md:mx-10 md:px-10">
        <div className="flex min-w-[280px] flex-1 items-center gap-[18px]">
          <div className="flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center rounded-[14px] bg-brand-cream">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#F5941F"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <div>
            <h3 className="mb-1 text-[17px] font-bold text-brand-brown">
              Can&apos;t find the class you&apos;re looking for?
            </h3>
            <p className="text-[13px] text-brand-brown/70">
              Tell us what your child wants to learn, and we&apos;ll work on
              bringing it to your area.
            </p>
          </div>
        </div>
        <Link
          to="/request-class"
          className="whitespace-nowrap rounded-[10px] bg-brand-orange px-6 py-3 text-sm font-bold text-white no-underline"
        >
          Request a Class
        </Link>
      </section>

      <Footer />
    </div>
  );
}

export default Homepage;
