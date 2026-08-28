import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../api/axios";
import { getStoredUser } from "../api/auth";

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
const IcSearch = (p) => (
  <I {...p}>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </I>
);
const IcCheck = (p) => (
  <I {...p}>
    <polyline points="20 6 9 17 4 12" />
  </I>
);
const IcAlert = (p) => (
  <I {...p}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </I>
);
const IcBell = (p) => (
  <I {...p}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </I>
);

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-orange";
const labelCls = "mb-1.5 block text-[13px] font-semibold";

const categories = [
  "Arts & Crafts",
  "Pottery & Clay",
  "STEM",
  "Robotics",
  "Coding",
  "Languages",
  "Arabic",
  "Cooking & Baking",
  "Academic Support",
  "Life Skills",
  "Music",
  "Piano",
  "Sports",
  "Swimming",
  "Football",
  "Chess",
  "Ballet",
  "Public Speaking",
  "Quran & Islamic Studies",
  "Holiday Camps",
];
const ageGroups = ["2 - 4", "5 - 7", "8 - 10", "11 - 13", "14 - 16"];
const locations = [
  "Jumeirah",
  "Mirdif",
  "Al Barsha",
  "Motor City",
  "Al Quoz",
  "Arabian Ranches",
  "Dubai Silicon Oasis",
  "Downtown Dubai",
  "Dubai Marina",
  "Online",
];
const formatMap = { Any: "any", "In-Person": "in-person", Online: "online" };

export default function RequestClassPage() {
  const [params] = useSearchParams();
  const user = getStoredUser();

  const [form, setForm] = useState({
    category: params.get("category") || "",
    age: params.get("age") || "",
    location: params.get("location") || "",
    format: "Any",
    note: "",
    email: user?.email || "",
    notify: true,
  });
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiErr, setApiErr] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const e = {};
    if (!form.category.trim())
      e.category = "Tell us what kind of class you're after";
    if (!form.age) e.age = "Choose an age group";
    if (!form.location.trim()) e.location = "Tell us which area suits you";
    if (!form.email.trim()) e.email = "Enter your email so we can notify you";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Enter a valid email";
    setErrors(e);
    setApiErr("");
    if (Object.keys(e).length > 0) return;

    setSubmitting(true);
    try {
      await api.post("/class-requests", {
        category: form.category.trim(),
        ageGroup: form.age,
        location: form.location.trim(),
        format: formatMap[form.format] || "any",
        note: form.note.trim(),
        email: form.email.trim(),
        notify: form.notify,
      });
      setSent(true);
    } catch (err) {
      setApiErr(
        err?.response?.data?.message ||
          "Couldn't submit your request. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-[#F7F5F2] font-sans text-brand-brown">
        <Navbar />
        <div className="mx-auto max-w-[520px] px-5 py-16">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4.5 flex h-[68px] w-[68px] items-center justify-center rounded-full bg-green-100">
              <IcCheck size={34} className="text-green-600" />
            </div>
            <h1 className="mb-2.5 text-xl font-bold">
              Thanks, request received!
            </h1>
            <p className="mb-6 text-[13px] leading-relaxed opacity-75">
              We're collecting requests like yours to decide which classes to
              bring to Dubai next. As soon as a <b>{form.category}</b> class for
              ages <b>{form.age}</b> opens in <b>{form.location}</b>, we'll
              email you.
            </p>
            <div className="flex flex-wrap justify-center gap-2.5">
              <Link
                to="/activities"
                className="rounded-lg bg-brand-orange px-5 py-3 text-[13px] font-bold text-white no-underline"
              >
                Browse other classes
              </Link>
              <button
                onClick={() => {
                  setSent(false);
                  setForm((f) => ({ ...f, note: "" }));
                }}
                className="rounded-lg border border-gray-200 bg-white px-5 py-3 text-[13px] font-bold"
              >
                Request another
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5F2] font-sans text-brand-brown">
      <Helmet>
        <title>Request a Class — Kidventures</title>
      </Helmet>
      <Navbar />

      <div className="mx-auto max-w-[560px] px-5 py-9 pb-16">
        {/* header */}
        <div className="mb-6.5 text-center">
          <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-cream">
            <IcSearch size={26} className="text-brand-orange" />
          </div>
          <h1 className="mb-2 text-2xl font-bold">
            Can't find what you're looking for?
          </h1>
          <p className="text-[13px] leading-relaxed opacity-70">
            Tell us what your child wants to learn and where. We use these
            requests to decide which instructors to bring on next, and we'll
            email you the moment it's available.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6.5 shadow-sm">
          {apiErr && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
              <IcAlert size={15} /> {apiErr}
            </div>
          )}

          <div className="mb-4.5">
            <label className={labelCls}>
              What kind of class is your child looking for?
            </label>
            <input
              list="category-suggestions"
              className={inputCls}
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              placeholder="Type anything, e.g. Fencing, Ballet, Arabic calligraphy"
            />
            <datalist id="category-suggestions">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <div className="mt-1.5 text-[11px] opacity-55">
              Not on our list? Type it anyway, that's exactly what we want to
              hear about.
            </div>
            {errors.category && (
              <div className="mt-1.5 text-xs text-red-600">
                {errors.category}
              </div>
            )}
          </div>

          <div className="mb-4.5 flex flex-wrap gap-3.5">
            <div className="min-w-[170px] flex-1">
              <label className={labelCls}>Child's age group</label>
              <select
                className={inputCls}
                value={form.age}
                onChange={(e) => set("age", e.target.value)}
              >
                <option value="">Select age</option>
                {ageGroups.map((a) => (
                  <option key={a} value={a}>
                    {a} years
                  </option>
                ))}
              </select>
              {errors.age && (
                <div className="mt-1.5 text-xs text-red-600">{errors.age}</div>
              )}
            </div>
            <div className="min-w-[170px] flex-1">
              <label className={labelCls}>Preferred area</label>
              <input
                list="area-suggestions"
                className={inputCls}
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="Type your area"
              />
              <datalist id="area-suggestions">
                {locations.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
              {errors.location && (
                <div className="mt-1.5 text-xs text-red-600">
                  {errors.location}
                </div>
              )}
            </div>
          </div>

          <div className="mb-4.5">
            <label className={labelCls}>Format</label>
            <div className="flex gap-2">
              {["Any", "In-Person", "Online"].map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => set("format", f)}
                  className={`flex-1 rounded-lg border py-2.5 text-center text-[13px] font-semibold ${
                    form.format === f
                      ? "border-brand-orange bg-brand-orange text-white"
                      : "border-gray-200 bg-white text-brand-brown"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4.5">
            <label className={labelCls}>Anything specific? (optional)</label>
            <textarea
              className={`${inputCls} min-h-[85px] resize-y`}
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              placeholder="e.g. weekend mornings would suit us best, or my daughter is a complete beginner"
            />
          </div>

          <div className="mb-4.5">
            <label className={labelCls}>Your email</label>
            <input
              className={inputCls}
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="you@example.com"
            />
            {errors.email && (
              <div className="mt-1.5 text-xs text-red-600">{errors.email}</div>
            )}
          </div>

          <label className="mb-5.5 flex cursor-pointer items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={form.notify}
              onChange={(e) => set("notify", e.target.checked)}
              className="h-4 w-4 accent-brand-orange"
            />
            <span className="flex items-center gap-1.5">
              <IcBell size={14} className="text-brand-orange" /> Email me when
              this class becomes available
            </span>
          </label>

          <button
            onClick={submit}
            disabled={submitting}
            className="w-full rounded-lg bg-brand-orange py-3.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit request"}
          </button>
        </div>

        <div className="mt-4.5 flex items-start gap-2 text-xs leading-relaxed opacity-65">
          <IcAlert size={15} className="mt-0.5 shrink-0 text-brand-orange" />
          <span>
            Requests help us grow based on what families actually want, rather
            than guessing. The more requests for a class, the sooner we bring an
            instructor for it.
          </span>
        </div>
      </div>

      <Footer />
    </div>
  );
}
