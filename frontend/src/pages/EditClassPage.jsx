import { useState, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import api from "../api/axios";
import { toList } from "../api/normalize";

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
const IcBack = (p) => (
  <I {...p}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </I>
);
const IcPlus = (p) => (
  <I {...p}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </I>
);
const IcX = (p) => (
  <I {...p}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </I>
);
const IcUpload = (p) => (
  <I {...p}>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </I>
);
const IcCheck = (p) => (
  <I {...p}>
    <polyline points="20 6 9 17 4 12" />
  </I>
);

const OTHER = "__other__";
const MAX_IMAGES = 8;

function addMinutes(time, mins) {
  const [h, m] = String(time).split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return time;
  const total = h * 60 + m + (Number(mins) || 0);
  const hh = String(Math.floor((total % 1440) / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}
const fmtDate = (d) => {
  const dt = new Date(d);
  return isNaN(dt)
    ? ""
    : dt.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-brand-brown outline-none focus:border-brand-orange";
const labelCls = "mb-1.5 block text-xs font-semibold text-brand-brown/80";

function Field({ label, error, children, className = "" }) {
  return (
    <div className={className}>
      <label className={labelCls}>{label}</label>
      {children}
      {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
    </div>
  );
}
function Section({ title, subtitle, children }) {
  return (
    <div className="mb-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4">
        <h3 className="text-sm font-bold">{title}</h3>
        {subtitle && <div className="text-xs opacity-60">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

export default function EditClassPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [categories, setCategories] = useState([]);

  const [form, setForm] = useState(null); // null until loaded
  const [learnList, setLearnList] = useState([""]);
  const [images, setImages] = useState([]); // [{_id, url}]
  const [sessions, setSessions] = useState([]); // existing sessions from server

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiErr, setApiErr] = useState("");
  const [toast, setToast] = useState("");

  const [showFeeInfo, setShowFeeInfo] = useState(false);

  const flash = (m) => {
    setToast(m);
    setTimeout(() => setToast(""), 2600);
  };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isOther = form?.category === OTHER;

  /* ---------------- load ---------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [actRes, catRes] = await Promise.all([
          api.get(`/activities/${id}`),
          api.get("/categories").catch(() => ({ data: { categories: [] } })),
        ]);
        if (!alive) return;
        const a = actRes.data.activity || actRes.data;
        if (!a || !(a._id || a.id)) {
          setNotFound(true);
          return;
        }
        setCategories(toList(catRes.data.categories || catRes.data));
        setForm({
          title: a.title || "",
          category:
            a.category?._id || a.category || (a.suggestedCategory ? OTHER : ""),
          suggestedCategory: a.suggestedCategory || "",
          description: a.description || "",
          ageMin: a.ageMin ?? "",
          ageMax: a.ageMax ?? "",
          durationMinutes: a.durationMinutes ?? "",
          format: a.format || "in-person",
          area: a.location?.area || "",
          address: a.location?.address || "",
          languages: Array.isArray(a.languages)
            ? a.languages.join(", ")
            : "English",
          price: a.price ?? "",
          capacity: a.capacity ?? "",
          materialsIncluded: !!a.materialsIncluded,
          whatToBring: a.whatToBring || "",
          status: a.status,
        });
        setLearnList(
          Array.isArray(a.whatChildrenLearn) && a.whatChildrenLearn.length
            ? a.whatChildrenLearn
            : [""],
        );
        setImages(
          (Array.isArray(a.images) ? a.images : []).map((im) => ({
            _id: im._id,
            url: im.url,
            isCover: im.isCover,
          })),
        );
        setSessions(toList(a.sessions));
      } catch {
        if (alive) setNotFound(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  /* ---------------- learn points ---------------- */
  const setLearn = (i, v) =>
    setLearnList((l) => l.map((x, idx) => (idx === i ? v : x)));
  const addLearn = () => setLearnList((l) => [...l, ""]);
  const removeLearn = (i) =>
    setLearnList((l) => l.filter((_, idx) => idx !== i));

  /* ---------------- price fee hint ---------------- */
  const [feeInfoShownOnce, setFeeInfoShownOnce] = useState(true); // don't auto-pop on edit load
  const priceHint = useMemo(() => {
    const p = Number(form?.price);
    if (!p) return "";
    const youReceive = Math.round(p * 0.85 * 100) / 100;
    return `Parents pay exactly AED ${p} · you receive AED ${youReceive} after Kidventures' 15% commission`;
  }, [form?.price]);

  /* ---------------- validate + save basic fields ---------------- */
  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Enter a class title";
    if (!form.category) e.category = "Choose a category";
    if (isOther && !form.suggestedCategory.trim())
      e.category = "Type your category";
    if (!form.description.trim()) e.description = "Add a description";
    if (form.ageMin === "" || form.ageMax === "") e.age = "Enter the age range";
    else if (Number(form.ageMin) > Number(form.ageMax))
      e.age = "Min age can't be greater than max";
    if (!form.durationMinutes || Number(form.durationMinutes) < 15)
      e.duration = "Duration must be at least 15 minutes";
    if (form.format === "in-person" && !form.area.trim())
      e.area = "Enter the venue area";
    if (form.format === "in-person" && !form.address.trim())
      e.address = "Enter the venue address so parents can find you";

    if (!form.price) e.price = "Enter a price";
    if (!form.capacity || Number(form.capacity) < 1)
      e.capacity = "Enter class capacity";
    return e;
  };

  const saveChanges = async (submitForReview = false) => {
    const e = validate();
    setErrors(e);
    setApiErr("");
    if (Object.keys(e).length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      whatChildrenLearn: learnList.map((x) => x.trim()).filter(Boolean),
      ageMin: Number(form.ageMin),
      ageMax: Number(form.ageMax),
      price: Number(form.price),
      durationMinutes: Number(form.durationMinutes),
      format: form.format,
      languages: form.languages
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      location: {
        area: form.area.trim(),
        city: "Dubai",
        address: form.address.trim(),
      },
      capacity: Number(form.capacity),
      materialsIncluded: form.materialsIncluded,
      whatToBring: form.whatToBring.trim(),
    };
    if (isOther) payload.suggestedCategory = form.suggestedCategory.trim();
    else payload.category = form.category;

    // Sirf tab status badlo jab instructor explicitly "resubmit" kare
    // (jaise rejected/draft class dobara review ke liye bhejni ho).
    if (submitForReview) payload.status = "pending";

    setSaving(true);
    try {
      await api.put(`/activities/${id}`, payload);
      flash(
        submitForReview
          ? "Changes saved and sent for review."
          : "Changes saved.",
      );
      if (submitForReview) set("status", "pending");
    } catch (err) {
      setApiErr(
        err?.response?.data?.message ||
          "Couldn't save changes. Please try again.",
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- sessions (live save) ---------------- */
  const [newSession, setNewSession] = useState({ date: "", startTime: "" });
  const [addingSession, setAddingSession] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const addSession = async () => {
    if (!newSession.date || !newSession.startTime) {
      flash("Pick a date and start time first.");
      return;
    }
    setAddingSession(true);
    try {
      const dur = Number(form.durationMinutes) || 60;
      const { data } = await api.post(`/activities/${id}/sessions`, {
        date: newSession.date,
        startTime: newSession.startTime,
        endTime: addMinutes(newSession.startTime, dur),
        capacity: Number(form.capacity) || undefined,
      });
      setSessions(toList(data.activity?.sessions));
      setNewSession({ date: "", startTime: "" });
      flash("Session added.");
    } catch (err) {
      flash(err?.response?.data?.message || "Couldn't add session.");
    } finally {
      setAddingSession(false);
    }
  };

  const cancelSession = async (sessionId) => {
    setCancellingId(sessionId);
    try {
      const { data } = await api.delete(
        `/activities/${id}/sessions/${sessionId}`,
      );
      setSessions(toList(data.activity?.sessions));
      flash(data.message);
    } catch (err) {
      flash(err?.response?.data?.message || "Couldn't remove session.");
    } finally {
      setCancellingId(null);
    }
  };

  /* ---------------- images (live save) ---------------- */
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState(null);

  const uploadImages = async (fileList) => {
    const files = Array.from(fileList).slice(
      0,
      Math.max(0, MAX_IMAGES - images.length),
    );
    setUploadingImage(true);
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        const { data } = await api.post(`/uploads/activities/${id}/image`, fd);
        setImages(
          toList(data.images).map((im) => ({
            _id: im._id,
            url: im.url,
            isCover: im.isCover,
          })),
        );
      } catch {
        flash("One of the images failed to upload.");
      }
    }
    setUploadingImage(false);
  };

  const removeImage = async (imageId) => {
    setDeletingImageId(imageId);
    try {
      const { data } = await api.delete(
        `/uploads/activities/${id}/image/${imageId}`,
      );
      setImages(
        toList(data.images).map((im) => ({
          _id: im._id,
          url: im.url,
          isCover: im.isCover,
        })),
      );
    } catch {
      flash("Couldn't remove that image.");
    } finally {
      setDeletingImageId(null);
    }
  };

  /* ---------------- render ---------------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F5F2] text-brand-brown">
        <div className="px-4 py-20 text-center opacity-60">Loading…</div>
      </div>
    );
  }
  if (notFound || !form) {
    return (
      <div className="min-h-screen bg-[#F7F5F2] p-10 text-center text-brand-brown">
        <p className="mb-4">Couldn't load this class.</p>
        <Link
          to="/instructor/my-classes"
          className="font-bold text-brand-orange"
        >
          Back to My Classes
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5F2] text-brand-brown">
      <Helmet>
        <title>Edit Class — Kidventures</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-brand-brown px-5 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-8">
        <div className="flex items-center gap-4">
          <Link
            to="/instructor/my-classes"
            className="inline-flex items-center gap-1.5 text-sm font-semibold hover:opacity-80"
          >
            <IcBack size={18} /> Back
          </Link>
          <h1 className="text-base font-bold sm:text-lg">Edit Class</h1>
        </div>
        <div className="flex items-center gap-2">
          {form.status === "rejected" || form.status === "draft" ? (
            <button
              onClick={() => saveChanges(true)}
              disabled={saving}
              className="rounded-lg bg-brand-orange px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save & Submit for Review"}
            </button>
          ) : null}
          <button
            onClick={() => saveChanges(false)}
            disabled={saving}
            className="rounded-lg border-2 border-brand-orange bg-white px-5 py-2 text-sm font-bold text-brand-orange disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {(Object.keys(errors).length > 0 || apiErr) && (
          <div className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {apiErr || "Please fix the highlighted fields below."}
          </div>
        )}

        {/* 1. basic */}
        <Section title="Basic Information" subtitle="What is this class about?">
          <div className="space-y-4">
            <Field label="Class title" error={errors.title}>
              <input
                className={inputCls}
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </Field>
            <Field label="Category" error={errors.category}>
              <select
                className={inputCls}
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    {c.name}
                  </option>
                ))}
                <option value={OTHER}>Other (not listed)</option>
              </select>
              {isOther && (
                <input
                  className={`${inputCls} mt-2`}
                  value={form.suggestedCategory}
                  onChange={(e) => set("suggestedCategory", e.target.value)}
                  placeholder="Your category"
                />
              )}
            </Field>
            <Field label="Description" error={errors.description}>
              <textarea
                className={`${inputCls} min-h-[110px] resize-y`}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
          </div>
        </Section>

        {/* 2. details */}
        <Section
          title="Class Details"
          subtitle="Age, format, duration and language"
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="Minimum age" error={errors.age}>
              <input
                type="number"
                className={inputCls}
                value={form.ageMin}
                onChange={(e) => set("ageMin", e.target.value)}
              />
            </Field>
            <Field label="Maximum age">
              <input
                type="number"
                className={inputCls}
                value={form.ageMax}
                onChange={(e) => set("ageMax", e.target.value)}
              />
            </Field>
            <Field label="Duration (minutes)" error={errors.duration}>
              <input
                type="number"
                className={inputCls}
                value={form.durationMinutes}
                onChange={(e) => set("durationMinutes", e.target.value)}
              />
            </Field>
            <Field label="Format">
              <select
                className={inputCls}
                value={form.format}
                onChange={(e) => set("format", e.target.value)}
              >
                <option value="in-person">In-person</option>
                <option value="online">Online</option>
              </select>
            </Field>
            <Field label="Venue area" error={errors.area}>
              <input
                className={inputCls}
                value={form.area}
                onChange={(e) => set("area", e.target.value)}
              />
            </Field>
            <Field
              label={
                form.format === "online"
                  ? "Address (optional)"
                  : "Venue address"
              }
              error={errors.address}
            >
              <input
                className={inputCls}
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </Field>
            <Field label="Languages (comma separated)" className="col-span-2">
              <input
                className={inputCls}
                value={form.languages}
                onChange={(e) => set("languages", e.target.value)}
              />
            </Field>
          </div>
        </Section>

        {/* 3. pricing */}
        <Section
          title="Pricing & Capacity"
          subtitle="How much and how many seats"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <label className={labelCls}>Price per child (AED)</label>
                <button
                  type="button"
                  onClick={() => setShowFeeInfo(true)}
                  className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-cream text-[10px] font-bold text-brand-orange"
                >
                  i
                </button>
              </div>
              <input
                type="number"
                className={inputCls}
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
              />
              {errors.price && (
                <div className="mt-1 text-xs text-red-600">{errors.price}</div>
              )}
            </div>
            <Field label="Capacity (max children)" error={errors.capacity}>
              <input
                type="number"
                className={inputCls}
                value={form.capacity}
                onChange={(e) => set("capacity", e.target.value)}
              />
            </Field>
          </div>
          {priceHint && (
            <p className="mt-2 text-xs text-brand-orange">{priceHint}</p>
          )}
        </Section>

        {/* 4. sessions — live save */}
        <Section
          title="Sessions"
          subtitle="Changes here save immediately, separate from the button above"
        >
          {sessions.length === 0 ? (
            <p className="mb-3 text-sm opacity-60">No sessions yet.</p>
          ) : (
            <div className="mb-4 space-y-2">
              {sessions.map((s) => {
                const sid = s._id || s.id;
                const cancelled = s.status === "cancelled";
                return (
                  <div
                    key={sid}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3.5 py-2.5 text-sm ${
                      cancelled
                        ? "border-gray-100 bg-gray-50 opacity-60"
                        : "border-gray-200"
                    }`}
                  >
                    <div>
                      <b>{fmtDate(s.date)}</b> · {s.startTime}
                      <span className="ml-2 text-xs opacity-60">
                        {s.seatsBooked || 0}/{s.capacity} booked
                        {cancelled ? " · cancelled" : ""}
                      </span>
                    </div>
                    {!cancelled && (
                      <button
                        onClick={() => cancelSession(sid)}
                        disabled={cancellingId === sid}
                        className="rounded-lg border border-red-600 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-60"
                      >
                        {cancellingId === sid
                          ? "…"
                          : s.seatsBooked > 0
                            ? "Cancel session"
                            : "Remove"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-end gap-2.5">
            <Field label="Date" className="flex-1">
              <input
                type="date"
                className={inputCls}
                value={newSession.date}
                onChange={(e) =>
                  setNewSession((s) => ({ ...s, date: e.target.value }))
                }
              />
            </Field>
            <Field label="Start time" className="flex-1">
              <input
                type="time"
                className={inputCls}
                value={newSession.startTime}
                onChange={(e) =>
                  setNewSession((s) => ({ ...s, startTime: e.target.value }))
                }
              />
            </Field>
            <button
              onClick={addSession}
              disabled={addingSession}
              className="mb-0.5 flex h-[42px] items-center gap-1.5 rounded-lg bg-brand-orange px-4 text-xs font-bold text-white disabled:opacity-60"
            >
              <IcPlus size={15} /> {addingSession ? "Adding…" : "Add session"}
            </button>
          </div>
        </Section>

        {/* 5. learning points */}
        <Section
          title="What Children Will Learn"
          subtitle="Add learning points (optional)"
        >
          <div className="space-y-2.5">
            {learnList.map((item, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className={inputCls}
                  value={item}
                  onChange={(e) => setLearn(i, e.target.value)}
                  placeholder={`Learning point ${i + 1}`}
                />
                {learnList.length > 1 && (
                  <button
                    onClick={() => removeLearn(i)}
                    className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white hover:border-red-300"
                  >
                    <IcX size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addLearn}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-brand-orange px-3.5 py-2 text-xs font-semibold text-brand-orange"
          >
            <IcPlus size={15} /> Add learning point
          </button>
        </Section>

        {/* 6. materials */}
        <Section
          title="Materials & Requirements"
          subtitle="What's included or what to bring"
        >
          <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.materialsIncluded}
              onChange={(e) => set("materialsIncluded", e.target.checked)}
              className="h-4 w-4 accent-brand-orange"
            />
            All materials are included
          </label>
          <Field label="What to bring / notes">
            <textarea
              className={`${inputCls} min-h-[80px] resize-y`}
              value={form.whatToBring}
              onChange={(e) => set("whatToBring", e.target.value)}
            />
          </Field>
        </Section>

        {/* 7. images — live save */}
        <Section
          title="Class Images"
          subtitle={`Up to ${MAX_IMAGES} · changes here save immediately`}
        >
          <p className="mb-3 text-xs text-brand-orange">
            For best results, use a landscape (wide) photo — around 16:9 or 3:2
            ratio. Portrait photos will be cropped to fit the banner.
          </p>

          {images.length < MAX_IMAGES && (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-brand-orange bg-brand-cream p-6">
              <IcUpload size={24} />
              <span className="text-sm font-semibold">
                {uploadingImage ? "Uploading…" : "Click to upload images"}
              </span>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                disabled={uploadingImage}
                onChange={(e) => {
                  uploadImages(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          )}
          {images.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {images.map((img) => (
                <div
                  key={img._id}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200"
                >
                  <img
                    src={img.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  {img.isCover && (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-brand-orange px-2 py-0.5 text-[10px] font-bold text-white">
                      Cover
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(img._id)}
                    disabled={deletingImageId === img._id}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                  >
                    {deletingImageId === img._id ? "…" : <IcX size={13} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        <div className="mt-2 flex flex-wrap justify-end gap-3">
          <Link
            to="/instructor/my-classes"
            className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold"
          >
            Done
          </Link>
          {(form.status === "rejected" || form.status === "draft") && (
            <button
              onClick={() => saveChanges(true)}
              disabled={saving}
              className="rounded-lg bg-brand-orange px-6 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save & Submit for Review"}
            </button>
          )}
          <button
            onClick={() => saveChanges(false)}
            disabled={saving}
            className="rounded-lg border-2 border-brand-orange bg-white px-6 py-2.5 text-sm font-bold text-brand-orange disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {/* price / commission explainer popup */}
      {showFeeInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-5">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h3 className="mb-2 text-base font-bold">How pricing works</h3>
            <p className="mb-4 text-sm leading-relaxed opacity-75">
              Whatever price you set is exactly what parents pay — no extra fees
              are added on top. Kidventures keeps a 15% commission out of that
              price, and the rest is yours.
            </p>
            {Number(form.price) > 0 && (
              <div className="mb-4 rounded-lg bg-brand-cream px-4 py-3 text-sm">
                <div className="flex justify-between">
                  <span className="opacity-70">Parent pays</span>
                  <b>AED {form.price}</b>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">Platform commission (15%)</span>
                  <b>
                    − AED {Math.round(Number(form.price) * 0.15 * 100) / 100}
                  </b>
                </div>
                <div className="mt-1.5 flex justify-between border-t border-white pt-1.5">
                  <span className="font-bold">You receive</span>
                  <b className="text-brand-orange">
                    AED {Math.round(Number(form.price) * 0.85 * 100) / 100}
                  </b>
                </div>
              </div>
            )}
            <button
              onClick={() => setShowFeeInfo(false)}
              className="w-full rounded-lg bg-brand-orange py-2.5 text-sm font-bold text-white"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
