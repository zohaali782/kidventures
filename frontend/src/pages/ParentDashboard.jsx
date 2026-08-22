import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../api/axios";
import { toList } from "../api/normalize";
import { isLoggedIn, getStoredUser } from "../api/auth";
import { getFavorites } from "../api/favorites";

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
const IcChild = (p) => (
  <I {...p}>
    <circle cx="12" cy="7" r="4" />
    <path d="M5.5 21a6.5 6.5 0 0113 0" />
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
const IcHistory = (p) => (
  <I {...p}>
    <path d="M3 3v5h5" />
    <path d="M3.05 13A9 9 0 106 5.3L3 8" />
    <polyline points="12 7 12 12 15 15" />
  </I>
);
const IcHeart = (p) => (
  <I {...p}>
    <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" />
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
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
  </I>
);
const IcPin = (p) => (
  <I {...p}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </I>
);
const IcX = (p) => (
  <I {...p}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </I>
);
const IcAlert = (p) => (
  <I {...p}>
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </I>
);
const IcDoc = (p) => (
  <I {...p}>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </I>
);

const fmtDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt)
    ? ""
    : dt.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
};
const ageFromDob = (dob) => {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d)) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
};

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-orange";
const labelCls = "mb-1.5 block text-xs font-semibold text-brand-brown/80";

const STATUS_COLOR = {
  confirmed: "text-green-600",
  completed: "text-gray-500",
  pending: "text-amber-600",
  cancelled: "text-red-600",
  refunded: "text-red-600",
};

// Receipt sirf paid bookings ke liye available hai (backend ka bhi
// yehi rule hai) - unpaid/pending ka koi receipt nahi.
const PAID_STATUSES = ["paid", "partially_refunded", "refunded"];

export default function ParentDashboard() {
  const nav = useNavigate();
  const [tab, setTab] = useState("children");

  const [children, setChildren] = useState([]);
  const [childrenLoaded, setChildrenLoaded] = useState(false);
  const [upcoming, setUpcoming] = useState(null);
  const [past, setPast] = useState(null);
  const [saved, setSaved] = useState([]);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({
    name: "",
    dob: "",
    gender: "",
    allergies: "",
    medicalNotes: "",
    emergency: "",
  });
  const [formErr, setFormErr] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [receiptLoadingId, setReceiptLoadingId] = useState(null);

  const parentName = (getStoredUser()?.name || "there").split(" ")[0];
  const flash = (m) => {
    setToast(m);
    setTimeout(() => setToast(""), 2600);
  };

  /* ---- children (on mount) ---- */
  const loadChildren = useCallback(async () => {
    try {
      const { data } = await api.get("/children");
      setChildren(toList(data.children || data));
    } catch (e) {
      setErr("Couldn't load your children.");
    } finally {
      setChildrenLoaded(true);
    }
  }, []);

  useEffect(() => {
    // Token ab httpOnly cookie mein hai (JavaScript use parh nahi sakti),
    // is liye yahan sirf dekhte hain ke local user info maujood hai.
    // Asal check backend har API call par karta hai.
    if (!isLoggedIn()) {
      nav("/login");
      return;
    }
    loadChildren();
    setSaved(toList(getFavorites()));
  }, [loadChildren, nav]);

  /* ---- bookings (lazy per tab) ---- */
  useEffect(() => {
    if (tab === "upcoming" && upcoming === null) {
      api
        .get("/bookings/my", { params: { type: "upcoming" } })
        .then(({ data }) => setUpcoming(toList(data.bookings || data)))
        .catch(() => setUpcoming([]));
    }
    if (tab === "history" && past === null) {
      api
        .get("/bookings/my", { params: { type: "past" } })
        .then(({ data }) => setPast(toList(data.bookings || data)))
        .catch(() => setPast([]));
    }
  }, [tab, upcoming, past]);

  /* ---- receipt: authenticated PDF fetch, opens in a new tab ---- */
  const handleReceipt = async (bookingId, paymentStatus) => {
    if (!PAID_STATUSES.includes(String(paymentStatus))) {
      flash("A receipt is only available once payment is complete.");
      return;
    }
    setReceiptLoadingId(bookingId);
    try {
      const res = await api.get(`/bookings/${bookingId}/receipt`, {
        responseType: "blob",
      });
      const blobUrl = window.URL.createObjectURL(
        new Blob([res.data], { type: "application/pdf" }),
      );
      window.open(blobUrl, "_blank");
      // Naye tab ko load hone ka waqt de kar phir revoke karo, taake
      // memory leak na ho lekin PDF khulne se pehle URL na toote.
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 30000);
    } catch (err) {
      flash("Couldn't load the receipt. Please try again.");
    } finally {
      setReceiptLoadingId(null);
    }
  };

  /* ---- child add/edit ---- */
  const openAdd = () => {
    setEditing(null);
    setDraft({
      name: "",
      dob: "",
      gender: "",
      allergies: "",
      medicalNotes: "",
      emergency: "",
    });
    setFormErr({});
    setShowModal(true);
  };
  const openEdit = (c) => {
    setEditing(c._id);
    setDraft({
      name: c.name || "",
      dob: c.dateOfBirth
        ? new Date(c.dateOfBirth).toISOString().slice(0, 10)
        : "",
      gender: c.gender || "",
      allergies: c.allergies || "",
      medicalNotes: c.medicalNotes || "",
      emergency:
        typeof c.emergencyContact === "string"
          ? c.emergencyContact
          : c.emergencyContact?.phone || "",
    });
    setFormErr({});
    setShowModal(true);
  };

  const saveChild = async () => {
    const e = {};
    if (!draft.name.trim()) e.name = "Enter your child's name";
    if (!draft.dob) e.dob = "Enter date of birth";
    else {
      const age = ageFromDob(draft.dob);
      if (new Date(draft.dob) > new Date())
        e.dob = "Date can't be in the future";
      else if (age > 18) e.dob = "Kidventures is for children under 18";
    }
    if (!draft.emergency.trim()) e.emergency = "Emergency contact is required";
    setFormErr(e);
    if (Object.keys(e).length > 0) return;

    const payload = {
      name: draft.name.trim(),
      dateOfBirth: draft.dob,
      gender: draft.gender || undefined,
      allergies: draft.allergies.trim(),
      medicalNotes: draft.medicalNotes.trim(),
      // FIX: Child model ka emergencyContact ek OBJECT hai
      // ({name, relation, phone}), plain string nahi. Pehle yahan
      // seedha string bheji ja rahi thi jo "Cast to Object failed"
      // error deti thi.
      emergencyContact: { phone: draft.emergency.trim() },
    };

    setSaving(true);
    try {
      if (editing) await api.put(`/children/${editing}`, payload);
      else await api.post("/children", payload);
      await loadChildren();
      setShowModal(false);
      flash(editing ? "Child updated" : "Child added");
    } catch (err) {
      flash(err?.response?.data?.message || "Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async (id) => {
    try {
      await api.delete(`/children/${id}`);
      setChildren((cs) => cs.filter((c) => c._id !== id));
      flash("Child removed");
    } catch (err) {
      flash(err?.response?.data?.message || "Couldn't remove this child.");
    } finally {
      setConfirmDel(null);
    }
  };

  const tabs = [
    { key: "children", label: "My Children", icon: IcChild },
    { key: "upcoming", label: "Upcoming", icon: IcCal },
    { key: "history", label: "History", icon: IcHistory },
    { key: "saved", label: "Saved", icon: IcHeart },
  ];

  return (
    <div className="bg-white text-brand-brown">
      <Helmet>
        <title>My Account — Kidventures</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Navbar />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-brand-brown px-5 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <section className="bg-brand-cream px-5 py-7 sm:px-10">
        <h1 className="text-2xl font-bold">Hi {parentName}!</h1>
        <p className="text-sm opacity-70">
          Manage your children, bookings and saved classes.
        </p>
      </section>

      {/* tabs */}
      <section className="sticky top-0 z-[5] border-b border-gray-200 bg-white px-2 sm:px-10">
        <div className="flex gap-5 overflow-x-auto">
          {tabs.map((t) => {
            const on = tab === t.key;
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 py-4 text-sm ${on ? "border-brand-orange font-bold text-brand-orange" : "border-transparent font-medium hover:text-brand-orange"}`}
              >
                <Icon size={16} /> {t.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="min-h-[300px] px-5 py-8 pb-16 sm:px-10">
        {/* ===== CHILDREN ===== */}
        {tab === "children" && (
          <>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">My Children</h2>
              <button
                onClick={openAdd}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-bold text-white hover:opacity-90"
              >
                <IcPlus size={15} /> Add Child
              </button>
            </div>
            {!childrenLoaded ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="h-40 animate-pulse rounded-2xl bg-black/5"
                  />
                ))}
              </div>
            ) : children.length === 0 ? (
              <div className="py-10 text-center text-sm opacity-60">
                No children added yet. Add a child to book classes for them.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {children.map((c) => {
                  const age = c.age ?? ageFromDob(c.dateOfBirth);
                  const allergies =
                    c.allergies && c.allergies.trim() ? c.allergies : "None";
                  const emergency =
                    typeof c.emergencyContact === "string"
                      ? c.emergencyContact
                      : c.emergencyContact?.phone;
                  return (
                    <div
                      key={c._id}
                      className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-gold text-brand-brown">
                          <IcChild size={22} />
                        </div>
                        <div>
                          <div className="text-[15px] font-bold">{c.name}</div>
                          <div className="text-xs opacity-60">
                            {age != null ? `${age} years old` : ""}
                          </div>
                        </div>
                      </div>
                      <div className="mb-1.5 flex items-center gap-1.5 text-xs">
                        <span
                          className={
                            allergies !== "None"
                              ? "text-red-500"
                              : "text-green-600"
                          }
                        >
                          <IcAlert size={13} />
                        </span>
                        <span className="opacity-80">
                          Allergies: <b>{allergies}</b>
                        </span>
                      </div>
                      {emergency && (
                        <div className="mb-4 text-xs opacity-70">
                          Emergency: {emergency}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(c)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white py-2 text-xs font-semibold hover:border-brand-orange"
                        >
                          <IcEdit size={14} /> Edit
                        </button>
                        <button
                          onClick={() => setConfirmDel(c)}
                          className="flex w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-red-600 hover:border-red-300"
                        >
                          <IcTrash size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ===== UPCOMING ===== */}
        {tab === "upcoming" && (
          <BookingList
            title="Upcoming Bookings"
            list={upcoming}
            empty={
              <>
                No upcoming bookings.{" "}
                <Link to="/activities" className="font-bold text-brand-orange">
                  Browse classes
                </Link>
              </>
            }
            onReceipt={handleReceipt}
            receiptLoadingId={receiptLoadingId}
          />
        )}

        {/* ===== HISTORY ===== */}
        {tab === "history" && (
          <BookingList
            title="Booking History"
            list={past}
            past
            empty="No past bookings yet."
            onReceipt={handleReceipt}
            receiptLoadingId={receiptLoadingId}
          />
        )}

        {/* ===== SAVED ===== */}
        {tab === "saved" && (
          <>
            <h2 className="mb-5 text-lg font-bold">Saved Classes</h2>
            {saved.length === 0 ? (
              <div className="py-10 text-center text-sm opacity-60">
                No saved classes yet. Tap the heart on any class to save it.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {saved.map((a) => {
                  const id = a.id || a._id;
                  const img =
                    a.image ||
                    (Array.isArray(a.images) &&
                      (a.images[0]?.url || a.images[0]));
                  return (
                    <Link
                      key={id}
                      to={`/activity/${id}`}
                      className="block overflow-hidden rounded-2xl bg-white shadow-md"
                    >
                      <div className="h-28 bg-brand-cream">
                        {img ? (
                          <img
                            src={img}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="p-3">
                        <div className="text-sm font-bold">{a.title}</div>
                        {a.instructor && (
                          <div className="mb-1 text-xs opacity-70">
                            by{" "}
                            {typeof a.instructor === "string"
                              ? a.instructor
                              : a.instructor?.name}
                          </div>
                        )}
                        <div className="flex justify-between text-xs">
                          <span className="opacity-70">
                            {a.ageMin != null
                              ? `Ages ${a.ageMin}–${a.ageMax}`
                              : a.ageGroup
                                ? `Ages ${a.ageGroup}`
                                : ""}
                          </span>
                          {a.price != null && (
                            <span className="font-bold">AED {a.price}</span>
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

        {err && tab === "children" && (
          <div className="mt-4 text-sm text-red-600">{err}</div>
        )}
      </section>

      <Footer />

      {/* add/edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-5">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {editing ? "Edit child" : "Add a child"}
              </h3>
              <button onClick={() => setShowModal(false)}>
                <IcX size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Child's name</label>
                <input
                  className={inputCls}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. Maryam"
                />
                {formErr.name && (
                  <div className="mt-1 text-xs text-red-600">
                    {formErr.name}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Date of birth</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={draft.dob}
                    onChange={(e) =>
                      setDraft({ ...draft, dob: e.target.value })
                    }
                  />
                  {formErr.dob && (
                    <div className="mt-1 text-xs text-red-600">
                      {formErr.dob}
                    </div>
                  )}
                </div>
                <div>
                  <label className={labelCls}>Gender (optional)</label>
                  <select
                    className={inputCls}
                    value={draft.gender}
                    onChange={(e) =>
                      setDraft({ ...draft, gender: e.target.value })
                    }
                  >
                    <option value="">—</option>
                    <option value="male">Boy</option>
                    <option value="female">Girl</option>
                    <option value="other">Prefer not to say</option>
                  </select>
                </div>
              </div>
              {draft.dob &&
                ageFromDob(draft.dob) != null &&
                ageFromDob(draft.dob) >= 0 && (
                  <p className="-mt-2 text-xs opacity-60">
                    Age: {ageFromDob(draft.dob)} years
                  </p>
                )}
              <div>
                <label className={labelCls}>Allergies (optional)</label>
                <input
                  className={inputCls}
                  value={draft.allergies}
                  onChange={(e) =>
                    setDraft({ ...draft, allergies: e.target.value })
                  }
                  placeholder="e.g. Peanuts — or leave blank"
                />
              </div>
              <div>
                <label className={labelCls}>Medical notes (optional)</label>
                <input
                  className={inputCls}
                  value={draft.medicalNotes}
                  onChange={(e) =>
                    setDraft({ ...draft, medicalNotes: e.target.value })
                  }
                  placeholder="Anything an instructor should know"
                />
              </div>
              <div>
                <label className={labelCls}>Emergency contact</label>
                <input
                  className={inputCls}
                  value={draft.emergency}
                  onChange={(e) =>
                    setDraft({ ...draft, emergency: e.target.value })
                  }
                  placeholder="+971 ..."
                />
                {formErr.emergency && (
                  <div className="mt-1 text-xs text-red-600">
                    {formErr.emergency}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                onClick={saveChild}
                disabled={saving}
                className="rounded-lg bg-brand-orange px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : editing ? "Save changes" : "Add child"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* delete confirm */}
      {confirmDel && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-5">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h3 className="mb-2 text-lg font-bold">
              Remove {confirmDel.name}?
            </h3>
            <p className="mb-5 text-sm opacity-70">
              This child will be removed from your account. If they have
              upcoming bookings, cancel those first.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDel(null)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => doDelete(confirmDel._id)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ booking list ------------------------------ */
function BookingList({
  title,
  list,
  empty,
  past,
  onReceipt,
  receiptLoadingId,
}) {
  if (list === null) {
    return (
      <>
        <h2 className="mb-5 text-lg font-bold">{title}</h2>
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-black/5"
            />
          ))}
        </div>
      </>
    );
  }
  return (
    <>
      <h2 className="mb-5 text-lg font-bold">{title}</h2>
      {list.length === 0 ? (
        <div className="py-10 text-center text-sm opacity-60">{empty}</div>
      ) : (
        <div className="space-y-3.5">
          {list.map((b) => {
            const cls = b.activity || {};
            const kids = toList(b.children)
              .map((c) => c.name)
              .filter(Boolean)
              .join(", ");
            const img = cls.images && (cls.images[0]?.url || cls.images[0]);
            const status = String(b.status || "").toLowerCase();
            const isPaid = PAID_STATUSES.includes(String(b.paymentStatus));
            const isReceiptLoading = receiptLoadingId === b._id;
            return (
              <div
                key={b._id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-brand-cream">
                  {img ? (
                    <img
                      src={img}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-[200px] flex-1">
                  <div className="text-[15px] font-bold">
                    {cls.title || b.activityTitle}
                  </div>
                  <div className="mb-1 text-xs opacity-65">
                    {kids ? `For ${kids}` : ""}
                    {b.instructor?.name ? ` · by ${b.instructor.name}` : ""}
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs opacity-80">
                    <span className="inline-flex items-center gap-1">
                      <IcCal size={13} /> {fmtDate(b.sessionDate)}
                      {b.startTime ? ` · ${b.startTime}` : ""}
                    </span>
                    {cls.location?.area && (
                      <span className="inline-flex items-center gap-1">
                        <IcPin size={13} /> {cls.location.area}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[15px] font-bold">
                    AED {b.totalAmount}
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase ${STATUS_COLOR[status] || "text-gray-500"}`}
                  >
                    {b.status}
                  </span>
                </div>
                <button
                  onClick={() => isPaid && onReceipt(b._id, b.paymentStatus)}
                  disabled={!isPaid || isReceiptLoading}
                  title={
                    isPaid
                      ? "Download receipt"
                      : "Receipt available once payment is complete"
                  }
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold hover:border-brand-orange disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <IcDoc size={13} />
                  {isReceiptLoading ? "Loading…" : "Receipt"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
