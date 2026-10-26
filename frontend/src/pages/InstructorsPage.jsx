import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import axios from "../api/axios";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { BadgeRow } from "../components/BadgeMedal";
import { cldOptimize } from "../utils/img";

export default function InstructorsPage() {
  const [searchParams] = useSearchParams();
  const location = searchParams.get("location") || "";

  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Backend ka default limit 12 hai, is liye 13+ instructors hon to baqi
  // dikhte hi nahi the. Ab ek dafa me 50 mangte hain (backend ka max) aur
  // agar us se bhi zyada hon to "Load more" button se agla page aata hai.
  const PAGE_SIZE = 50;

  useEffect(() => {
    let cancelled = false;

    async function loadInstructors() {
      setLoading(true);
      setError("");
      setPage(1);
      try {
        const params = { limit: PAGE_SIZE, page: 1 };
        if (location) params.area = location;

        const res = await axios.get("/instructors", { params });
        if (!cancelled) {
          setInstructors(res.data?.instructors || []);
          setTotalPages(res.data?.pages || 1);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Couldn't load instructors right now. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInstructors();
    return () => {
      cancelled = true;
    };
  }, [location]);

  async function loadMore() {
    const next = page + 1;
    setLoadingMore(true);
    try {
      const params = { limit: PAGE_SIZE, page: next };
      if (location) params.area = location;

      const res = await axios.get("/instructors", { params });
      const more = res.data?.instructors || [];
      setInstructors((prev) => {
        // dobara aane wale (duplicate) profiles hata do
        const seen = new Set(prev.map((p) => String(p._id)));
        return [...prev, ...more.filter((p) => !seen.has(String(p._id)))];
      });
      setPage(next);
      setTotalPages(res.data?.pages || totalPages);
    } catch (err) {
      setError("Couldn't load more instructors. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col">
      <Helmet>
        <title>Kids’ Activity Instructors in Dubai | Kidventures</title>
        <meta
          name="description"
          content="Browse verified instructors in Dubai teaching art, music, coding, financial literacy, sports and more for kids. View profiles, reviews and classes."
        />
      </Helmet>

      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <h1 className="text-3xl font-bold text-brand-brown mb-2">
          Meet our instructors
        </h1>
        <p className="text-gray-600 mb-8">
          {location
            ? `Verified instructors in ${location}.`
            : "Verified instructors running classes for kids across the UAE."}
        </p>

        {loading && (
          <div className="text-center py-20 text-gray-500">
            Loading instructors…
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-20 text-red-500">{error}</div>
        )}

        {!loading && !error && instructors.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            {location
              ? `No instructors found in ${location} yet.`
              : "No instructors to show yet. Check back soon."}
          </div>
        )}

        {!loading && !error && instructors.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {instructors.map((profile) => {
              const userId = profile.user?._id || profile.user;
              const name = profile.user?.name || "Instructor";
              const avatar = profile.user?.avatar?.url;
              const initial = name.charAt(0).toUpperCase();

              const categoryNames = (profile.categories || [])
                .map((c) => c?.name)
                .filter(Boolean)
                .join(", ");

              const tagline = profile.headline || categoryNames;

              const areaText = profile.location?.area
                ? `${profile.location.area}${
                    profile.location?.city ? ", " + profile.location.city : ""
                  }`
                : profile.user?.city || "";

              const rating = profile.rating?.average || 0;
              const reviewCount = profile.rating?.count || 0;
              const experience = profile.experienceYears;

              return (
                <div
                  key={userId}
                  className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center text-center"
                >
                  <InstructorAvatar
                    name={name}
                    avatar={avatar}
                    initial={initial}
                  />

                  <h2 className="font-bold text-brand-brown text-lg mb-1">
                    {name}
                  </h2>

                  {/* chhote label wale vector chips - har zoom par sharp
                      rehte hain aur naam se foran pata chalta hai ke
                      kaunsa badge mila hai */}
                  <BadgeRow
                    badges={profile.badges}
                    className="mb-2 justify-center"
                  />

                  {tagline && (
                    <p className="text-sm text-gray-500 mb-2">{tagline}</p>
                  )}

                  <div className="flex items-center gap-1 text-sm text-brand-orange font-semibold mb-1">
                    ★ {rating.toFixed(1)} ({reviewCount})
                  </div>

                  {experience != null && (
                    <p className="text-sm text-gray-500 mb-1">
                      {experience} years experience
                    </p>
                  )}

                  {areaText && (
                    <p className="text-sm text-gray-500 mb-4 flex items-center gap-1">
                      <span aria-hidden="true">📍</span> {areaText}
                    </p>
                  )}

                  <Link
                    to={`/instructor/${userId}`}
                    className="mt-auto border-2 border-brand-orange text-brand-orange font-bold rounded-full px-6 py-2 hover:bg-brand-orange hover:text-white transition-colors"
                  >
                    View Profile
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {!loading && !error && page < totalPages && (
          <div className="text-center mt-8">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="border-2 border-brand-orange text-brand-orange font-bold rounded-full px-8 py-2 hover:bg-brand-orange hover:text-white transition-colors disabled:opacity-60"
            >
              {loadingMore ? "Loading…" : "Load more instructors"}
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

function InstructorAvatar({ name, avatar, initial }) {
  const [failed, setFailed] = useState(false);

  if (avatar && !failed) {
    return (
      <img
        src={cldOptimize(avatar, 200)}
        alt={name}
        onError={() => setFailed(true)}
        loading="lazy"
        decoding="async"
        className="w-20 h-20 rounded-full object-cover mb-4"
      />
    );
  }

  return (
    <div className="w-20 h-20 rounded-full bg-brand-gold flex items-center justify-center text-white text-2xl font-bold mb-4">
      {initial}
    </div>
  );
}
