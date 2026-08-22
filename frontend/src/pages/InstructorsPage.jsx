import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import axios from "../api/axios";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function InstructorsPage() {
  const [searchParams] = useSearchParams();
  const location = searchParams.get("location") || "";

  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadInstructors() {
      setLoading(true);
      setError("");
      try {
        const params = {};
        if (location) params.area = location;

        const res = await axios.get("/instructors", { params });
        if (!cancelled) {
          setInstructors(res.data?.instructors || []);
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

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col">
      <Helmet>
        <title>Find Instructors | Kidventures</title>
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
              const avatar = profile.user?.avatar;
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
        src={avatar}
        alt={name}
        onError={() => setFailed(true)}
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
