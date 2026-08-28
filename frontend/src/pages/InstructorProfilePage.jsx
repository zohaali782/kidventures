import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../api/axios";
import { normActivity, toList } from "../api/normalize";
import { isLoggedIn } from "../api/auth";

/* Cloudinary URL ko resize+auto-optimize karta hai. Agar URL Cloudinary
   ka na ho, waisi hi wapas kar deta hai. */
const cldOptimize = (url, width = 400) => {
  if (!url || typeof url !== "string" || !url.includes("res.cloudinary.com"))
    return url;
  return url.replace("/upload/", `/upload/w_${width},q_auto,f_auto/`);
};

/* ------------------------------------------------------------------ *
 * SINGLE ADJUSTMENT POINT
 * Agar backend field names badlein, sirf yahan theek karo.
 * Response: { instructor: {...}, activities: [...] }  (getInstructorById)
 * ------------------------------------------------------------------ */
function normProfile(p = {}) {
  const u = p.user || {};
  const loc = p.location || {};
  return {
    id: p._id || p.id,
    userId: u._id || u.id || p.user, // links/follow ke liye
    name: u.name || p.name || "Instructor",
    avatar: u.avatar?.url || p.avatar?.url || "",
    city: u.city || loc.area || "",
    headline: p.headline || "",
    bio: p.bio || "",
    qualifications: toList(p.qualifications),
    languages: toList(p.languages),
    experienceYears: p.experienceYears ?? p.experience ?? null,
    categories: toList(p.categories),
    gallery: toList(p.gallery),
    area: loc.area || u.city || "",
    address: loc.address || "",
    socialLinks: p.socialLinks || {},
    rating: p.rating || { average: 0, count: 0 },
    verified: p.verificationStatus === "approved",
    joinedAt: p.createdAt || null,
  };
}

/* --------------------------------- icons --------------------------------- */
const Ic = {
  star: (cls) => (
    <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
      <path d="M12 2l2.9 6.3 6.9.7-5.1 4.7 1.4 6.8L12 17.8 5.9 21.2l1.4-6.8L2.2 9.7l6.9-.7L12 2z" />
    </svg>
  ),
  pin: (cls) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={cls}
      aria-hidden="true"
    >
      <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  globe: (cls) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={cls}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" />
    </svg>
  ),
  chat: (cls) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={cls}
      aria-hidden="true"
    >
      <path d="M21 11.5a8.5 8.5 0 01-11.9 7.8L3 21l1.7-6A8.5 8.5 0 1121 11.5z" />
    </svg>
  ),
  heart: (filled, cls) => (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      className={cls}
      aria-hidden="true"
    >
      <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 10-7.8 7.8l1 1 7.8 7.8 7.8-7.8 1-1a5.5 5.5 0 000-7.8z" />
    </svg>
  ),
  share: (cls) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={cls}
      aria-hidden="true"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  ),
  check: (cls) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className={cls}
      aria-hidden="true"
    >
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  cal: (cls) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={cls}
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
};

const VerifiedBadge = ({ className = "" }) => (
  <span
    className={`inline-flex items-center gap-1 text-xs font-semibold text-green-600 ${className}`}
  >
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      className="fill-green-600"
      aria-hidden="true"
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

const Stars = ({ n = 0, size = 15 }) => {
  const full = Math.round(Number(n) || 0);
  return (
    <span className="inline-flex items-center" aria-label={`${n} out of 5`}>
      {[1, 2, 3, 4, 5]
        .map((i) =>
          Ic.star(
            `${i <= full ? "fill-brand-gold" : "fill-gray-300"}`.concat(" "),
          ),
        )
        .map((el, i) => (
          <span
            key={i}
            style={{ width: size, height: size }}
            className="inline-block"
          >
            {el}
          </span>
        ))}
    </span>
  );
};

/* rating class card se defensive tareeke se nikaalo */
const rAvg = (c) =>
  c?.rating?.average ??
  c?.ratingAverage ??
  (typeof c?.rating === "number" ? c.rating : 0) ??
  0;
const rCnt = (c) => c?.rating?.count ?? c?.ratingCount ?? c?.reviews ?? 0;
const cPrice = (c) => c?.price ?? c?.priceDisplay ?? null;
const cImg = (c) =>
  c?.image || (Array.isArray(c?.images) && c.images[0]) || c?.cover || "";
const cId = (c) => c?.id || c?._id;

export default function InstructorProfilePage() {
  const { id } = useParams(); // = instructor ka USER id
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("about");

  const [following, setFollowing] = useState(false);
  const [note, setNote] = useState("");

  const [reviews, setReviews] = useState(null); // null = abhi load nahi hua
  const [reviewsLoading, setReviewsLoading] = useState(false);

  /* ---- fetch profile + uski classes ---- */
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      setNotFound(false);
      setTab("about");
      setReviews(null);
      try {
        const { data } = await api.get(`/instructors/${id}`);
        if (!alive) return;
        const raw = data?.instructor || data;
        setProfile(normProfile(raw));
        setClasses(toList(data?.activities).map(normActivity));
      } catch (e) {
        if (!alive) return;
        if (e?.response?.status === 404) setNotFound(true);
        else
          setErr(
            "Is profile ko load karne mein masla hua. Dobara koshish karein.",
          );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  /* ---- following state (local, client-side) ---- */
  useEffect(() => {
    if (!profile) return;
    try {
      const arr = JSON.parse(localStorage.getItem("kv_following") || "[]");
      setFollowing(arr.includes(profile.userId));
    } catch {
      setFollowing(false);
    }
  }, [profile]);

  const toggleFollow = () => {
    if (!profile) return;
    try {
      const arr = JSON.parse(localStorage.getItem("kv_following") || "[]");
      let next;
      if (arr.includes(profile.userId)) {
        next = arr.filter((x) => x !== profile.userId);
        setFollowing(false);
      } else {
        next = [...arr, profile.userId];
        setFollowing(true);
      }
      localStorage.setItem("kv_following", JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const flash = (msg) => {
    setNote(msg);
    window.clearTimeout(flash._t);
    flash._t = window.setTimeout(() => setNote(""), 2200);
  };

  const onShare = async () => {
    const url = window.location.href;
    const title = profile ? `${profile.name} — Kidventures` : "Kidventures";
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      flash("Link copied!");
    } catch {
      /* user cancelled */
    }
  };

  const onMessage = () => {
    if (!isLoggedIn()) {
      flash("Please log in to send a message.");
      return;
    }
    if (!profile?.userId) return;
    navigate(`/messages/${profile.userId}`);
  };

  /* ---- derived overall rating (agar instructor.rating maintain nahi) ---- */
  const overall = useMemo(() => {
    if (profile?.rating?.count > 0) return profile.rating;
    let sum = 0,
      cnt = 0;
    classes.forEach((c) => {
      const a = Number(rAvg(c)) || 0;
      const n = Number(rCnt(c)) || 0;
      if (n > 0) {
        sum += a * n;
        cnt += n;
      }
    });
    return cnt > 0
      ? { average: +(sum / cnt).toFixed(1), count: cnt }
      : { average: 0, count: 0 };
  }, [profile, classes]);

  /* ---- reviews tab: instructor ki classes ke reviews aggregate ---- */
  useEffect(() => {
    if (tab !== "reviews" || reviews !== null || reviewsLoading) return;
    let alive = true;
    (async () => {
      setReviewsLoading(true);
      try {
        const ids = classes.slice(0, 12).map(cId).filter(Boolean);
        if (ids.length === 0) {
          if (alive) setReviews([]);
          return;
        }
        const results = await Promise.allSettled(
          ids.map((cid) =>
            api.get(`/reviews`, { params: { activity: cid, limit: 20 } }),
          ),
        );
        const merged = [];
        results.forEach((r, i) => {
          if (r.status === "fulfilled") {
            const list = toList(r.value?.data?.reviews || r.value?.data);
            list.forEach((rv) =>
              merged.push({
                name: rv?.user?.name || rv?.parentName || rv?.name || "Parent",
                rating: rv?.rating ?? 0,
                comment: rv?.comment || rv?.text || "",
                createdAt: rv?.createdAt || null,
                className: classes[i]?.title || "",
              }),
            );
          }
        });
        merged.sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
        );
        if (alive) setReviews(merged);
      } catch {
        if (alive) setReviews([]);
      } finally {
        if (alive) setReviewsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [tab, classes, reviews, reviewsLoading]);

  /* --------------------------------- states --------------------------------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-white text-brand-brown">
        <Navbar />
        <div className="mx-auto max-w-6xl animate-pulse px-4 py-8 sm:px-6">
          <div className="flex flex-wrap items-center gap-6 rounded-2xl bg-brand-cream p-6 sm:p-9">
            <div className="h-24 w-24 rounded-full bg-brand-gold/40 sm:h-28 sm:w-28" />
            <div className="flex-1 space-y-3">
              <div className="h-6 w-48 rounded bg-black/10" />
              <div className="h-4 w-32 rounded bg-black/10" />
              <div className="h-4 w-64 rounded bg-black/10" />
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-black/5" />
            ))}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (notFound || (!profile && !err)) {
    return (
      <div className="min-h-screen bg-white text-brand-brown">
        <Navbar />
        <div className="px-6 py-20 text-center">
          <h2 className="mb-3 text-2xl font-bold">Instructor not found</h2>
          <p className="mb-6 text-sm opacity-70">
            Ho sakta hai ye instructor ab available na ho ya profile hata di
            gayi ho.
          </p>
          <Link
            to="/activities"
            className="font-bold text-brand-orange hover:underline"
          >
            Back to activities
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen bg-white text-brand-brown">
        <Navbar />
        <div className="px-6 py-20 text-center">
          <p className="mb-4 text-sm opacity-80">{err}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-brand-orange px-5 py-2 font-bold text-white hover:opacity-90"
          >
            Retry
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const firstName = profile.name.split(" ")[0];
  const joined = profile.joinedAt
    ? new Date(profile.joinedAt).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })
    : null;

  const stats = [
    { label: "Classes", value: classes.length },
    { label: "Rating", value: overall.count > 0 ? overall.average : "New" },
    ...(profile.experienceYears
      ? [{ label: "Years Experience", value: profile.experienceYears }]
      : []),
    { label: "Reviews", value: overall.count },
  ];

  return (
    <div className="min-h-screen bg-white text-brand-brown">
      <Helmet>
        <title>{profile.name} — Instructor on Kidventures</title>
        <meta
          name="description"
          content={(
            profile.headline ||
            profile.bio ||
            `${profile.name} teaches kids' activities on Kidventures`
          ).slice(0, 155)}
        />
        <meta
          property="og:title"
          content={`${profile.name} — Kidventures Instructor`}
        />
        <meta
          property="og:description"
          content={(profile.headline || profile.bio || "").slice(0, 155)}
        />
        {profile.avatar ? (
          <meta property="og:image" content={profile.avatar} />
        ) : null}
        <meta name="twitter:card" content="summary" />
      </Helmet>

      <Navbar />

      {/* toast */}
      {note && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-brand-brown px-5 py-2.5 text-sm font-medium text-white shadow-lg">
          {note}
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Breadcrumb */}
        <div className="py-4 text-xs opacity-70">
          <Link to="/" className="hover:underline">
            Home
          </Link>{" "}
          <span aria-hidden="true">›</span> <span>Instructors</span>{" "}
          <span aria-hidden="true">›</span>{" "}
          <span className="text-brand-orange">{profile.name}</span>
        </div>

        {/* HERO */}
        <section className="flex flex-col items-center gap-6 rounded-2xl bg-brand-cream p-6 text-center sm:flex-row sm:items-center sm:p-9 sm:text-left">
          {profile.avatar ? (
            <img
              src={cldOptimize(profile.avatar, 200)}
              alt={profile.name}
              className="h-24 w-24 flex-shrink-0 rounded-full object-cover shadow-md sm:h-28 sm:w-28"
            />
          ) : (
            <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full bg-brand-gold text-3xl font-bold text-white shadow-md sm:h-28 sm:w-28">
              {profile.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <h1 className="text-2xl font-bold text-brand-brown sm:text-[26px]">
                {profile.name}
              </h1>
              {profile.verified && <VerifiedBadge />}
            </div>

            {profile.headline && (
              <div className="mb-2 text-sm font-semibold text-brand-orange">
                {profile.headline}
              </div>
            )}

            {profile.categories.length > 0 && (
              <div className="mb-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                {profile.categories.map((c) => (
                  <span
                    key={c._id || c.slug || c.name}
                    className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-brand-brown"
                  >
                    {c.name || c}
                  </span>
                ))}
              </div>
            )}

            <div className="mb-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm sm:justify-start">
              {overall.count > 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <Stars n={overall.average} />
                  <b>{overall.average}</b>
                  <span className="opacity-70">({overall.count} reviews)</span>
                </span>
              ) : (
                <span className="opacity-70">New instructor</span>
              )}
              {profile.area && (
                <span className="inline-flex items-center gap-1.5 opacity-80">
                  {Ic.pin("h-4 w-4")} {profile.area}
                </span>
              )}
              {profile.languages.length > 0 && (
                <span className="inline-flex items-center gap-1.5 opacity-80">
                  {Ic.globe("h-4 w-4")} {profile.languages.join(", ")}
                </span>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-2.5 sm:justify-start">
              <button
                onClick={onMessage}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-orange px-5 py-2 text-sm font-bold text-white hover:opacity-90"
              >
                {Ic.chat("h-4 w-4")} Message
              </button>
              <button
                onClick={toggleFollow}
                className={`inline-flex items-center gap-1.5 rounded-xl border-2 border-brand-orange px-4 py-1.5 text-sm font-bold ${
                  following
                    ? "bg-brand-orange text-white"
                    : "bg-white text-brand-orange"
                }`}
              >
                {Ic.heart(following, "h-4 w-4")}{" "}
                {following ? "Following" : "Follow"}
              </button>
              <button
                onClick={onShare}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-1.5 text-sm font-semibold text-brand-brown hover:bg-gray-50"
              >
                {Ic.share("h-4 w-4")} Share
              </button>
            </div>
          </div>
        </section>

        {/* Stat strip */}
        <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm"
            >
              <div className="text-xl font-bold text-brand-orange sm:text-2xl">
                {s.value}
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-wide opacity-60">
                {s.label}
              </div>
            </div>
          ))}
        </section>

        {/* Tabs */}
        <section className="mt-8 border-b border-gray-200">
          <div className="flex gap-6 overflow-x-auto">
            {[
              { key: "about", label: "About" },
              { key: "classes", label: `Classes (${classes.length})` },
              { key: "reviews", label: `Reviews (${overall.count})` },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`-mb-px whitespace-nowrap border-b-2 pb-3 text-sm ${
                  tab === t.key
                    ? "border-brand-orange font-bold text-brand-orange"
                    : "border-transparent font-medium text-brand-brown hover:text-brand-orange"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>

        {/* Tab content */}
        <section className="py-8">
          {/* ABOUT */}
          {tab === "about" && (
            <div className="flex flex-col gap-8 lg:flex-row">
              <div className="min-w-0 flex-[2]">
                <h3 className="mb-2.5 text-base font-bold">
                  About {firstName}
                </h3>
                <p className="mb-5 whitespace-pre-line text-sm leading-7 opacity-85">
                  {profile.bio || "This instructor hasn't added a bio yet."}
                </p>

                <div className="mb-6 flex flex-col gap-2 text-sm opacity-85">
                  {profile.area && (
                    <div className="inline-flex items-center gap-2">
                      {Ic.pin("h-4 w-4 shrink-0")} Lives in {profile.area}
                    </div>
                  )}
                  {joined && (
                    <div className="inline-flex items-center gap-2">
                      {Ic.cal("h-4 w-4 shrink-0")} Joined {joined}
                    </div>
                  )}
                </div>

                {profile.qualifications.length > 0 && (
                  <>
                    <h3 className="mb-3 text-base font-bold">Qualifications</h3>
                    <div className="flex flex-wrap gap-2.5">
                      {profile.qualifications.map((q, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 rounded-full bg-brand-cream px-3.5 py-2 text-xs font-semibold text-brand-brown"
                        >
                          {Ic.check("h-3.5 w-3.5 text-green-600")} {q}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {profile.gallery.length > 0 && (
                  <>
                    <h3 className="mb-3 mt-7 text-base font-bold">Gallery</h3>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {profile.gallery.map((g, idx) => {
                        const isImg =
                          typeof g === "string" && /^(https?:|\/)/.test(g);
                        return (
                          <div
                            key={idx}
                            className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-brand-cream text-3xl"
                          >
                            {isImg ? (
                              <img
                                src={cldOptimize(g, 300)}
                                alt={`${firstName}'s class ${idx + 1}`}
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span>{g}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Trust box */}
              <aside className="h-fit flex-1 rounded-2xl bg-brand-cream p-5 lg:max-w-xs">
                <div className="mb-3">
                  <VerifiedBadge />
                </div>
                <p className="text-xs leading-6 opacity-80">
                  This instructor's identity and credentials have been reviewed
                  and approved by the Kidventures team. All classes take place
                  in a safe, supervised environment.
                </p>
              </aside>
            </div>
          )}

          {/* CLASSES */}
          {tab === "classes" && (
            <>
              {classes.length === 0 ? (
                <div className="py-8 text-sm opacity-60">
                  No classes listed yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {classes.map((a) => {
                    const price = cPrice(a);
                    const img = cImg(a);
                    const fmt = a.format || a.mode || "";
                    const online = String(fmt).toLowerCase().includes("online");
                    return (
                      <Link
                        key={cId(a)}
                        to={`/activity/${cId(a)}`}
                        className="block overflow-hidden rounded-2xl bg-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
                      >
                        <div className="relative h-32 bg-brand-cream">
                          {img ? (
                            <img
                              src={cldOptimize(img, 300)}
                              alt={a.title}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                          {fmt && (
                            <span
                              className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-bold text-white ${
                                online ? "bg-brand-sky" : "bg-brand-orange"
                              }`}
                            >
                              {fmt}
                            </span>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="text-sm font-bold">{a.title}</div>
                          <div className="my-1 inline-flex items-center gap-1 text-xs font-bold text-brand-gold">
                            <Stars n={rAvg(a)} size={12} />{" "}
                            {rCnt(a) > 0 ? `(${rCnt(a)})` : "New"}
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="opacity-70">
                              {a.ageMin != null && a.ageMax != null
                                ? `Ages ${a.ageMin}–${a.ageMax}`
                                : a.ageGroup
                                  ? `Ages ${a.ageGroup}`
                                  : ""}
                            </span>
                            {price != null && (
                              <span className="font-bold">AED {price}</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* REVIEWS (instructor ki saari classes se aggregate) */}
          {tab === "reviews" && (
            <div className="max-w-2xl">
              {reviewsLoading && (
                <div className="py-6 text-sm opacity-60">Loading reviews…</div>
              )}
              {!reviewsLoading && reviews && reviews.length === 0 && (
                <div className="py-6 text-sm opacity-60">
                  Abhi tak koi review nahi.
                </div>
              )}
              {!reviewsLoading &&
                reviews &&
                reviews.map((r, idx) => (
                  <div key={idx} className="border-b border-gray-200 py-4">
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="text-sm font-bold">{r.name}</span>
                      <Stars n={r.rating} />
                    </div>
                    {r.className && (
                      <div className="mb-1 text-xs font-medium text-brand-orange">
                        {r.className}
                      </div>
                    )}
                    {r.comment && (
                      <p className="text-sm leading-6 opacity-80">
                        {r.comment}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          )}
        </section>
      </div>

      <Footer />
    </div>
  );
}
