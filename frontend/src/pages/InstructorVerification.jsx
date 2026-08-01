import { useMemo, useRef, useState } from "react";
import api from "../api/axios";
import { toList } from "../api/normalize";

/* small inline icons */
const Check = ({ cls = "" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    className={cls}
    aria-hidden="true"
  >
    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Dot = ({ cls = "" }) => (
  <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
    <circle cx="12" cy="12" r="6" fill="currentColor" />
  </svg>
);
const X = ({ cls = "" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    className={cls}
    aria-hidden="true"
  >
    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
  </svg>
);

const SOCIAL_FIELDS = [
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["youtube", "YouTube"],
  ["facebook", "Facebook"],
  ["website", "Website"],
];

/**
 * profile    — the `profile` object from GET /api/instructors/me (with documents)
 * categories — list from GET /api/categories
 * onRefetch  — refetch the profile (passed from parent)
 */
export default function InstructorVerification({
  profile,
  categories = [],
  onRefetch,
}) {
  const status = profile?.verificationStatus || "incomplete";
  const editable = status !== "pending"; // locked while pending
  const docs = profile?.documents || {};

  const [f, setF] = useState(() => ({
    headline: profile?.headline || "",
    bio: profile?.bio || "",
    experienceYears: profile?.experienceYears || 0,
    categories: toList(profile?.categories).map((c) => c?._id || c),
    suggestedCategory: profile?.suggestedCategory || "",
    languages: toList(profile?.languages),
    area: profile?.location?.area || "",
    city: profile?.location?.city || "Dubai",
    address: profile?.location?.address || "",
    inUAE: !!profile?.inUAE,
    socialLinks: {
      instagram: "",
      tiktok: "",
      youtube: "",
      facebook: "",
      website: "",
      ...(profile?.socialLinks || {}),
    },
    introVideoUrl: profile?.introVideoUrl || "",
    agreedVenuePolicy: !!profile?.agreedVenuePolicy,
  }));

  const [langInput, setLangInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null); // "emiratesId" | ...
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [missing, setMissing] = useState([]);

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const setSocial = (k, v) =>
    setF((s) => ({ ...s, socialLinks: { ...s.socialLinks, [k]: v } }));

  const hasSocial = useMemo(
    () => Object.values(f.socialLinks).some((v) => v && String(v).trim()),
    [f.socialLinks],
  );

  const toggleCategory = (id) =>
    setF((s) => ({
      ...s,
      categories: s.categories.includes(id)
        ? s.categories.filter((x) => x !== id)
        : [...s.categories, id],
    }));

  const addLang = () => {
    const v = langInput.trim();
    if (!v) return;
    if (!f.languages.includes(v)) set("languages", [...f.languages, v]);
    setLangInput("");
  };

  /* --- live checklist (mirrors the backend submit-check, for guidance) --- */
  const checklist = useMemo(() => {
    const list = [
      { ok: f.bio.trim().length >= 50, label: "Bio (at least 50 characters)" },
      {
        ok: f.categories.length > 0 || !!f.suggestedCategory.trim(),
        label: "At least one category (or an 'Other' suggestion)",
      },
      { ok: f.languages.length > 0, label: "At least one language" },
      { ok: !!docs.emiratesId?.publicId, label: "Emirates ID uploaded" },
      {
        ok: (docs.certificates?.length || 0) > 0,
        label: "At least one certificate",
      },
    ];
    if (f.inUAE)
      list.push({
        ok: !!docs.tradeLicence?.publicId,
        label: "Trade licence (UAE-based)",
      });
    if (!hasSocial)
      list.push({
        ok: !!f.introVideoUrl.trim(),
        label: "Intro video link (no social handle)",
      });
    list.push({
      ok: f.agreedVenuePolicy,
      label: "Agreed to venue & safety policy",
    });
    return list;
  }, [f, docs, hasSocial]);

  const allOk = checklist.every((c) => c.ok);

  const flash = (m, isErr = false) => {
    if (isErr) setErr(m);
    else setMsg(m);
    setTimeout(() => (isErr ? setErr("") : setMsg("")), 2500);
  };

  async function saveProfile() {
    setSaving(true);
    setErr("");
    try {
      const payload = {
        headline: f.headline,
        bio: f.bio,
        experienceYears: Number(f.experienceYears) || 0,
        categories: f.categories,
        suggestedCategory: f.suggestedCategory.trim(),
        languages: f.languages,
        location: { area: f.area, city: f.city, address: f.address },
        inUAE: f.inUAE,
        socialLinks: f.socialLinks,
        introVideoUrl: f.introVideoUrl,
        agreedVenuePolicy: f.agreedVenuePolicy,
      };
      await api.put("/instructors/me", payload);
      await onRefetch?.();
      flash("Profile saved");
      return true;
    } catch (e) {
      flash(e?.response?.data?.message || "Could not save", true);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function uploadDoc(type, file) {
    if (!file) return;
    setUploading(type);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type); // emiratesId | tradeLicence | certificate
      await api.post("/uploads/documents", fd);
      await onRefetch?.();
      flash("Document uploaded");
    } catch (e) {
      flash(e?.response?.data?.message || "Upload failed", true);
    } finally {
      setUploading(null);
    }
  }

  async function uploadAvatar(file) {
    if (!file) return;
    setUploading("avatar");
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api.post("/uploads/avatar", fd);
      await onRefetch?.();
      flash("Photo updated");
    } catch (e) {
      flash(e?.response?.data?.message || "Upload failed", true);
    } finally {
      setUploading(null);
    }
  }

  async function submitForApproval() {
    setSubmitting(true);
    setMissing([]);
    setErr("");
    // save the current form first so the server has the latest data
    const saved = await saveProfile();
    if (!saved) {
      setSubmitting(false);
      return;
    }
    try {
      await api.post("/instructors/me/submit");
      await onRefetch?.();
      flash("Submitted for verification!");
    } catch (e) {
      const m = e?.response?.data?.missing;
      if (Array.isArray(m)) setMissing(m);
      flash(e?.response?.data?.message || "Could not submit", true);
    } finally {
      setSubmitting(false);
    }
  }

  /* ------------------------------- status banner ------------------------------- */
  const banner = {
    incomplete: {
      cls: "bg-amber-50 border-amber-200 text-amber-900",
      title: "Your profile hasn't been submitted for review yet",
      body: "Complete the required items below, then press 'Submit for approval'. You can publish classes only after you're approved.",
    },
    pending: {
      cls: "bg-sky-50 border-sky-200 text-sky-900",
      title: "Under review",
      body: "Your profile is with the Kidventures team for review. Editing is locked while it's being reviewed.",
    },
    approved: {
      cls: "bg-green-50 border-green-200 text-green-900",
      title: "Verified — you can publish classes",
      body: "Your profile is approved. You can update your details here anytime.",
    },
    rejected: {
      cls: "bg-red-50 border-red-200 text-red-800",
      title: "Profile sent back",
      body: profile?.rejectionReason
        ? `Reason: ${profile.rejectionReason}`
        : "Please fix a few things and submit again.",
    },
  }[status];

  const inputCls =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-brand-brown outline-none focus:border-brand-orange disabled:opacity-60";
  const labelCls = "mb-1 block text-xs font-semibold text-brand-brown/80";

  return (
    <div className="space-y-5">
      {/* toast */}
      {(msg || err) && (
        <div
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-medium text-white shadow-lg ${
            err ? "bg-red-600" : "bg-brand-brown"
          }`}
        >
          {err || msg}
        </div>
      )}

      {/* status banner */}
      <div className={`rounded-2xl border p-4 ${banner.cls}`}>
        <div className="text-sm font-bold">{banner.title}</div>
        <div className="mt-1 text-xs opacity-90">{banner.body}</div>
      </div>

      {/* server missing list */}
      {missing.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="mb-1 font-bold">
            Please complete these before submitting:
          </div>
          <ul className="list-inside list-disc space-y-0.5 text-xs">
            {missing.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* ---------------- LEFT: form ---------------- */}
        <div className="space-y-5 lg:col-span-2">
          {/* Basic */}
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold">Profile details</h3>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Headline</label>
                <input
                  className={inputCls}
                  disabled={!editable}
                  value={f.headline}
                  onChange={(e) => set("headline", e.target.value)}
                  placeholder="e.g. Pottery & ceramics teacher for kids"
                />
              </div>

              <div>
                <label className={labelCls}>
                  Bio{" "}
                  <span className="opacity-60">
                    ({f.bio.trim().length}/50 min)
                  </span>
                </label>
                <textarea
                  className={`${inputCls} min-h-[96px] resize-y`}
                  disabled={!editable}
                  value={f.bio}
                  onChange={(e) => set("bio", e.target.value)}
                  placeholder="Tell parents about your experience and your classes…"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Years of experience</label>
                  <input
                    type="number"
                    min="0"
                    className={inputCls}
                    disabled={!editable}
                    value={f.experienceYears}
                    onChange={(e) => set("experienceYears", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Area</label>
                  <input
                    className={inputCls}
                    disabled={!editable}
                    value={f.area}
                    onChange={(e) => set("area", e.target.value)}
                    placeholder="e.g. Jumeirah"
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Address (optional)</label>
                <input
                  className={inputCls}
                  disabled={!editable}
                  value={f.address}
                  onChange={(e) => set("address", e.target.value)}
                />
              </div>

              {/* categories */}
              <div>
                <label className={labelCls}>Categories</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => {
                    const id = c._id || c.id;
                    const on = f.categories.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        disabled={!editable}
                        onClick={() => toggleCategory(id)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          on
                            ? "border-brand-orange bg-brand-orange text-white"
                            : "border-gray-200 bg-white text-brand-brown hover:border-brand-orange"
                        }`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                  {categories.length === 0 && (
                    <span className="text-xs opacity-50">
                      No categories loaded.
                    </span>
                  )}

                  {/* Other — jab skill list mein na ho */}
                  <button
                    type="button"
                    disabled={!editable}
                    onClick={() =>
                      set("suggestedCategory", f.suggestedCategory ? "" : " ")
                    }
                    className={`rounded-full border border-dashed px-3 py-1.5 text-xs font-semibold transition ${
                      f.suggestedCategory
                        ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                        : "border-gray-300 bg-white text-brand-brown hover:border-brand-orange"
                    }`}
                  >
                    + Other
                  </button>
                </div>

                {/* Other ka text box — sirf tab jab Other chuna ho */}
                {f.suggestedCategory !== "" && (
                  <div className="mt-2">
                    <input
                      className={inputCls}
                      disabled={!editable}
                      value={f.suggestedCategory}
                      autoFocus
                      onChange={(e) => set("suggestedCategory", e.target.value)}
                      placeholder="Your category — e.g. Calligraphy, Magic, Fencing"
                    />
                    <p className="mt-1 text-xs opacity-70">
                      Not in the list? Type it here — our team will review and
                      add it. Your class stays pending under this category until
                      it's approved.
                    </p>
                  </div>
                )}
              </div>

              {/* languages */}
              <div>
                <label className={labelCls}>Languages</label>
                <div className="mb-2 flex flex-wrap gap-2">
                  {f.languages.map((l) => (
                    <span
                      key={l}
                      className="inline-flex items-center gap-1 rounded-full bg-brand-cream px-3 py-1 text-xs font-semibold"
                    >
                      {l}
                      {editable && (
                        <button
                          type="button"
                          onClick={() =>
                            set(
                              "languages",
                              f.languages.filter((x) => x !== l),
                            )
                          }
                          className="opacity-60 hover:opacity-100"
                        >
                          <X cls="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                {editable && (
                  <div className="flex gap-2">
                    <input
                      className={inputCls}
                      value={langInput}
                      onChange={(e) => setLangInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && (e.preventDefault(), addLang())
                      }
                      placeholder="e.g. English — type and press Enter"
                    />
                    <button
                      type="button"
                      onClick={addLang}
                      className="rounded-lg bg-brand-brown px-4 text-sm font-semibold text-white"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* UAE + social + video */}
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold">
              Verification requirements
            </h3>

            {/* UAE toggle */}
            <div className="mb-4">
              <label className={labelCls}>Are you based in the UAE?</label>
              <div className="flex gap-2">
                {[
                  ["Yes", true],
                  ["No", false],
                ].map(([lbl, val]) => (
                  <button
                    key={lbl}
                    type="button"
                    disabled={!editable}
                    onClick={() => set("inUAE", val)}
                    className={`rounded-lg border px-5 py-2 text-sm font-semibold ${
                      f.inUAE === val
                        ? "border-brand-orange bg-brand-orange text-white"
                        : "border-gray-200 bg-white text-brand-brown"
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
              {f.inUAE && (
                <p className="mt-1.5 text-xs text-amber-700">
                  UAE-based instructors must upload a <b>trade licence</b>{" "}
                  (below).
                </p>
              )}
            </div>

            {/* social handles */}
            <div className="mb-4">
              <label className={labelCls}>
                Social media handles (at least one)
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SOCIAL_FIELDS.map(([k, lbl]) => (
                  <input
                    key={k}
                    className={inputCls}
                    disabled={!editable}
                    value={f.socialLinks[k] || ""}
                    onChange={(e) => setSocial(k, e.target.value)}
                    placeholder={lbl}
                  />
                ))}
              </div>
            </div>

            {/* intro video — required only when there's no social handle */}
            <div>
              <label className={labelCls}>
                Intro video link{" "}
                {hasSocial ? "(optional)" : "(required — no social handle)"}
              </label>
              <input
                className={inputCls}
                disabled={!editable}
                value={f.introVideoUrl}
                onChange={(e) => set("introVideoUrl", e.target.value)}
                placeholder="YouTube / Vimeo link — introduce yourself and show your work"
              />
              {!hasSocial && (
                <p className="mt-1.5 text-xs opacity-70">
                  If you don't have any social media, a short intro video (you +
                  your work) link is required.
                </p>
              )}
            </div>
          </section>

          {/* documents */}
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="mb-1 text-sm font-bold">Documents</h3>
            <p className="mb-4 text-xs opacity-60">
              These stay private — only an admin views them for verification.
            </p>
            <div className="space-y-3">
              <DocRow
                label="Emirates ID"
                required
                done={!!docs.emiratesId?.publicId}
                busy={uploading === "emiratesId"}
                disabled={!editable}
                onFile={(file) => uploadDoc("emiratesId", file)}
              />
              {f.inUAE && (
                <DocRow
                  label="Trade licence"
                  required
                  done={!!docs.tradeLicence?.publicId}
                  busy={uploading === "tradeLicence"}
                  disabled={!editable}
                  onFile={(file) => uploadDoc("tradeLicence", file)}
                />
              )}
              <DocRow
                label={`Certificates (${docs.certificates?.length || 0}/5)`}
                required
                done={(docs.certificates?.length || 0) > 0}
                busy={uploading === "certificate"}
                disabled={!editable || (docs.certificates?.length || 0) >= 5}
                onFile={(file) => uploadDoc("certificate", file)}
              />
            </div>
          </section>

          {/* venue policy */}
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                disabled={!editable}
                checked={f.agreedVenuePolicy}
                onChange={(e) => set("agreedVenuePolicy", e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-brand-orange"
              />
              <span className="text-xs leading-6 text-brand-brown/85">
                I confirm my classes will take place in a safe, supervised,
                child-appropriate venue, and I agree to the Kidventures venue
                &amp; safety policy.
              </span>
            </label>
          </section>

          {/* actions */}
          {editable && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={saveProfile}
                disabled={saving}
                className="rounded-xl border-2 border-brand-orange bg-white px-5 py-2.5 text-sm font-bold text-brand-orange disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              {status !== "approved" && (
                <button
                  type="button"
                  onClick={submitForApproval}
                  disabled={submitting || !allOk}
                  className="rounded-xl bg-brand-orange px-6 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  title={allOk ? "" : "Complete all required items first"}
                >
                  {submitting ? "Submitting…" : "Submit for approval"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ---------------- RIGHT: checklist ---------------- */}
        <aside className="h-fit rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:sticky lg:top-4">
          <h3 className="mb-3 text-sm font-bold">Verification checklist</h3>
          <ul className="space-y-2.5">
            {checklist.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                    c.ok
                      ? "bg-green-100 text-green-600"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {c.ok ? <Check cls="h-3 w-3" /> : <Dot cls="h-2 w-2" />}
                </span>
                <span
                  className={
                    c.ok
                      ? "text-brand-brown/60 line-through"
                      : "text-brand-brown"
                  }
                >
                  {c.label}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-lg bg-brand-cream p-3 text-xs leading-5 opacity-80">
            {status === "approved"
              ? "You're verified — keep your details up to date."
              : allOk
                ? "All set — you can submit now."
                : "Complete the remaining items, then submit."}
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------ document row ------------------------------ */
function DocRow({ label, required, done, busy, disabled, onFile }) {
  const ref = useRef(null);
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2.5">
      <div className="text-xs font-semibold">
        {label} {required && <span className="text-red-500">*</span>}
        {done && <span className="ml-2 text-green-600">✓ uploaded</span>}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          onFile(file);
        }}
      />
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => ref.current?.click()}
        className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-brown hover:border-brand-orange disabled:opacity-50"
      >
        {busy ? "Uploading…" : done ? "Replace" : "Upload"}
      </button>
    </div>
  );
}
