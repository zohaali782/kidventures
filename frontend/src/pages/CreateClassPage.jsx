import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
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

/* "HH:MM" + minutes -> "HH:MM" (session endTime nikaalne ke liye) */
function addMinutes(time, mins) {
  const [h, m] = String(time).split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return time;
  const total = h * 60 + m + (Number(mins) || 0);
  const hh = String(Math.floor((total % 1440) / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

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

export default function CreateClassPage() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    title: "",
    category: "", // category _id  OR  OTHER
    suggestedCategory: "",
    description: "",
    ageMin: "",
    ageMax: "",
    durationMinutes: "",
    format: "in-person", // "in-person" | "online"
    area: "",
    address: "",
    languages: "English",
    price: "",
    capacity: "",
    materialsIncluded: false,
    whatToBring: "",
  });
  const [learnList, setLearnList] = useState([""]);
  const [faqList, setFaqList] = useState([{ question: "", answer: "" }]);
  const [sessions, setSessions] = useState([{ date: "", startTime: "" }]);

  /* images: [{ file, previewUrl, status: "pending"|"uploading"|"done"|"error" }] */
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadStage, setUploadStage] = useState(""); // status text under the button
  const [apiErr, setApiErr] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isOther = form.category === OTHER;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/categories");
        if (alive) setCategories(toList(data.categories || data));
      } catch {
        /* categories load fail -> Other se kaam chalega */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // preview URLs ko cleanup karo jab component unmount ho ya image list badle
  useEffect(() => {
    return () => {
      images.forEach((img) => {
        if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* learning points */
  const setLearn = (i, v) =>
    setLearnList((l) => l.map((x, idx) => (idx === i ? v : x)));
  const addLearn = () => setLearnList((l) => [...l, ""]);
  const removeLearn = (i) =>
    setLearnList((l) => l.filter((_, idx) => idx !== i));

  /* FAQs */
  const setFaqQuestion = (i, v) =>
    setFaqList((l) => l.map((f, idx) => (idx === i ? { ...f, question: v } : f)));
  const setFaqAnswer = (i, v) =>
    setFaqList((l) => l.map((f, idx) => (idx === i ? { ...f, answer: v } : f)));
  const addFaq = () =>
    setFaqList((l) => [...l, { question: "", answer: "" }]);
  const removeFaq = (i) =>
    setFaqList((l) => l.filter((_, idx) => idx !== i));

  /* sessions */
  const setSession = (i, k, v) =>
    setSessions((s) =>
      s.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)),
    );
  const addSession = () =>
    setSessions((s) => [...s, { date: "", startTime: "" }]);
  const removeSession = (i) =>
    setSessions((s) => s.filter((_, idx) => idx !== i));

  /* images — real files now, with local previews */
  const pickImages = (fileList) => {
    const incoming = Array.from(fileList).slice(
      0,
      Math.max(0, MAX_IMAGES - images.length),
    );
    const mapped = incoming.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      status: "pending",
    }));
    setImages((im) => [...im, ...mapped]);
  };
  const removeImage = (i) => {
    setImages((im) => {
      const target = im[i];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return im.filter((_, idx) => idx !== i);
    });
  };

  /**
   * Parent pays exactly the price the instructor sets — no extra fee on
   * top. Kidventures keeps a 15% commission out of that price, so the
   * instructor receives 85%.
   */
  const priceHint = useMemo(() => {
    const p = Number(form.price);
    if (!p) return "";
    const youReceive = Math.round(p * 0.85 * 100) / 100;
    return `Parents pay exactly AED ${p} · you receive AED ${youReceive} after Kidventures' 15% commission`;
  }, [form.price]);

  // Price fee-explainer popup: shows automatically the first time the
  // instructor focuses the price field, so they price with the 15%
  // cut in mind. Reachable again anytime via the small "i" icon.
  const [showFeeInfo, setShowFeeInfo] = useState(false);
  const [feeInfoShownOnce, setFeeInfoShownOnce] = useState(false);

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
    const validSessions = sessions.filter((s) => s.date && s.startTime);
    if (validSessions.length === 0)
      e.sessions = "Add at least one date and time";
    return e;
  };

  /* upload one image, mark its status as we go */
  const uploadOneImage = async (activityId, index) => {
    setImages((im) =>
      im.map((row, i) => (i === index ? { ...row, status: "uploading" } : row)),
    );
    try {
      const fd = new FormData();
      fd.append("file", images[index].file);
      await api.post(`/uploads/activities/${activityId}/image`, fd);
      setImages((im) =>
        im.map((row, i) => (i === index ? { ...row, status: "done" } : row)),
      );
      return true;
    } catch {
      setImages((im) =>
        im.map((row, i) => (i === index ? { ...row, status: "error" } : row)),
      );
      return false;
    }
  };

  const handleSubmit = async (status = "pending") => {
    const e = validate();
    setErrors(e);
    setApiErr("");
    if (Object.keys(e).length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const dur = Number(form.durationMinutes);
    const cap = Number(form.capacity);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      whatChildrenLearn: learnList.map((x) => x.trim()).filter(Boolean),
      faqs: faqList
        .map((f) => ({ question: f.question.trim(), answer: f.answer.trim() }))
        .filter((f) => f.question && f.answer),
      ageMin: Number(form.ageMin),
      ageMax: Number(form.ageMax),
      price: Number(form.price),
      durationMinutes: dur,
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
      capacity: cap,
      materialsIncluded: form.materialsIncluded,
      whatToBring: form.whatToBring.trim(),
      status, // "pending" = submit for approval, "draft" = save for later
      sessions: sessions
        .filter((s) => s.date && s.startTime)
        .map((s) => ({
          date: s.date,
          startTime: s.startTime,
          endTime: addMinutes(s.startTime, dur),
          capacity: cap,
        })),
    };
    // category: official _id  OR  "Other" free text
    if (isOther) payload.suggestedCategory = form.suggestedCategory.trim();
    else payload.category = form.category;

    setSubmitting(true);
    setUploadStage(status === "draft" ? "Saving…" : "Publishing…");
    try {
      // 1) class create karo
      const { data } = await api.post("/activities", payload);
      const activityId =
        data.activity?._id || data.activity?.id || data._id || data.id;

      // 2) images upload karo (agar koi select ki gayi hain)
      if (activityId && images.length > 0) {
        setUploadStage(`Uploading photos (0/${images.length})…`);
        let uploaded = 0;
        let failed = 0;
        for (let i = 0; i < images.length; i++) {
          const ok = await uploadOneImage(activityId, i);
          if (ok) uploaded++;
          else failed++;
          setUploadStage(`Uploading photos (${uploaded}/${images.length})…`);
        }
        if (failed > 0) {
          setApiErr(
            `Class saved, but ${failed} photo(s) failed to upload. You can add them later from My Classes.`,
          );
        }
      }

      navigate("/instructor/my-classes");
    } catch (err) {
      setApiErr(
        err?.response?.data?.message ||
          "Couldn't publish the class. Please try again.",
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
      setUploadStage("");
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5F2] text-brand-brown">
      <Helmet>
        <title>Create New Class — Kidventures</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* top bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-8">
        <div className="flex items-center gap-4">
          <Link
            to="/instructor/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-semibold hover:opacity-80"
          >
            <IcBack size={18} /> Back
          </Link>
          <h1 className="text-base font-bold sm:text-lg">Create New Class</h1>
        </div>
        <div className="flex items-center gap-3">
          {uploadStage && (
            <span className="hidden text-xs opacity-70 sm:inline">
              {uploadStage}
            </span>
          )}
          <button
            onClick={() => handleSubmit("pending")}
            disabled={submitting}
            className="rounded-lg bg-brand-orange px-5 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Publishing…" : "Publish Class"}
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
                placeholder="e.g. Pottery for Beginners"
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
                <div className="mt-2">
                  <input
                    className={inputCls}
                    value={form.suggestedCategory}
                    onChange={(e) => set("suggestedCategory", e.target.value)}
                    placeholder="Your category — e.g. Calligraphy, Fencing, Magic"
                    autoFocus
                  />
                  <p className="mt-1 text-xs opacity-70">
                    Not in the list? Type it here — our team will review and add
                    it. Your class stays pending under this category until it's
                    approved.
                  </p>
                </div>
              )}
            </Field>

            <Field label="Description" error={errors.description}>
              <textarea
                className={`${inputCls} min-h-[110px] resize-y`}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Describe what happens in the class, what makes it fun, and what parents can expect…"
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
                min="0"
                max="18"
                className={inputCls}
                value={form.ageMin}
                onChange={(e) => set("ageMin", e.target.value)}
                placeholder="6"
              />
            </Field>
            <Field label="Maximum age">
              <input
                type="number"
                min="0"
                max="18"
                className={inputCls}
                value={form.ageMax}
                onChange={(e) => set("ageMax", e.target.value)}
                placeholder="10"
              />
            </Field>
            <Field label="Duration (minutes)" error={errors.duration}>
              <input
                type="number"
                min="15"
                className={inputCls}
                value={form.durationMinutes}
                onChange={(e) => set("durationMinutes", e.target.value)}
                placeholder="90"
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
            <Field
              label={
                form.format === "online"
                  ? "Area (optional for online)"
                  : "Venue area"
              }
              error={errors.area}
            >
              <input
                className={inputCls}
                value={form.area}
                onChange={(e) => set("area", e.target.value)}
                placeholder="e.g. Mirdif"
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
                placeholder="Building / street"
              />
            </Field>
            <Field label="Languages (comma separated)" className="col-span-2">
              <input
                className={inputCls}
                value={form.languages}
                onChange={(e) => set("languages", e.target.value)}
                placeholder="English, Arabic"
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
                  aria-label="How the platform commission works"
                >
                  i
                </button>
              </div>
              <input
                type="number"
                min="0"
                className={inputCls}
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                onFocus={() => {
                  if (!feeInfoShownOnce) {
                    setShowFeeInfo(true);
                    setFeeInfoShownOnce(true);
                  }
                }}
                placeholder="120"
              />
              {errors.price && (
                <div className="mt-1 text-xs text-red-600">{errors.price}</div>
              )}
            </div>
            <Field label="Capacity (max children)" error={errors.capacity}>
              <input
                type="number"
                min="1"
                className={inputCls}
                value={form.capacity}
                onChange={(e) => set("capacity", e.target.value)}
                placeholder="10"
              />
            </Field>
          </div>
          {priceHint && (
            <p className="mt-2 text-xs text-brand-orange">{priceHint}</p>
          )}
        </Section>

        {/* 4. schedule */}
        <Section
          title="Schedule"
          subtitle="Add one or more dates. End time is set automatically from the duration."
        >
          {errors.sessions && (
            <div className="mb-2 text-xs text-red-600">{errors.sessions}</div>
          )}
          <div className="space-y-3">
            {sessions.map((s, i) => (
              <div key={i} className="flex items-end gap-3">
                <Field label="Date" className="flex-1">
                  <input
                    type="date"
                    className={inputCls}
                    value={s.date}
                    onChange={(e) => setSession(i, "date", e.target.value)}
                  />
                </Field>
                <Field label="Start time" className="flex-1">
                  <input
                    type="time"
                    className={inputCls}
                    value={s.startTime}
                    onChange={(e) => setSession(i, "startTime", e.target.value)}
                  />
                </Field>
                {sessions.length > 1 && (
                  <button
                    onClick={() => removeSession(i)}
                    className="mb-0.5 flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white hover:border-red-300"
                  >
                    <IcX size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addSession}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-brand-orange px-3.5 py-2 text-xs font-semibold text-brand-orange"
          >
            <IcPlus size={15} /> Add another date
          </button>
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

        {/* 5b. FAQs */}
        <Section
          title="Frequently Asked Questions"
          subtitle="Answer the questions parents ask most (optional)"
        >
          <div className="space-y-3">
            {faqList.map((item, i) => (
              <div
                key={i}
                className="flex gap-2 rounded-lg border border-gray-100 p-3"
              >
                <div className="flex-1 space-y-2">
                  <input
                    className={inputCls}
                    value={item.question}
                    onChange={(e) => setFaqQuestion(i, e.target.value)}
                    placeholder={`Question ${i + 1}`}
                    maxLength={150}
                  />
                  <textarea
                    className={`${inputCls} min-h-[64px] resize-y`}
                    value={item.answer}
                    onChange={(e) => setFaqAnswer(i, e.target.value)}
                    placeholder="Answer"
                    maxLength={500}
                  />
                </div>
                {faqList.length > 1 && (
                  <button
                    onClick={() => removeFaq(i)}
                    className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white hover:border-red-300"
                  >
                    <IcX size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addFaq}
            disabled={faqList.length >= 20}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-brand-orange px-3.5 py-2 text-xs font-semibold text-brand-orange disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IcPlus size={15} /> Add question
          </button>
        </Section>

        {/* 6. materials */}
        <Section
          title="Materials & Requirements"
          subtitle="What's included or what to bring (optional)"
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
              placeholder="e.g. Wear clothes that can get messy."
            />
          </Field>
        </Section>

        {/* 7. images — now actually uploaded */}
        <Section
          title="Class Images"
          subtitle={`Photos parents will see (up to ${MAX_IMAGES})`}
        >
          <p className="mb-3 text-xs text-brand-orange">
            For best results, use a landscape (wide) photo — around 16:9 or 3:2
            ratio. Portrait photos will be cropped to fit the banner.
          </p>

          {images.length < MAX_IMAGES && (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-brand-orange bg-brand-cream p-6">
              <IcUpload size={24} />
              <span className="text-sm font-semibold">
                Click to upload images
              </span>
              <span className="text-xs opacity-60">
                JPG or PNG · first photo becomes the cover
              </span>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  pickImages(e.target.files);
                  e.target.value = ""; // same file dobara select ho sake
                }}
              />
            </label>
          )}

          {images.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {images.map((img, i) => (
                <div
                  key={i}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200"
                >
                  <img
                    src={img.previewUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  {i === 0 && (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-brand-orange px-2 py-0.5 text-[10px] font-bold text-white">
                      Cover
                    </span>
                  )}
                  {img.status === "uploading" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-semibold text-white">
                      Uploading…
                    </div>
                  )}
                  {img.status === "done" && (
                    <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white">
                      <IcCheck size={12} />
                    </div>
                  )}
                  {img.status === "error" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-500/70 text-[11px] font-semibold text-white">
                      Failed
                    </div>
                  )}
                  {img.status !== "uploading" && (
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                    >
                      <IcX size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs opacity-60">
            Photos upload automatically once you publish or save the class.
          </p>
        </Section>

        {/* bottom actions */}
        <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
          {uploadStage && (
            <span className="text-xs opacity-70 sm:hidden">{uploadStage}</span>
          )}
          <Link
            to="/instructor/dashboard"
            className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold"
          >
            Cancel
          </Link>
          <button
            onClick={() => handleSubmit("draft")}
            disabled={submitting}
            className="rounded-lg border-2 border-brand-orange bg-white px-5 py-2.5 text-sm font-bold text-brand-orange hover:bg-brand-cream disabled:opacity-60"
          >
            Save as draft
          </button>
          <button
            onClick={() => handleSubmit("pending")}
            disabled={submitting}
            className="rounded-lg bg-brand-orange px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Publishing…" : "Publish Class"}
          </button>
        </div>
      </div>

      {/* price / commission explainer popup */}
      {showFeeInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-5">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h3 className="mb-2 text-base font-bold">How pricing works</h3>
            <p className="mb-4 text-sm leading-relaxed opacity-75">
              Whatever price you set here is exactly what parents pay — no extra
              fees are added on top. Kidventures keeps a 15% commission out of
              that price, and the rest is yours. Price your class with that in
              mind.
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
