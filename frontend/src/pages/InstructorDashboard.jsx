import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import api from "../api/axios";
import { toList } from "../api/normalize";
import { logout } from "../api/auth";
import InstructorVerification from "./InstructorVerification";

/* -------------------------------- icons -------------------------------- */
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
const IcCal = (p) => (
  <I {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </I>
);
const IcMoney = (p) => (
  <I {...p}>
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
  </I>
);
const IcDocs = (p) => (
  <I {...p}>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </I>
);
const IcHome = (p) => (
  <I {...p}>
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V9.5z" />
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

const AED = (n) =>
  "AED " +
  (Number(n) || 0).toLocaleString("en-AE", { maximumFractionDigits: 0 });
const fmtDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt)
    ? ""
    : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

/* status pill */
const StatusPill = ({ status }) => {
  const map = {
    approved: ["bg-green-100 text-green-700", "Verified"],
    pending: ["bg-sky-100 text-sky-700", "Under review"],
    rejected: ["bg-red-100 text-red-700", "Needs changes"],
    incomplete: ["bg-amber-100 text-amber-700", "Not submitted"],
  };
  const [cls, label] = map[status] || map.incomplete;
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${cls}`}>
      {label}
    </span>
  );
};

export default function InstructorDashboard() {
  const nav = useNavigate();
  const [profile, setProfile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [classes, setClasses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [view, setView] = useState("dashboard"); // "dashboard" | "profile"
  const [drawer, setDrawer] = useState(false);
  const [toast, setToast] = useState("");

  const refetchProfile = useCallback(async () => {
    const { data } = await api.get("/instructors/me");
    setProfile(data.profile || data);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const [pRes, cRes] = await Promise.all([
          api.get("/instructors/me"),
          api.get("/categories").catch(() => ({ data: { categories: [] } })),
        ]);
        if (!alive) return;
        const prof = pRes.data.profile || pRes.data;
        setProfile(prof);
        setCategories(toList(cRes.data.categories || cRes.data));
        // if not approved, land straight on the profile/verification view
        setView(
          prof?.verificationStatus === "approved" ? "dashboard" : "profile",
        );

        // secondary data (non-blocking)
        const [clsRes, bkRes, eRes] = await Promise.allSettled([
          api.get("/activities/my-classes"),
          api.get("/bookings/instructor"),
          api.get("/payments/earnings"),
        ]);
        if (!alive) return;
        if (clsRes.status === "fulfilled")
          setClasses(
            toList(
              clsRes.value.data.activities ||
                clsRes.value.data.classes ||
                clsRes.value.data,
            ),
          );
        if (bkRes.status === "fulfilled")
          setBookings(toList(bkRes.value.data.bookings || bkRes.value.data));
        if (eRes.status === "fulfilled") setEarnings(eRes.value.data);
      } catch (e) {
        if (alive)
          setErr(
            "Couldn't load the dashboard. Check that you're logged in, or retry.",
          );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const status = profile?.verificationStatus || "incomplete";
  const firstName = (profile?.user?.name || "there").split(" ")[0];

  /* ---- earnings: from the endpoint defensively, else compute from bookings ---- */
  const earn = useMemo(() => {
    const e = earnings || {};
    const pick = (...keys) => {
      for (const k of keys) {
        const v = k.split(".").reduce((o, kk) => (o == null ? o : o[kk]), e);
        if (v != null) return v;
      }
      return undefined;
    };
    const fromBookings = bookings.reduce(
      (s, b) => s + (Number(b.instructorEarning) || 0),
      0,
    );
    const total =
      pick("totalEarnings", "total", "earnings.total", "lifetime") ??
      fromBookings;
    const pending =
      pick(
        "pendingBalance",
        "pendingPayout",
        "pending",
        "payout.pendingBalance",
      ) ?? 0;
    const thisMonth =
      pick("thisMonth", "monthEarnings", "currentMonth") ?? fromBookings;
    // chart series
    let series = pick("series", "chart", "daily", "monthly");
    if (!Array.isArray(series)) {
      const byMonth = {};
      bookings.forEach((b) => {
        const d = new Date(b.sessionDate || b.createdAt);
        if (isNaN(d)) return;
        const key = d.toLocaleDateString("en-GB", { month: "short" });
        byMonth[key] = (byMonth[key] || 0) + (Number(b.instructorEarning) || 0);
      });
      series = Object.entries(byMonth).map(([label, amount]) => ({
        label,
        amount,
      }));
    } else {
      series = series.map((p) => ({
        label: p.label || p.day || p.month || p.date || "",
        amount: Number(p.amount ?? p.value ?? p.total) || 0,
      }));
    }
    return { total, pending, thisMonth, series };
  }, [earnings, bookings]);

  /* ---- upcoming sessions across classes ---- */
  const upcoming = useMemo(() => {
    const now = new Date();
    const rows = [];
    classes.forEach((a) => {
      toList(a.sessions).forEach((s) => {
        const d = new Date(s.date);
        if (!isNaN(d) && d >= now) {
          rows.push({
            title: a.title,
            date: s.date,
            startTime: s.startTime,
            booked: s.seatsBooked ?? 0,
            capacity: s.capacity ?? 0,
          });
        }
      });
    });
    return rows.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5);
  }, [classes]);

  const recentBookings = useMemo(
    () =>
      [...bookings]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 5),
    [bookings],
  );

  const stats = [
    {
      label: "Total Bookings",
      value: profile?.stats?.totalBookings ?? bookings.length,
    },
    { label: "Total Students", value: profile?.stats?.totalStudents ?? 0 },
    { label: "Active Classes", value: classes.length },
    { label: "This Month", value: AED(earn.thisMonth) },
    {
      label: "Rating",
      value: profile?.rating?.count > 0 ? `${profile.rating.average} ★` : "New",
    },
  ];

  const showToast = (m) => {
    setToast(m);
    setTimeout(() => setToast(""), 2200);
  };

  const doLogout = () => {
    logout();
    nav("/login");
  };

  const noop = () => showToast("This section is coming soon.");

  const navItems = [
    {
      label: "Dashboard",
      icon: IcDash,
      onClick: () => (setView("dashboard"), setDrawer(false)),
    },
    {
      label: "Profile & Verification",
      icon: IcUser,
      onClick: () => (setView("profile"), setDrawer(false)),
    },
    { label: "My Classes", icon: IcClasses, to: "/instructor/my-classes" },
    { label: "Create Class", icon: IcPlus, to: "/instructor/create-class" },
    { label: "Calendar", icon: IcCal, onClick: noop },
    {
      label: "Earnings",
      icon: IcMoney,
      onClick: () => (setView("dashboard"), setDrawer(false)),
    },
    {
      label: "Documents",
      icon: IcDocs,
      onClick: () => (setView("profile"), setDrawer(false)),
    },
    { label: "View Website", icon: IcHome, to: "/" },
    { label: "Logout", icon: IcLogout, onClick: doLogout },
  ];

  /* ------------------------------ sidebar ------------------------------ */
  const Sidebar = (
    <div className="flex h-full flex-col bg-brand-brown py-5 text-white">
      <div className="flex items-center justify-between px-5 pb-4">
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

      <div className="mb-3 flex items-center gap-3 border-b border-white/10 px-5 pb-4">
        {profile?.user?.avatar?.url ? (
          <img
            src={profile.user.avatar.url}
            alt=""
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gold font-bold text-brand-brown">
            {firstName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">
            {profile?.user?.name || "Instructor"}
          </div>
          <div className="text-[10px] text-brand-gold">
            {status === "approved" ? "Verified Instructor" : "Instructor"}
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto">
        {navItems.map(({ label, icon: Icon, to, onClick }) => {
          const on =
            (label === "Dashboard" && view === "dashboard") ||
            (label === "Profile & Verification" && view === "profile");
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

  /* ------------------------------- render ------------------------------- */
  return (
    <div className="min-h-screen bg-[#F7F5F2] text-brand-brown">
      <Helmet>
        <title>Instructor Dashboard — Kidventures</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-brand-brown px-5 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex">
        {/* desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 lg:block">
          {Sidebar}
        </aside>

        {/* mobile drawer */}
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

        {/* main */}
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6">
          {/* header */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                className="text-brand-brown lg:hidden"
                onClick={() => setDrawer(true)}
              >
                <IcMenu size={22} />
              </button>
              <div>
                <h1 className="text-xl font-bold sm:text-2xl">
                  Welcome back, {firstName}!
                </h1>
                <div className="mt-1 flex items-center gap-2 text-xs opacity-70">
                  <StatusPill status={status} />
                  {view === "profile" && status === "approved" && (
                    <button
                      onClick={() => setView("dashboard")}
                      className="text-brand-orange underline"
                    >
                      Back to dashboard
                    </button>
                  )}
                </div>
              </div>
            </div>
            <Link
              to="/instructor/create-class"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-bold text-white hover:opacity-90"
            >
              <IcPlus size={16} /> Create New Class
            </Link>
          </div>

          {loading ? (
            <div className="grid animate-pulse grid-cols-2 gap-4 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-2xl bg-black/5" />
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
          ) : view === "profile" ? (
            <InstructorVerification
              profile={profile}
              categories={categories}
              onRefetch={refetchProfile}
            />
          ) : (
            <>
              {/* not-approved nudge on dashboard view */}
              {status !== "approved" && (
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <span>
                    Verify your profile first to start publishing classes.
                  </span>
                  <button
                    onClick={() => setView("profile")}
                    className="rounded-lg bg-brand-orange px-4 py-2 text-xs font-bold text-white"
                  >
                    Complete verification
                  </button>
                </div>
              )}

              {/* stats */}
              <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                  >
                    <div className="text-[11px] uppercase tracking-wide opacity-60">
                      {s.label}
                    </div>
                    <div className="mt-1 text-xl font-bold text-brand-orange">
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {/* upcoming */}
                <Panel title="Upcoming Classes">
                  {upcoming.length === 0 ? (
                    <Empty text="No upcoming sessions." />
                  ) : (
                    upcoming.map((c, i) => (
                      <Row key={i}>
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-brand-cream" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold">
                            {c.title}
                          </div>
                          <div className="text-xs opacity-60">
                            {fmtDate(c.date)}{" "}
                            {c.startTime ? `· ${c.startTime}` : ""}
                          </div>
                        </div>
                        <div className="text-xs font-bold">
                          {c.booked}/{c.capacity}
                        </div>
                      </Row>
                    ))
                  )}
                </Panel>

                {/* recent bookings */}
                <Panel title="Recent Bookings">
                  {recentBookings.length === 0 ? (
                    <Empty text="No bookings yet." />
                  ) : (
                    recentBookings.map((b, i) => (
                      <Row key={i}>
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gold text-xs font-bold text-brand-brown">
                          {(b.parent?.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold">
                            {b.parent?.name || "Parent"}
                          </div>
                          <div className="truncate text-xs opacity-60">
                            {b.numberOfChildren || b.children?.length || 1}{" "}
                            child · {b.activityTitle}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold">
                            {AED(b.instructorEarning)}
                          </div>
                          <div className="text-[10px] opacity-50">
                            {fmtDate(b.createdAt)}
                          </div>
                        </div>
                      </Row>
                    ))
                  )}
                </Panel>

                {/* earnings */}
                <Panel title="Earnings">
                  <div className="mb-2">
                    <span className="text-xl font-bold">{AED(earn.total)}</span>
                    <span className="ml-2 text-xs opacity-60">lifetime</span>
                  </div>
                  <div className="h-40 w-full">
                    {earn.series.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={earn.series}
                          margin={{ top: 5, right: 10, left: -18, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#f0f0f0"
                          />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 10 }}
                            stroke="#ccc"
                          />
                          <YAxis tick={{ fontSize: 10 }} stroke="#ccc" />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="amount"
                            stroke="#F5941F"
                            strokeWidth={2.5}
                            dot={{ r: 3, fill: "#F5941F" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <Empty text="No earnings data yet." />
                    )}
                  </div>
                  <div className="mt-2 text-xs opacity-70">
                    Pending payout: <b>{AED(earn.pending)}</b>
                  </div>
                </Panel>

                {/* quick actions */}
                <Panel title="Quick Actions">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        icon: IcPlus,
                        label: "Create New Class",
                        to: "/instructor/create-class",
                      },
                      {
                        icon: IcClasses,
                        label: "Manage Classes",
                        to: "/instructor/my-classes",
                      },
                      {
                        icon: IcUser,
                        label: "Edit Profile",
                        onClick: () => setView("profile"),
                      },
                      {
                        icon: IcMoney,
                        label: "Earnings & Payouts",
                        onClick: noop,
                      },
                    ].map(({ icon: Icon, label, to, onClick }) => {
                      const inner = (
                        <>
                          <Icon size={20} />
                          <span className="text-xs font-semibold">{label}</span>
                        </>
                      );
                      const cls =
                        "flex flex-col items-center gap-2 rounded-xl bg-brand-cream p-4 text-center text-brand-orange hover:brightness-95";
                      return to ? (
                        <Link key={label} to={to} className={cls}>
                          {inner}
                        </Link>
                      ) : (
                        <button key={label} onClick={onClick} className={cls}>
                          {inner}
                        </button>
                      );
                    })}
                  </div>
                </Panel>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/* ------------------------------ small bits ------------------------------ */
function Panel({ title, children }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-bold">{title}</h3>
      {children}
    </div>
  );
}
function Row({ children }) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-100 py-2.5 last:border-0">
      {children}
    </div>
  );
}
function Empty({ text }) {
  return (
    <div className="flex h-full items-center py-6 text-sm opacity-50">
      {text}
    </div>
  );
}
