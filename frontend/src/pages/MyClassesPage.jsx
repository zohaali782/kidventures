import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import api from "../api/axios";
import { toList } from "../api/normalize";
import { logout } from "../api/auth";

/* Cloudinary URL ko resize+auto-optimize karta hai. Agar URL Cloudinary
   ka na ho, waisi hi wapas kar deta hai. */
const cldOptimize = (url, width = 200) => {
  if (!url || typeof url !== "string" || !url.includes("res.cloudinary.com"))
    return url;
  return url.replace("/upload/", `/upload/w_${width},q_auto,f_auto/`);
};

/* ------------------------------ icons ------------------------------ */
const I = ({ children, size = 18, sw = 2 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);
const IcDash = (p) => (
  <I {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </I>
);
const IcUser = (p) => (
  <I {...p}>
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </I>
);
const IcClasses = (p) => (
  <I {...p}>
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
  </I>
);
const IcLogout = (p) => (
  <I {...p}>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </I>
);
const IcPlus = (p) => (
  <I {...p}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </I>
);
const IcEdit = (p) => (
  <I {...p}>
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </I>
);
const IcTrash = (p) => (
  <I {...p}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </I>
);
const IcPin = (p) => (
  <I {...p}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </I>
);
const IcCal = (p) => (
  <I {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </I>
);
const IcMenu = (p) => (
  <I {...p}>
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </I>
);
const IcClose = (p) => (
  <I {...p}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </I>
);

const fmtDate = (d) => {
  if (!d) return "TBD";
  const dt = new Date(d);
  return isNaN(dt)
    ? "TBD"
    : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

/* status -> label + pill classes */
const STATUS = {
  active: ["Live", "bg-green-100 text-green-700"],
  pending: ["Pending review", "bg-sky-100 text-sky-700"],
  draft: ["Draft", "bg-amber-100 text-amber-700"],
  suspended: ["Suspended", "bg-red-100 text-red-700"],
  archived: ["Archived", "bg-gray-200 text-gray-600"],
};
const StatusBadge = ({ status }) => {
  const [label, cls] = STATUS[status] || STATUS.draft;
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${cls}`}>
      {label}
    </span>
  );
};

const TABS = [
  ["all", "All"],
  ["active", "Live"],
  ["pending", "Pending"],
  ["draft", "Draft"],
];

export default function MyClassesPage() {
  const nav = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("all");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const { data } = await api.get("/activities/my-classes");
        if (alive) setClasses(toList(data.activities || data.classes || data));
      } catch (e) {
        if (alive)
          setErr(
            "Couldn't load your classes. Check you're logged in, or retry.",
          );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const showToast = (m) => {
    setToast(m);
    setTimeout(() => setToast(""), 2600);
  };

  const counts = useMemo(() => {
    const c = { all: classes.length, active: 0, pending: 0, draft: 0 };
    classes.forEach((x) => {
      if (c[x.status] !== undefined) c[x.status] += 1;
    });
    return c;
  }, [classes]);

  const filtered =
    tab === "all" ? classes : classes.filter((c) => c.status === tab);

  const doDelete = async (id) => {
    setDeleting(true);
    try {
      const { data } = await api.delete(`/activities/${id}`);
      // backend archives (instead of deleting) if the class has bookings
      if (/archived/i.test(data?.message || "")) {
        setClasses((cs) =>
          cs.map((c) => (c._id === id ? { ...c, status: "archived" } : c)),
        );
        showToast("Class had bookings, so it was archived.");
      } else {
        setClasses((cs) => cs.filter((c) => c._id !== id));
        showToast("Class deleted.");
      }
    } catch (e) {
      showToast(e?.response?.data?.message || "Couldn't delete the class.");
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  const doLogout = () => {
    logout();
    nav("/login");
  };

  const navItems = [
    { label: "Dashboard", icon: IcDash, to: "/instructor/dashboard" },
    { label: "My Classes", icon: IcClasses, to: "/instructor/my-classes" },
    { label: "Create Class", icon: IcPlus, to: "/instructor/create-class" },
    {
      label: "Profile & Verification",
      icon: IcUser,
      to: "/instructor/dashboard",
    },
    { label: "Logout", icon: IcLogout, onClick: doLogout },
  ];

  const Sidebar = (
    <div className="flex h-full flex-col bg-brand-brown py-5 text-white">
      <div className="flex items-center justify-between px-5 pb-5">
        <Link to="/" className="text-xl font-extrabold text-brand-gold">
          Kidventures
        </Link>
        <button
          className="text-white/70 lg:hidden"
          onClick={() => setDrawer(false)}
        >
          <IcClose size={20} />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto">
        {navItems.map(({ label, icon: Icon, to, onClick }) => {
          const on = label === "My Classes";
          const cls = `flex items-center gap-3 px-5 py-2.5 text-sm ${
            on
              ? "border-l-[3px] border-brand-gold bg-brand-gold/15 font-bold text-brand-gold"
              : "border-l-[3px] border-transparent text-white/85 hover:bg-white/5"
          }`;
          return to ? (
            <Link
              key={label}
              to={to}
              className={cls}
              onClick={() => setDrawer(false)}
            >
              <Icon size={17} /> {label}
            </Link>
          ) : (
            <button
              key={label}
              onClick={onClick}
              className={`${cls} w-full text-left`}
            >
              <Icon size={17} /> {label}
            </button>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F5F2] text-brand-brown">
      <Helmet>
        <title>My Classes — Kidventures</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-brand-brown px-5 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 lg:block">
          {Sidebar}
        </aside>
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setDrawer(false)}
            />
            <div className="absolute left-0 top-0 h-full w-[260px]">
              {Sidebar}
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6">
          {/* header */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button className="lg:hidden" onClick={() => setDrawer(true)}>
                <IcMenu size={22} />
              </button>
              <div>
                <h1 className="text-xl font-bold sm:text-2xl">My Classes</h1>
                <p className="text-xs opacity-65">
                  Manage all the classes you teach.
                </p>
              </div>
            </div>
            <Link
              to="/instructor/create-class"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-bold text-white hover:opacity-90"
            >
              <IcPlus size={16} /> Create New Class
            </Link>
          </div>

          {/* tabs */}
          <div className="mb-5 flex flex-wrap gap-2">
            {TABS.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${
                  tab === key
                    ? "border-brand-orange bg-brand-orange text-white"
                    : "border-gray-200 bg-white text-brand-brown"
                }`}
              >
                {label} ({counts[key] ?? 0})
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-2xl bg-black/5"
                />
              ))}
            </div>
          ) : err ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
              {err}
              <div className="mt-3">
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-lg bg-brand-orange px-4 py-2 font-bold text-white"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
              <div className="mb-3 flex justify-center text-brand-orange">
                <IcClasses size={40} />
              </div>
              <h3 className="mb-1 text-base font-bold">No classes here yet</h3>
              <p className="mb-5 text-sm opacity-60">
                Create your first class to start receiving bookings.
              </p>
              <Link
                to="/instructor/create-class"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-5 py-2.5 text-sm font-bold text-white"
              >
                <IcPlus size={16} /> Create New Class
              </Link>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filtered.map((c) => {
                const next =
                  c.nextSession ||
                  toList(c.sessions).find(
                    (s) => new Date(s.date) >= new Date(),
                  );
                const online = String(c.format)
                  .toLowerCase()
                  .includes("online");
                const cover =
                  c.coverImage?.url ||
                  (Array.isArray(c.images) && c.images[0]?.url);
                return (
                  <div
                    key={c._id}
                    className="flex flex-wrap items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                  >
                    {/* thumb */}
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-brand-cream">
                      {cover ? (
                        <img
                          src={cldOptimize(cover, 160)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                      <span
                        className={`absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[9px] font-bold text-white ${online ? "bg-brand-sky" : "bg-brand-orange"}`}
                      >
                        {c.format}
                      </span>
                    </div>

                    {/* info */}
                    <div className="min-w-[200px] flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-bold">{c.title}</span>
                        <StatusBadge status={c.status} />
                      </div>
                      <div className="mb-1.5 text-xs opacity-65">
                        {c.category?.name ||
                          c.suggestedCategory ||
                          "Uncategorised"}{" "}
                        · Ages {c.ageMin}–{c.ageMax}
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs opacity-80">
                        <span className="inline-flex items-center gap-1">
                          <IcCal size={13} /> {fmtDate(next?.date)}
                          {next?.startTime ? ` · ${next.startTime}` : ""}
                        </span>
                        {!online && c.location?.area && (
                          <span className="inline-flex items-center gap-1">
                            <IcPin size={13} /> {c.location.area}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* seats + price */}
                    <div className="text-center">
                      <div className="text-base font-bold">
                        {toList(c.sessions).length}
                      </div>
                      <div className="text-[10px] opacity-60">sessions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-base font-bold text-brand-orange">
                        AED {c.price}
                      </div>
                      <div className="text-[10px] opacity-60">per child</div>
                    </div>

                    {/* actions */}
                    <div className="flex gap-2">
                      <Link
                        title="Edit"
                        to={`/instructor/edit-class/${c._id}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white hover:border-brand-orange"
                      >
                        <IcEdit size={16} />
                      </Link>
                      <button
                        title="Delete"
                        onClick={() => setConfirmDelete(c)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-red-600 hover:border-red-300"
                      >
                        <IcTrash size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-5">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h3 className="mb-2 text-lg font-bold">
              Delete "{confirmDelete.title}"?
            </h3>
            <p className="mb-5 text-sm opacity-70">
              If this class has bookings it will be archived (kept for booking
              history) instead of deleted. Otherwise it's removed permanently.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => doDelete(confirmDelete._id)}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
