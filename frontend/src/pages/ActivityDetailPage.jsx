import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../api/axios";
import { addRecentlyViewed } from "../api/favorites";
import { getStoredUser } from "../api/auth";
import FavoriteButton from "../components/FavoriteButton";
import {
  toList,
  normActivity,
  asText,
  pickImg,
  pickLocation,
  asNum,
  fmtDate,
} from "../api/normalize";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/* location object se lat/lng nikaalo (jo bhi shape ho) */
const getCoords = (loc) => {
  if (!loc || typeof loc !== "object") return null;
  if (typeof loc.lat === "number" && typeof loc.lng === "number")
    return { lat: loc.lat, lng: loc.lng };
  const c = loc.coordinates || loc.geo?.coordinates;
  if (Array.isArray(c) && c.length === 2) {
    // GeoJSON = [lng, lat]
    return { lat: Number(c[1]), lng: Number(c[0]) };
  }
  if (loc.coordinates && typeof loc.coordinates === "object") {
    const { lat, lng } = loc.coordinates;
    if (lat != null && lng != null)
      return { lat: Number(lat), lng: Number(lng) };
  }
  return null;
};

/* known Dubai areas ke approx coordinates (backend me exact coords na hon to) */
const AREA_COORDS = {
  jumeirah: { lat: 25.2088, lng: 55.2568 },
  mirdif: { lat: 25.2178, lng: 55.4183 },
  "al barsha": { lat: 25.1131, lng: 55.1969 },
  "motor city": { lat: 25.043, lng: 55.241 },
  "al quoz": { lat: 25.136, lng: 55.233 },
  "dubai silicon oasis": { lat: 25.121, lng: 55.3773 },
  "arabian ranches": { lat: 25.053, lng: 55.267 },
};
const DUBAI_CENTER = { lat: 25.2048, lng: 55.2708 };
const areaCoords = (area) => {
  if (!area) return null;
  return AREA_COORDS[String(area).trim().toLowerCase()] || DUBAI_CENTER;
};
/* Cloudinary URL ko resize+auto-optimize karta hai. Agar URL Cloudinary
   ka na ho, waisi hi wapas kar deta hai. */
const cldOptimize = (url, width = 500) => {
  if (!url || !url.includes("res.cloudinary.com")) return url;
  return url.replace("/upload/", `/upload/w_${width},q_auto,f_auto/`);
};
const sameDay = (a, b) =>
  a &&
  b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const Check = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#F5941F"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const Dot = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#3D2B1F"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="opacity-55"
  >
    <circle cx="12" cy="12" r="9" />
  </svg>
);
const ip = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};
const UserIcon = () => (
  <svg {...ip} stroke="#F5941F">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const ClockIcon = () => (
  <svg {...ip} stroke="#3FA9E0">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
const PinIcon = () => (
  <svg {...ip} stroke="#F5941F">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const GlobeIcon = () => (
  <svg {...ip} stroke="#3FA9E0">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
  </svg>
);
const LockIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
const ShareIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="m8.6 13.5 6.8 4M15.4 6.5 8.6 10.5" />
  </svg>
);
const DirectionsArrowIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
);
const VerifiedBadge = () => (
  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2F9E44]">
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="#2F9E44"
      stroke="none"
    >
      <path d="M12 2l2.4 2.4 3.4-.5.5 3.4L20.6 12l-2.3 2.3.5 3.4-3.4.5L12 20.6l-2.3-2.4-3.4.5-.5-3.4L2.4 12l2.4-2.3-.5-3.4 3.4-.5L12 2z" />
      <path
        d="M9 12l2 2 4-4"
        stroke="#fff"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
    Verified Instructor
  </span>
);

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 py-2.5 text-[13px]">
      <span className="text-brand-brown/70">{label}</span>
      <span className="max-w-[60%] text-right font-semibold text-brand-brown">
        {value}
      </span>
    </div>
  );
}

function ActivityDetailPage() {
  const { id } = useParams();

  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [related, setRelated] = useState([]);
  const [insProfile, setInsProfile] = useState(null);

  const [tab, setTab] = useState("details");
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [count, setCount] = useState(1);
  const [copied, setCopied] = useState(false);
  const [reviewList, setReviewList] = useState([]);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [revError, setRevError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadReviews = async () => {
    try {
      const r = await api.get("/reviews", {
        params: { activity: id, limit: 20 },
      });
      setReviewList(r.data?.reviews || []);
    } catch {
      /* ignore */
    }
  };
  const submitReview = async () => {
    setRevError("");
    if (!myRating) {
      setRevError("Please select a star rating");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/reviews", {
        activity: id,
        rating: myRating,
        comment: myComment.trim(),
      });
      setMyRating(0);
      setMyComment("");
      await loadReviews();
      try {
        const r = await api.get(`/activities/${id}`);
        setActivity(r.data?.activity || r.data);
      } catch {
        /* ignore */
      }
    } catch (err) {
      setRevError(
        err?.response?.data?.message || "Could not submit your review.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [id]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await api.get(`/activities/${id}`);
        if (!active) return;
        const a = res.data?.activity || res.data;
        if (!a || !(a._id || a.id)) {
          setNotFound(true);
          return;
        }
        setActivity(a);

        // sessions se pehli future date default
        const dates = futureSessionDates(a);
        if (dates.length) {
          setSelectedDate(dates[0]);
          const t = timesForDate(a, dates[0]);
          setSelectedTime(t[0] || "");
        }

        // related (same category)
        const slug = a.category?.slug;
        api
          .get("/activities", {
            params: slug ? { category: slug, limit: 5 } : { limit: 5 },
          })
          .then((r) => {
            if (!active) return;
            setRelated(
              toList(r.data)
                .map(normActivity)
                .filter((x) => x.id !== (a._id || a.id))
                .slice(0, 4),
            );
          })
          .catch(() => {});

        // instructor profile (best-effort — bio/experience ke liye)
        const insId = a.instructor?._id || a.instructor?.id;
        if (insId) {
          api
            .get(`/instructors/${insId}`)
            .then((r) => active && setInsProfile(r.data?.instructor || null))
            .catch(() => {});
        }
      } catch (err) {
        if (active) setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [id]);

  // recently viewed (localStorage)
  useEffect(() => {
    if (!activity) return;
    const a = activity;
    addRecentlyViewed({
      id: a._id || a.id,
      title: a.title,
      image: pickImg(a.images?.[0], a.coverImage),
      price: a.price ?? "",
      ageGroup:
        a.ageMin != null && a.ageMax != null ? `${a.ageMin}-${a.ageMax}` : "",
      rating: asNum(a.rating?.average ?? a.rating),
      reviews: asNum(a.rating?.count ?? a.reviews),
      format: a.format || (a.isOnline ? "online" : ""),
    });
  }, [activity]);

  /* ---- helpers on raw activity ---- */
  function futureSessionDates(a) {
    if (!Array.isArray(a?.sessions)) return [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const uniq = new Map();
    a.sessions
      .filter(
        (s) => s?.date && new Date(s.date) >= now && s.status !== "cancelled",
      )
      .forEach((s) => {
        const d = new Date(s.date);
        d.setHours(0, 0, 0, 0);
        uniq.set(d.getTime(), d);
      });
    return [...uniq.values()].sort((x, y) => x - y);
  }
  function timesForDate(a, date) {
    if (!Array.isArray(a?.sessions) || !date) return [];
    return a.sessions
      .filter(
        (s) =>
          s?.date &&
          sameDay(new Date(s.date), date) &&
          s.status !== "cancelled",
      )
      .map((s) => s.startTime || s.time)
      .filter(Boolean);
  }

  /* ---------------- loading / not found ---------------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-white font-sans text-brand-brown [color-scheme:light]">
        <Navbar />
        <div className="px-4 py-20 text-center text-brand-brown/60 sm:px-10">
          Loading…
        </div>
        <Footer />
      </div>
    );
  }

  if (notFound || !activity) {
    return (
      <div className="min-h-screen bg-white font-sans text-brand-brown [color-scheme:light]">
        <Helmet>
          <title>Activity not found — Kidventures</title>
        </Helmet>
        <Navbar />
        <div className="px-4 py-20 text-center sm:px-10">
          <h2 className="mb-2 text-xl font-bold text-brand-brown">
            Activity not found
          </h2>
          <p className="mb-4 text-brand-brown/70">
            This link may be incorrect or the activity was removed.
          </p>
          <Link
            to="/activities"
            className="font-bold text-brand-orange no-underline"
          >
            Back to all activities
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  /* ---------------- derived display values ---------------- */
  const a = activity;
  const images = (Array.isArray(a.images) ? a.images : [])
    .map((im) => pickImg(im))
    .filter(Boolean);
  const cover = images[0] || null;
  const isOnline = a.format === "online" || a.isOnline;
  const insName = asText(a.instructor?.name) || "Instructor";
  const insId = a.instructor?._id || a.instructor?.id;
  const insAvatar = pickImg(a.instructor?.avatar);
  const categoryName = asText(a.category?.name) || asText(a.category);
  const rating = asNum(a.rating?.average ?? a.rating);
  const reviews = asNum(a.rating?.count ?? a.reviews);
  const ageGroup =
    a.ageMin != null && a.ageMax != null
      ? `${a.ageMin}-${a.ageMax}`
      : a.ageGroup || "";
  const duration = a.durationMinutes
    ? `${a.durationMinutes} min`
    : a.duration || "";
  const locationText = isOnline ? "Online" : pickLocation(a.location) || "";
  const language =
    Array.isArray(a.languages) && a.languages.length
      ? a.languages.join(", ")
      : "English";
  // Parent bilkul yehi deta hai — commission instructor se katta hai
  const price = a.price ?? "";
  const siblingDiscountPercent =
    a.siblingDiscount?.enabled && Number(a.siblingDiscount.percent) > 0
      ? Number(a.siblingDiscount.percent)
      : null;
  const exactCoords = isOnline ? null : getCoords(a.location);
  const coords =
    exactCoords || (isOnline ? null : areaCoords(pickLocation(a.location)));
  const approxLocation = !!coords && !exactCoords;
  const learn = Array.isArray(a.whatChildrenLearn) ? a.whatChildrenLearn : [];
  const faqs = Array.isArray(a.faqs) ? a.faqs : [];
  const canReview = getStoredUser()?.role === "parent";

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const favItem = {
    id: a._id || a.id,
    title: a.title,
    image: cover,
    price,
    ageGroup,
    rating,
    reviews,
    format: a.format || (isOnline ? "online" : ""),
    category: categoryName,
  };
  const handleShare = async () => {
    const data = {
      title: a.title,
      text: `Check out "${a.title}" on Kidventures`,
      url: shareUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch {
        /* user cancelled */
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const dates = futureSessionDates(a);
  const times = timesForDate(a, selectedDate);
  const selectedSession = (a.sessions || []).find(
    (s) =>
      s?.date &&
      sameDay(new Date(s.date), selectedDate) &&
      (s.startTime || s.time) === selectedTime,
  );
  const seatsLeft =
    selectedSession && selectedSession.capacity != null
      ? Math.max(
          0,
          selectedSession.capacity - (selectedSession.seatsBooked || 0),
        )
      : null;

  return (
    <div className="min-h-screen bg-white font-sans text-brand-brown [color-scheme:light]">
      <Helmet>
        <title>{a.title} — Kidventures</title>
        <meta
          name="description"
          content={String(a.description || "").slice(0, 155)}
        />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${a.title} — Kidventures`} />
        <meta
          property="og:description"
          content={String(a.description || "").slice(0, 155)}
        />
        {cover && <meta property="og:image" content={cover} />}
        <meta property="og:url" content={shareUrl} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <Navbar />

      {/* Breadcrumb */}
      <div className="px-4 py-4 text-xs text-brand-brown/70 sm:px-10">
        <Link to="/" className="text-brand-brown no-underline">
          Home
        </Link>{" "}
        ›{" "}
        <Link to="/activities" className="text-brand-brown no-underline">
          Activities
        </Link>{" "}
        › {categoryName && <>{categoryName} › </>}
        <span className="text-brand-orange">{a.title}</span>
      </div>

      <section className="flex flex-col gap-8 px-4 pb-12 sm:px-6 md:px-10 lg:flex-row lg:items-start">
        {/* LEFT */}
        <div className="min-w-0 flex-[2]">
          {/* Gallery */}
          <div className="mb-6 flex gap-3">
            <div className="relative flex h-[240px] flex-[2] items-center justify-center overflow-hidden rounded-2xl bg-brand-cream sm:h-[300px]">
              {cover ? (
                <img
                  src={cldOptimize(cover, 700)}
                  alt={a.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <svg
                  width="46"
                  height="46"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#F5941F"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              )}
              <span
                className={`absolute left-3.5 top-3.5 rounded-full px-3 py-1 text-[11px] font-bold text-white ${
                  isOnline ? "bg-brand-sky" : "bg-brand-orange"
                }`}
              >
                {isOnline ? "Online" : "In-person"}
              </span>
            </div>
            {images.length > 1 && (
              <div className="hidden w-[120px] flex-col gap-3 sm:flex">
                {images.slice(1, 4).map((src, i) => (
                  <img
                    key={i}
                    src={cldOptimize(src, 200)}
                    alt={`${a.title} ${i + 2}`}
                    className="h-full w-full flex-1 rounded-xl object-cover"
                  />
                ))}
              </div>
            )}
          </div>

          <h1 className="mb-2.5 text-2xl font-bold text-brand-brown sm:text-[28px]">
            {a.title}
          </h1>

          <div className="mb-2 flex flex-wrap items-center gap-3.5">
            <div className="flex items-center gap-2">
              {insAvatar ? (
                <img
                  src={cldOptimize(insAvatar, 60)}
                  alt={insName}
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <div className="h-7 w-7 rounded-full bg-brand-gold" />
              )}
              <span className="text-[13px]">by {insName}</span>
            </div>
            {insProfile?.verificationStatus === "approved" && <VerifiedBadge />}
          </div>

          <div className="mb-4 flex items-center gap-4 text-[13px]">
            <span className="font-bold text-brand-gold">
              ★ {rating}{" "}
              <span className="text-brand-orange">({reviews} reviews)</span>
            </span>
          </div>

          <div className="mb-5 flex flex-wrap gap-2.5">
            <FavoriteButton item={favItem} withLabel />
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-2 rounded-[10px] border-2 border-gray-200 px-4 py-2 text-[13px] font-bold text-brand-brown"
            >
              <ShareIcon /> {copied ? "Link copied!" : "Share"}
            </button>
          </div>

          {/* Quick facts */}
          <div className="mb-6 flex flex-wrap gap-3 rounded-2xl border border-gray-100 p-4 text-[13px]">
            {ageGroup && (
              <div className="flex min-w-[120px] flex-1 items-center gap-2">
                <UserIcon /> <b>Ages {ageGroup}</b>
              </div>
            )}
            {duration && (
              <div className="flex min-w-[120px] flex-1 items-center gap-2">
                <ClockIcon /> {duration}
              </div>
            )}
            {locationText && (
              <div className="flex min-w-[120px] flex-1 items-center gap-2">
                <PinIcon /> {locationText}
              </div>
            )}
            <div className="flex min-w-[120px] flex-1 items-center gap-2">
              <GlobeIcon /> {language}
            </div>
          </div>

          <h3 className="mb-2.5 text-base font-bold text-brand-brown">
            About this class
          </h3>
          <p className="mb-6 text-sm leading-relaxed text-brand-brown/85">
            {a.description}
          </p>

          {learn.length > 0 && (
            <>
              <h3 className="mb-3.5 text-base font-bold text-brand-brown">
                What children will learn
              </h3>
              <ul className="mb-8 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
                {learn.map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-[13px]">
                    <Check /> {asText(item)}
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Tabs */}
          <div className="mb-4 flex gap-6 border-b border-gray-100">
            {[
              { key: "details", label: "Details" },
              { key: "instructor", label: "Instructor" },
              { key: "reviews", label: `Reviews (${reviews})` },
              { key: "faqs", label: `FAQs (${faqs.length})` },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`-mb-px border-b-2 pb-2.5 text-[13px] ${
                  tab === t.key
                    ? "border-brand-orange font-bold text-brand-orange"
                    : "border-transparent font-medium text-brand-brown"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "details" && (
            <div className="flex flex-wrap gap-6">
              <div className="min-w-[280px] flex-1">
                <DetailRow
                  label="Age Group"
                  value={ageGroup ? `${ageGroup} years` : ""}
                />
                <DetailRow label="Class Duration" value={duration} />
                <DetailRow
                  label="Class Size"
                  value={a.capacity ? `Up to ${a.capacity}` : ""}
                />
                <DetailRow
                  label="What to Bring"
                  value={asText(a.whatToBring)}
                />
                <DetailRow
                  label="Materials"
                  value={
                    a.materialsIncluded
                      ? asText(a.materialsNote) || "All materials included"
                      : asText(a.materialsNote)
                  }
                />
                <DetailRow label="Language" value={language} />
                <div className="flex justify-between gap-4 border-b border-gray-100 py-2.5 text-[13px]">
                  <span className="text-brand-brown/70">
                    Cancellation Policy
                  </span>
                  <span className="max-w-[60%] text-right font-semibold text-brand-brown">
                    For this,{" "}
                    <Link
                      to="/refund-policy"
                      className="text-brand-orange no-underline"
                    >
                      refer to our Refund Policy
                    </Link>
                    .
                  </span>
                </div>
              </div>
              <div className="min-w-[260px] flex-1">
                {coords ? (
                  <>
                    <div className="h-[220px] overflow-hidden rounded-xl">
                      <MapContainer
                        center={[coords.lat, coords.lng]}
                        zoom={14}
                        style={{ height: "100%", width: "100%" }}
                        scrollWheelZoom={false}
                      >
                        <TileLayer
                          attribution="&copy; OpenStreetMap contributors"
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker
                          position={[coords.lat, coords.lng]}
                          icon={markerIcon}
                        >
                          <Popup>
                            {a.title}
                            <br />
                            {locationText}
                          </Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2.5 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-orange no-underline"
                    >
                      <DirectionsArrowIcon /> Get Directions
                    </a>
                    {approxLocation && (
                      <div className="mt-1 text-[11px] text-brand-brown/50">
                        Approximate area, exact address shared after booking.
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex h-[220px] items-center justify-center rounded-xl bg-[#e8eef2] text-[13px] text-brand-brown/60">
                    {isOnline
                      ? "Online class, no location"
                      : asText(a.location?.address) ||
                        "Location shared after booking"}
                  </div>
                )}
              </div>
            </div>
          )}
          {tab === "instructor" && (
            <div className="text-sm leading-relaxed text-brand-brown/85">
              <b>{insName}</b>
              {insProfile?.bio ? (
                <>, {insProfile.bio}</>
              ) : (
                ", profile details will appear here."
              )}
            </div>
          )}
          {tab === "reviews" && (
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="text-3xl font-bold text-brand-brown">
                  {rating || "—"}
                </span>
                <div className="text-[13px] text-brand-brown/70">
                  ★ average · {reviews} {reviews === 1 ? "review" : "reviews"}
                </div>
              </div>

              {canReview ? (
                <div className="mb-6 rounded-2xl border border-gray-100 p-4">
                  <div className="mb-2 text-[13px] font-bold">
                    Write a review
                  </div>
                  <div className="mb-2 flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setMyRating(n)}
                        aria-label={`${n} star${n > 1 ? "s" : ""}`}
                        className={`text-2xl leading-none ${n <= myRating ? "text-brand-gold" : "text-gray-300"}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={myComment}
                    onChange={(e) => setMyComment(e.target.value)}
                    placeholder="Share your experience with other parents..."
                    className="mb-2 min-h-[80px] w-full resize-y rounded-[10px] border border-gray-200 px-3 py-2 text-sm text-brand-brown outline-none focus:border-brand-orange"
                  />
                  {revError && (
                    <div className="mb-2 text-xs text-[#c0392b]">
                      {revError}
                    </div>
                  )}
                  <button
                    onClick={submitReview}
                    disabled={submitting}
                    className="rounded-[10px] bg-brand-orange px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
                  >
                    {submitting ? "Posting..." : "Post review"}
                  </button>
                </div>
              ) : (
                <div className="mb-6 rounded-[10px] bg-brand-cream/50 px-4 py-3 text-[13px] text-brand-brown/75">
                  <Link
                    to="/login"
                    className="font-bold text-brand-orange no-underline"
                  >
                    Log in
                  </Link>{" "}
                  as a parent to leave a review.
                </div>
              )}

              {reviewList.length === 0 ? (
                <div className="text-sm text-brand-brown/60">
                  No reviews yet. Be the first to review this class!
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {reviewList.map((rv) => (
                    <div key={rv._id} className="border-b border-gray-100 pb-4">
                      <div className="mb-1 flex items-center gap-2">
                        {pickImg(rv.user?.avatar) ? (
                          <img
                            src={cldOptimize(pickImg(rv.user?.avatar), 60)}
                            alt=""
                            className="h-7 w-7 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-brand-gold" />
                        )}
                        <span className="text-[13px] font-bold text-brand-brown">
                          {asText(rv.user?.name) || "Parent"}
                        </span>
                        <span className="text-xs text-brand-gold">
                          {"★".repeat(rv.rating)}
                        </span>
                      </div>
                      {rv.comment && (
                        <p className="text-[13px] text-brand-brown/80">
                          {rv.comment}
                        </p>
                      )}
                      <div className="mt-1 text-[11px] text-brand-brown/50">
                        {fmtDate(rv.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {tab === "faqs" && (
            <div>
              {faqs.length === 0 ? (
                <div className="text-sm text-brand-brown/60">
                  No FAQs added for this class yet.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {faqs.map((f, i) => (
                    <div key={i} className="border-b border-gray-100 pb-4">
                      <div className="mb-1.5 text-[13px] font-bold text-brand-brown">
                        {asText(f.question)}
                      </div>
                      <p className="text-[13px] leading-relaxed text-brand-brown/80">
                        {asText(f.answer)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT — booking card */}
        <div className="min-w-0 flex-1 lg:max-w-[340px]">
          <div className="mb-4 rounded-2xl bg-white p-5 shadow-[0_2px_20px_rgba(61,43,31,0.12)]">
            <div className="text-2xl font-bold text-brand-brown">
              {price !== "" ? `AED ${price}` : "—"}
            </div>
            <div className="text-xs text-brand-brown/60">per child</div>
            {siblingDiscountPercent && (
              <div className="mt-2 inline-block rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                {siblingDiscountPercent}% off when you book 2+ children
                together
              </div>
            )}
            <div className="mb-4 mt-3 border-b border-gray-100 pb-4" />

            {dates.length === 0 ? (
              <div className="rounded-[10px] bg-brand-cream/60 px-4 py-4 text-center text-[13px] text-brand-brown/70">
                No upcoming sessions scheduled yet.
              </div>
            ) : (
              <>
                <div className="mb-2.5 text-[13px] font-bold">Select Date</div>
                <div className="mb-4 flex justify-center [&_.react-datepicker]:border-gray-200">
                  <DatePicker
                    selected={selectedDate}
                    onChange={(date) => {
                      setSelectedDate(date);
                      const t = timesForDate(a, date);
                      setSelectedTime(t[0] || "");
                    }}
                    includeDates={dates}
                    minDate={new Date()}
                    inline
                  />
                </div>

                <div className="mb-2.5 text-[13px] font-bold">
                  Available Time
                </div>
                <div className="mb-4 flex flex-wrap gap-2">
                  {times.map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedTime(t)}
                      className={`rounded-lg border px-3.5 py-2 text-xs font-semibold ${
                        selectedTime === t
                          ? "border-brand-orange bg-brand-orange text-white"
                          : "border-gray-200 bg-white text-brand-brown"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div className="mb-2.5 text-[13px] font-bold">
                  Number of Children
                </div>
                <div className="mb-4 flex items-center overflow-hidden rounded-[10px] border border-gray-200">
                  <button
                    onClick={() => setCount((c) => Math.max(1, c - 1))}
                    className="h-10 w-11 bg-brand-cream text-lg"
                  >
                    −
                  </button>
                  <div className="flex-1 text-center font-bold">{count}</div>
                  <button
                    onClick={() => setCount((c) => c + 1)}
                    className="h-10 w-11 bg-brand-cream text-lg"
                  >
                    +
                  </button>
                </div>

                {seatsLeft != null &&
                  (seatsLeft <= 0 ? (
                    <div className="mb-3.5 flex items-center gap-1.5 text-xs text-[#c0392b]">
                      <span className="inline-block h-2 w-2 rounded-full bg-current" />{" "}
                      Fully booked
                    </div>
                  ) : seatsLeft <= 5 ? (
                    <div className="mb-3.5 rounded-lg bg-brand-orange/10 px-3 py-2 text-center text-xs font-bold text-brand-orange">
                      Only {seatsLeft} {seatsLeft === 1 ? "spot" : "spots"} left,
                      book soon!
                    </div>
                  ) : (
                    <div className="mb-3.5 flex items-center gap-1.5 text-xs text-[#2F9E44]">
                      <span className="inline-block h-2 w-2 rounded-full bg-current" />{" "}
                      {seatsLeft} spots available
                    </div>
                  ))}
              </>
            )}

            <Link
              to={`/book/${a._id || a.id}`}
              state={{
                sessionDate: selectedDate,
                sessionTime: selectedTime,
                count,
              }}
              className={`block rounded-[10px] py-3 text-center text-sm font-bold text-white no-underline ${
                dates.length === 0
                  ? "pointer-events-none bg-gray-300"
                  : "bg-brand-sky"
              }`}
            >
              Book Now
            </Link>
            <div className="mt-2.5 flex items-center justify-center gap-1 text-[11px] text-brand-brown/55">
              <LockIcon /> Secure payment
            </div>
          </div>

          {/* Instructor card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <div className="mb-3 flex items-center gap-3">
              {insAvatar ? (
                <img
                  src={cldOptimize(insAvatar, 100)}
                  alt={insName}
                  className="h-12 w-12 flex-shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="h-12 w-12 flex-shrink-0 rounded-full bg-brand-gold" />
              )}
              <div>
                <div className="text-sm font-bold text-brand-brown">
                  {insName}
                </div>
                {insProfile?.verificationStatus === "approved" && (
                  <VerifiedBadge />
                )}
              </div>
            </div>
            {insProfile?.bio && (
              <p className="mb-3.5 text-xs leading-relaxed text-brand-brown/80">
                {insProfile.bio}
              </p>
            )}
            {insId ? (
              <Link
                to={`/instructor/${insId}`}
                className="block rounded-[10px] border-2 border-brand-orange bg-white py-2.5 text-center text-[13px] font-bold text-brand-orange no-underline"
              >
                View Instructor Profile
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="px-4 pb-16 sm:px-6 md:px-10">
          <h3 className="mb-5 text-lg font-bold text-brand-brown">
            You might also like
          </h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => (
              <Link
                key={r.id}
                to={`/activity/${r.id}`}
                className="block overflow-hidden rounded-2xl bg-white shadow-[0_2px_14px_rgba(61,43,31,0.10)] no-underline"
              >
                <div className="relative h-[130px] bg-brand-cream">
                  {r.image && (
                    <img
                      src={cldOptimize(r.image, 300)}
                      alt={r.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                  {r.format && (
                    <span
                      className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-bold text-white ${r.format === "online" ? "bg-brand-sky" : "bg-brand-orange"}`}
                    >
                      {r.format === "online" ? "Online" : "In-person"}
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <div className="text-sm font-bold text-brand-brown">
                    {r.title}
                  </div>
                  {r.instructor && (
                    <div className="text-xs text-brand-brown/70">
                      by {r.instructor}
                    </div>
                  )}
                  <div className="my-1 text-xs font-bold text-brand-gold">
                    ★ {r.rating} ({r.reviews})
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-brand-brown/70">
                      Ages {r.ageGroup}
                    </span>
                    <span className="font-bold text-brand-brown">
                      {r.price !== "" ? `AED ${r.price}` : ""}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}

export default ActivityDetailPage;
