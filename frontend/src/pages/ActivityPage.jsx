import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import FavoriteButton from "../components/FavoriteButton";
import api from "../api/axios";
import { toList, normActivity } from "../api/normalize";

/* ----------------------------- filter config ----------------------------- */
const AGE_OPTIONS = ["", 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

const PRICE_OPTIONS = [
  { value: "", label: "Any price" },
  { value: "under100", label: "Under AED 100" },
  { value: "100-200", label: "AED 100 – 200" },
  { value: "200-300", label: "AED 200 – 300" },
  { value: "300plus", label: "AED 300+" },
];
const PRICE_MAP = {
  under100: { max: 99 },
  "100-200": { min: 100, max: 200 },
  "200-300": { min: 200, max: 300 },
  "300plus": { min: 300 },
};

const LOCATION_OPTIONS = ["", "Jumeirah", "Mirdif", "Arabian Ranches"];

const SORT_OPTIONS = [
  { value: "", label: "Featured" },
  { value: "popular", label: "Most Popular" },
  { value: "rating", label: "Highest Rated" },
  { value: "newest", label: "Newest" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
];

const buildParams = (q, page) => {
  const p = { page, limit: 12 };
  if (q.q) p.q = q.q;
  if (q.category) p.category = q.category; // slug
  if (q.age) p.age = q.age;
  if (q.sort) p.sort = q.sort;
  if (q.city) p.city = q.city; // nav's Dubai/Sharjah quick-filter
  if (q.location === "Online") p.format = "online";
  else if (q.location) p.area = q.location;
  if (q.date) p.date = q.date;
  const pr = PRICE_MAP[q.price];
  if (pr) {
    if (pr.min != null) p.minPrice = pr.min;
    if (pr.max != null) p.maxPrice = pr.max;
  }
  return p;
};

/* -------------------------------- icons --------------------------------- */
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

const cldOptimize = (url, width = 400) => {
  if (!url || !url.includes("res.cloudinary.com")) return url;
  return url.replace("/upload/", `/upload/w_${width},q_auto,f_auto/`);
};
const PinIcon = () => (
  <svg
    width="13"
    height="13"
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
);
const CalIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#F4C542"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

/* ------------------------------ activity card ---------------------------- */
function ActivityCard({ a }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_14px_rgba(61,43,31,0.10)]">
      <Link to={`/activity/${a.id}`} className="block no-underline">
        <div className="relative h-[140px] w-full bg-brand-cream">
          {a.image && (
            <img
              src={a.image}
              alt={a.title}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          )}
          {a.format && (
            <span
              className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-bold text-white ${
                a.format === "online" ? "bg-brand-sky" : "bg-brand-orange"
              }`}
            >
              {a.format === "online" ? "Online" : "In-person"}
            </span>
          )}
          <FavoriteButton item={a} className="absolute right-2.5 top-2.5" />
        </div>
        <div className="p-3">
          <div className="text-[11px] font-bold text-brand-gold">
            ★ {a.rating} ({a.reviews})
          </div>
          <div className="mt-1 text-sm font-bold text-brand-brown">
            {a.title}
          </div>
          {a.instructor && (
            <div className="text-xs text-brand-brown/70">by {a.instructor}</div>
          )}
          {a.ageGroup && (
            <div className="mt-1.5 text-xs text-brand-brown/70">
              Ages {a.ageGroup}
            </div>
          )}
          {(a.date || a.time) && (
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-brand-brown/70">
              <CalIcon /> {[a.date, a.time].filter(Boolean).join(" · ")}
            </div>
          )}
          {a.location && (
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-brand-brown/70">
              <PinIcon /> {a.location}
            </div>
          )}
          <div className="mt-2 text-sm font-bold text-brand-brown">
            {a.price !== "" ? `AED ${a.price}` : ""}
          </div>
        </div>
      </Link>
      <div className="px-3 pb-3">
        <Link
          to={`/activity/${a.id}`}
          className="block rounded-[10px] bg-brand-sky py-2.5 text-center text-sm font-bold text-white no-underline"
        >
          Book Now
        </Link>
      </div>
    </div>
  );
}

/* -------------------------------- sidebar -------------------------------- */
function Radio({ name, checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-1.5 text-[13px] text-brand-brown">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="accent-brand-orange"
      />
      {label}
    </label>
  );
}

function Sidebar({ query, categories, setFilter, clearAll }) {
  return (
    <div className="w-full md:w-[230px] md:flex-shrink-0">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[15px] font-bold text-brand-brown">Filters</span>
        <button
          onClick={clearAll}
          className="text-xs font-semibold text-brand-orange"
        >
          Clear all
        </button>
      </div>

      {/* Category */}
      <div className="mb-5">
        <div className="mb-2 text-[13px] font-bold text-brand-brown">
          Category
        </div>
        <Radio
          name="category"
          checked={!query.category}
          onChange={() => setFilter({ category: "" })}
          label="All Categories"
        />
        {categories.map((c) => (
          <Radio
            key={c._id || c.slug}
            name="category"
            checked={query.category === c.slug}
            onChange={() => setFilter({ category: c.slug })}
            label={c.name}
          />
        ))}
      </div>

      {/* Age */}
      <div className="mb-5">
        <div className="mb-2 text-[13px] font-bold text-brand-brown">
          Child&apos;s age
        </div>
        <select
          value={query.age}
          onChange={(e) => setFilter({ age: e.target.value })}
          className="w-full rounded-[10px] border border-gray-200 px-3 py-2 text-[13px] text-brand-brown outline-none focus:border-brand-orange"
        >
          {AGE_OPTIONS.map((a) => (
            <option key={a || "any"} value={a}>
              {a === "" ? "Any age" : `${a} years`}
            </option>
          ))}
        </select>
      </div>

      {/* Price */}
      <div className="mb-5">
        <div className="mb-2 text-[13px] font-bold text-brand-brown">Price</div>
        {PRICE_OPTIONS.map((p) => (
          <Radio
            key={p.value || "any"}
            name="price"
            checked={query.price === p.value}
            onChange={() => setFilter({ price: p.value })}
            label={p.label}
          />
        ))}
      </div>

      {/* Location */}
      <div>
        <div className="mb-2 text-[13px] font-bold text-brand-brown">
          Location
        </div>
        {LOCATION_OPTIONS.map((l) => (
          <Radio
            key={l || "any"}
            name="location"
            checked={query.location === l}
            onChange={() => setFilter({ location: l })}
            label={l === "" ? "Any location" : l}
          />
        ))}
      </div>
    </div>
  );
}

/* --------------------------------- page ---------------------------------- */
function ActivityPage() {
  const [searchParams] = useSearchParams();

  const [query, setQuery] = useState({
    q: searchParams.get("search") || "",
    category: searchParams.get("category") || "",
    age: /^\d+$/.test(searchParams.get("age") || "")
      ? searchParams.get("age")
      : "",
    price: "",
    location: searchParams.get("location") || "",
    city: searchParams.get("city") || "",
    date: searchParams.get("date") || "",
    sort: "",
  });
  const [keyword, setKeyword] = useState(query.q);
  const [page, setPage] = useState(1);

  // Navbar se location badalne par (same page par rehte hue) URL se sync karo -
  // warna sirf pehli mount par hi location read hoti thi, dobara nahi. Ye sirf
  // URL -> state direction mein sync karta hai, isliye agar user khud sidebar
  // se koi alag location chun le, wahi lagu rehta hai jab tak URL dobara na badle.
  useEffect(() => {
    const urlLocation = searchParams.get("location") || "";
    const urlCity = searchParams.get("city") || "";
    setQuery((q) => {
      if (q.location === urlLocation && q.city === urlCity) return q;
      return { ...q, location: urlLocation, city: urlCity };
    });
    setPage(1);
  }, [searchParams]);

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showFilters, setShowFilters] = useState(false); // mobile

  // categories (sidebar)
  useEffect(() => {
    api
      .get("/categories")
      .then((r) => setCategories(toList(r.data)))
      .catch(() => {});
  }, []);

  // fetch on query/page change
  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await api.get("/activities", {
          params: buildParams(query, page),
        });
        if (!active) return;
        const d = res.data;
        setItems(toList(d).map(normActivity));
        setTotal(d?.total ?? toList(d).length);
        setPages(d?.pages ?? 1);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [query, page]);

  const setFilter = (patch) => {
    setQuery((q) => ({ ...q, ...patch }));
    setPage(1);
  };
  const applySearch = () => setFilter({ q: keyword.trim() });
  const clearAll = () => {
    setKeyword("");
    setQuery({
      q: "",
      category: "",
      age: "",
      price: "",
      location: "",
      city: "",
      date: "",
      sort: "",
    });
    setPage(1);
  };

  const requestLink = `/request-class?category=${encodeURIComponent(
    query.category || "",
  )}&location=${encodeURIComponent(query.location || "")}`;

  return (
    <div className="min-h-screen bg-white font-sans text-brand-brown [color-scheme:light]">
      <Helmet>
        <title>Activities & Classes for Kids in Dubai — Kidventures</title>
        <meta
          name="description"
          content="Browse and book trusted kids' activities and classes in Dubai — filter by category, age, price and location."
        />
      </Helmet>

      <Navbar />

      {/* Hero search */}
      <section className="bg-brand-cream px-4 py-8 sm:px-6 md:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-4 text-xl font-bold text-brand-brown sm:text-2xl">
            Find the perfect activity for your child
          </h1>
          <div className="flex items-stretch gap-2 rounded-2xl bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
            <div className="flex flex-1 items-center gap-2 px-2">
              <SearchIcon />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
                placeholder="Search activities, camps or instructors..."
                className="w-full border-none bg-transparent text-[13px] text-brand-brown outline-none placeholder:text-gray-400"
              />
            </div>
            <button
              onClick={applySearch}
              className="whitespace-nowrap rounded-[10px] bg-brand-orange px-5 text-sm font-bold text-white"
            >
              Search
            </button>
          </div>
        </div>
      </section>

      {/* Top bar: count + sort + mobile filter toggle */}
      <section className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-cream px-4 py-4 sm:px-6 md:px-10">
        <div className="text-sm font-bold text-brand-brown">
          {loading
            ? "Loading…"
            : `${total} ${total === 1 ? "activity" : "activities"} found`}
          {query.city && (
            <span className="ml-2 font-medium text-brand-brown/60">
              in {query.city}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters((s) => !s)}
            className="rounded-[10px] border border-gray-200 px-3 py-2 text-[13px] font-semibold text-brand-brown md:hidden"
          >
            {showFilters ? "Hide filters" : "Filters"}
          </button>
          <select
            value={query.sort}
            onChange={(e) => setFilter({ sort: e.target.value })}
            className="rounded-[10px] border border-gray-200 px-3 py-2 text-[13px] font-semibold text-brand-brown outline-none focus:border-brand-orange"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value || "featured"} value={s.value}>
                Sort: {s.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Filters + results */}
      <section className="flex flex-col gap-6 px-4 py-6 sm:px-6 md:flex-row md:items-start md:px-10">
        {/* sidebar: hidden on mobile unless toggled */}
        <div className={`${showFilters ? "block" : "hidden"} md:block`}>
          <Sidebar
            query={query}
            categories={categories}
            setFilter={setFilter}
            clearAll={clearAll}
          />
        </div>

        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[320px] animate-pulse rounded-2xl bg-brand-cream"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl bg-brand-cream/60 px-6 py-10 text-center">
              <p className="mb-3 text-sm text-brand-brown/70">
                Couldn&apos;t load activities. Please check your connection and
                try again.
              </p>
              <button
                onClick={() => setPage((p) => p)}
                className="rounded-[10px] bg-brand-orange px-5 py-2 text-sm font-bold text-white"
              >
                Retry
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <h3 className="mb-2 text-[17px] font-bold text-brand-brown">
                No classes match your search yet
              </h3>
              <p className="mx-auto mb-5 max-w-md text-[13px] text-brand-brown/65">
                Try clearing a filter — or tell us what you&apos;re looking for
                and we&apos;ll work on bringing it to your area.
              </p>
              <Link
                to={requestLink}
                className="inline-block rounded-[10px] bg-brand-orange px-6 py-3 text-[13px] font-bold text-white no-underline"
              >
                Request a Class
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((a) => (
                  <ActivityCard key={a.id} a={a} />
                ))}
              </div>

              {/* Pagination */}
              {pages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-4">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-[10px] border border-gray-200 px-4 py-2 text-sm font-semibold text-brand-brown disabled:opacity-40"
                  >
                    ← Prev
                  </button>
                  <span className="text-sm text-brand-brown/70">
                    Page {page} of {pages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(pages, p + 1))}
                    disabled={page >= pages}
                    className="rounded-[10px] border border-gray-200 px-4 py-2 text-sm font-semibold text-brand-brown disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              )}

              {/* Request a Class banner */}
              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-dashed border-brand-orange px-6 py-5">
                <div>
                  <div className="text-[15px] font-bold text-brand-brown">
                    Not seeing the right class?
                  </div>
                  <div className="text-[13px] text-brand-brown/70">
                    Tell us what you&apos;re looking for and we&apos;ll try to
                    bring it to your area.
                  </div>
                </div>
                <Link
                  to={requestLink}
                  className="whitespace-nowrap rounded-[10px] bg-brand-orange px-5 py-2.5 text-[13px] font-bold text-white no-underline"
                >
                  Request a Class
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default ActivityPage;
