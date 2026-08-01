import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../api/axios";
import { getStoredUser } from "../api/auth";
import { pickImg } from "../api/normalize";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

/**
 * Sibling discount - agar 2 ya zyada bachay hon to POORI booking ke
 * subtotal par ek hi baar flat yeh % discount (har additional bache
 * par alag se nahi). Yeh sirf ANDAZA (estimate) dikhane ke liye hai -
 * asli, final rakam hamesha server /api/bookings se milti hai (server
 * hi discount clamp karta hai agar zaroorat pare).
 */
const SIBLING_DISCOUNT_PERCENT = 10;

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
const IcCheck = (p) => (
  <I {...p}>
    <polyline points="20 6 9 17 4 12" />
  </I>
);
const IcChild = (p) => (
  <I {...p}>
    <circle cx="12" cy="7" r="4" />
    <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
  </I>
);
const IcClock = (p) => (
  <I {...p}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </I>
);
const IcLock = (p) => (
  <I {...p}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </I>
);
const IcAlert = (p) => (
  <I {...p}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </I>
);
const IcBack = (p) => (
  <I {...p}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </I>
);
const IcTag = (p) => (
  <I {...p}>
    <path d="M20.59 13.41L11 3.83A2 2 0 0 0 9.59 3.41L4 3a1 1 0 0 0-1 1l.41 5.59a2 2 0 0 0 .58 1.41l9.59 9.59a2 2 0 0 0 2.83 0l4.18-4.18a2 2 0 0 0 0-2.83z" />
    <circle cx="7.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
  </I>
);

/* ------------------------------- helpers ------------------------------- */
function fmtSessionDate(d) {
  const dt = new Date(d);
  return isNaN(dt)
    ? ""
    : dt.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}
function useCountdown(expiresAt) {
  const [msLeft, setMsLeft] = useState(() =>
    expiresAt ? new Date(expiresAt) - Date.now() : null,
  );
  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(
      () => setMsLeft(new Date(expiresAt) - Date.now()),
      1000,
    );
    return () => clearInterval(id);
  }, [expiresAt]);
  return msLeft;
}
function fmtCountdown(ms) {
  if (ms == null) return "";
  if (ms <= 0) return "Expired";
  const totalSec = Math.floor(ms / 1000);
  return `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, "0")}`;
}

/**
 * Sibling discount ka andaza - 2 ya zyada bachay hon to poori booking
 * ke subtotal par ek hi baar flat SIBLING_DISCOUNT_PERCENT off. Server
 * final, clamp-ed rakam khud calculate karta hai jab /api/bookings
 * call hoti hai. Jaan boojh kar koi rounding nahi ki - asli number
 * jaisa bane wohi dikhaya jata hai.
 */
function estimatePricing(pricePerChild, numberOfChildren) {
  const price = pricePerChild || 0;
  const count = numberOfChildren || 0;
  const subtotalBeforeDiscount = price * count;
  const hasDiscount = count > 1;
  const discountAmount = hasDiscount
    ? subtotalBeforeDiscount * (SIBLING_DISCOUNT_PERCENT / 100)
    : 0;
  const total = subtotalBeforeDiscount - discountAmount;
  return {
    subtotalBeforeDiscount,
    discountAmount,
    total,
    hasDiscount,
  };
}

/**
 * Refresh-persistence: agar parent Step 4 (payment) par reload kar de,
 * booking + clientSecret sessionStorage se wapas mil jate hain - dobara
 * seat reserve nahi karni parti. Har activity ke liye alag key.
 */
const draftKey = (activityId) => `kv_booking_draft_${activityId}`;
const saveDraft = (activityId, draft) => {
  try {
    sessionStorage.setItem(draftKey(activityId), JSON.stringify(draft));
  } catch {
    /* storage full/unavailable - not critical */
  }
};
const loadDraft = (activityId) => {
  try {
    const raw = sessionStorage.getItem(draftKey(activityId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const clearDraft = (activityId) => {
  try {
    sessionStorage.removeItem(draftKey(activityId));
  } catch {
    /* ignore */
  }
};

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 text-[13px]">
      <span className="opacity-65">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

/* --------------------------- Stripe payment form --------------------------- */
function PaymentForm({ booking, onConfirmed }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState("");

  const pollForConfirmation = async (bookingId) => {
    setConfirming(true);
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const { data } = await api.get(`/bookings/${bookingId}`);
        if (data.booking?.status === "confirmed") {
          onConfirmed(data.booking);
          return;
        }
        if (["cancelled", "refunded"].includes(data.booking?.status)) {
          setErr("This booking is no longer valid. Please book again.");
          setConfirming(false);
          return;
        }
      } catch {
        /* keep retrying */
      }
    }
    setConfirming(false);
    setErr(
      "Payment succeeded but confirmation is taking longer than usual — check My Bookings in a few minutes, you'll also get an email.",
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setErr("");
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    if (error) {
      setErr(error.message || "Payment failed. Please try again.");
      setSubmitting(false);
      return;
    }
    if (
      paymentIntent &&
      (paymentIntent.status === "succeeded" ||
        paymentIntent.status === "processing")
    ) {
      await pollForConfirmation(booking._id);
    } else {
      setErr("Payment did not complete. Please try again.");
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {err && (
        <div className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || submitting || confirming}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-sky py-3.5 text-sm font-bold text-white disabled:opacity-60"
      >
        <IcLock size={16} />
        {confirming
          ? "Confirming booking…"
          : submitting
            ? "Processing…"
            : `Pay AED ${booking.totalAmount}`}
      </button>
      <div className="mt-2.5 text-center text-[11px] opacity-55">
        Secure payment powered by Stripe
      </div>
    </form>
  );
}

/* --------------------------------- page --------------------------------- */
export default function BookingPage() {
  const { id } = useParams();
  const user = getStoredUser();

  const [activity, setActivity] = useState(null);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [children, setChildren] = useState([]);
  const [loadingChildren, setLoadingChildren] = useState(true);

  const [step, setStep] = useState(1); // 1 session, 2 child, 3 review, 4 pay, 5 done
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedChildIds, setSelectedChildIds] = useState([]);
  const [stepError, setStepError] = useState("");

  const [booking, setBooking] = useState(null);
  const [clientSecret, setClientSecret] = useState("");
  const [reserving, setReserving] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [restoredNotice, setRestoredNotice] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingActivity(true);
      try {
        const { data } = await api.get(`/activities/${id}`);
        const a = data.activity || data;
        if (!alive) return;
        if (!a || !(a._id || a.id)) {
          setNotFound(true);
        } else {
          setActivity(a);
        }
      } catch {
        if (alive) setNotFound(true);
      } finally {
        if (alive) setLoadingActivity(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (!user || user.role !== "parent") {
      setLoadingChildren(false);
      return;
    }
    let alive = true;
    (async () => {
      setLoadingChildren(true);
      try {
        const { data } = await api.get("/children");
        if (alive) setChildren(data.children || data || []);
      } catch {
        /* ignore */
      } finally {
        if (alive) setLoadingChildren(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload par ek reserved-but-unpaid draft restore karo (agar abhi valid hai)
  useEffect(() => {
    if (!id) return;
    const draft = loadDraft(id);
    if (!draft?.booking?.reservationExpiresAt) return;
    if (new Date(draft.booking.reservationExpiresAt) <= new Date()) {
      clearDraft(id);
      return;
    }
    setBooking(draft.booking);
    setClientSecret(draft.clientSecret);
    setSelectedSessionId(draft.selectedSessionId || "");
    setSelectedChildIds(draft.selectedChildIds || []);
    setStep(4);
    setRestoredNotice(true);
  }, [id]);

  const reservationMs = useCountdown(booking?.reservationExpiresAt);
  const reservationExpired =
    booking && reservationMs != null && reservationMs <= 0;

  // Reservation expire ho jaye to draft hata do - dobara book karna hoga
  useEffect(() => {
    if (reservationExpired && id) clearDraft(id);
  }, [reservationExpired, id]);

  /* ---------------- not logged in / not a parent ---------------- */
  if (!loadingActivity && (!user || user.role !== "parent")) {
    return (
      <div className="min-h-screen bg-[#F7F5F2] font-sans text-brand-brown">
        <Navbar />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <h2 className="mb-2 text-lg font-bold">
            {user
              ? "Only parent accounts can book classes"
              : "Please log in to book"}
          </h2>
          <p className="mb-5 text-sm opacity-70">
            {user
              ? "Instructor and admin accounts can't make bookings."
              : "Log in with a parent account to reserve a seat for your child."}
          </p>
          {!user && (
            <Link
              to="/login"
              className="inline-block rounded-lg bg-brand-orange px-6 py-2.5 text-sm font-bold text-white no-underline"
            >
              Log In
            </Link>
          )}
        </div>
        <Footer />
      </div>
    );
  }

  if (loadingActivity) {
    return (
      <div className="min-h-screen bg-[#F7F5F2] font-sans text-brand-brown">
        <Navbar />
        <div className="px-4 py-20 text-center opacity-60">Loading…</div>
        <Footer />
      </div>
    );
  }

  if (notFound || !activity) {
    return (
      <div className="min-h-screen bg-[#F7F5F2] font-sans text-brand-brown">
        <Navbar />
        <div className="px-4 py-20 text-center">
          <h2 className="mb-2 text-lg font-bold">Class not found</h2>
          <Link
            to="/activities"
            className="font-bold text-brand-orange no-underline"
          >
            Browse classes
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const a = activity;
  const activityId = a._id || a.id;
  const cover = pickImg(a.images?.[0]);
  const now = new Date();
  const sessions = (a.sessions || [])
    .filter((s) => s.status === "scheduled" && new Date(s.date) >= now)
    .sort((x, y) => new Date(x.date) - new Date(y.date));

  const selectedSession = sessions.find(
    (s) => (s._id || s.id) === selectedSessionId,
  );
  const selectedChildren = children.filter((c) =>
    selectedChildIds.includes(c._id || c.id),
  );

  const pricing = estimatePricing(a.price, selectedChildIds.length);
  const estimatedSubtotal = pricing.subtotalBeforeDiscount;
  const estimatedDiscount = pricing.discountAmount;
  const estimatedTotal = pricing.total;
  const hasSiblingDiscount = pricing.hasDiscount;

  const toggleChild = (cid) =>
    setSelectedChildIds((ids) =>
      ids.includes(cid) ? ids.filter((x) => x !== cid) : [...ids, cid],
    );

  const goNext = () => {
    setStepError("");
    if (step === 1) {
      if (!selectedSessionId) {
        setStepError("Please choose a date and time.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (selectedChildIds.length === 0) {
        setStepError("Please select at least one child attending.");
        return;
      }
      setStep(3);
    }
  };

  const handleReserve = async () => {
    setStepError("");
    setReserving(true);
    try {
      const { data } = await api.post("/bookings", {
        activityId,
        sessionId: selectedSessionId,
        childIds: selectedChildIds,
      });
      setBooking(data.booking);

      const pi = await api.post("/payments/create-intent", {
        bookingId: data.booking._id,
      });
      setClientSecret(pi.data.clientSecret);
      setStep(4);

      saveDraft(activityId, {
        booking: data.booking,
        clientSecret: pi.data.clientSecret,
        selectedSessionId,
        selectedChildIds,
      });
    } catch (err) {
      setStepError(
        err?.response?.data?.message ||
          "Couldn't reserve your seats. Please try again.",
      );
    } finally {
      setReserving(false);
    }
  };

  const handleConfirmed = (b) => {
    clearDraft(activityId);
    setConfirmedBooking(b);
    setStep(5);
  };

  const steps = ["Date & Time", "Child", "Review", "Payment"];

  return (
    <div className="min-h-screen bg-[#F7F5F2] font-sans text-brand-brown">
      <Helmet>
        <title>Book {a.title} — Kidventures</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Navbar />

      <div className="mx-auto max-w-[640px] px-4 py-6 pb-16 sm:px-5">
        {step < 5 && (
          <Link
            to={`/activity/${activityId}`}
            className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-brown no-underline"
          >
            <IcBack size={17} /> Back to class
          </Link>
        )}

        {restoredNotice && step === 4 && !reservationExpired && (
          <div className="mb-4 rounded-lg bg-brand-cream px-3.5 py-2.5 text-[13px]">
            Picking up where you left off — your seat is still held.
          </div>
        )}

        {/* step indicator */}
        {step < 5 && (
          <div className="mb-6 flex items-center gap-1.5">
            {steps.map((s, i) => {
              const n = i + 1;
              const active = step === n;
              const done = step > n;
              return (
                <div key={s} className="flex-1 text-center">
                  <div
                    className={`mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${
                      done
                        ? "bg-green-600"
                        : active
                          ? "bg-brand-orange"
                          : "bg-gray-300"
                    }`}
                  >
                    {done ? <IcCheck size={15} /> : n}
                  </div>
                  <div
                    className={`text-[11px] ${active ? "font-bold" : "font-medium"} ${
                      active || done ? "opacity-100" : "opacity-55"
                    }`}
                  >
                    {s}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* class summary banner */}
        {step < 5 && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-sm">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-brand-cream">
              {cover && (
                <img
                  src={cover}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{a.title}</div>
              <div className="text-xs opacity-65">
                by {a.instructor?.name || "Instructor"} · Ages {a.ageMin}-
                {a.ageMax}
              </div>
            </div>
            <div className="font-bold text-brand-orange">AED {a.price}</div>
          </div>
        )}

        {stepError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
            <IcAlert size={15} /> {stepError}
          </div>
        )}

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          {/* STEP 1 — session */}
          {step === 1 && (
            <>
              <h2 className="mb-4 text-base font-bold">Choose date & time</h2>
              {sessions.length === 0 ? (
                <div className="rounded-lg bg-brand-cream/60 px-4 py-6 text-center text-sm opacity-70">
                  No upcoming sessions scheduled for this class.
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {sessions.map((s) => {
                    const sid = s._id || s.id;
                    const seatsLeft =
                      s.seatsAvailable ??
                      Math.max((s.capacity || 0) - (s.seatsBooked || 0), 0);
                    const full = seatsLeft <= 0;
                    const chosen = selectedSessionId === sid;
                    return (
                      <button
                        key={sid}
                        type="button"
                        disabled={full}
                        onClick={() => setSelectedSessionId(sid)}
                        className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm ${
                          full
                            ? "cursor-not-allowed border-gray-100 bg-gray-50 opacity-50"
                            : chosen
                              ? "border-brand-orange bg-brand-cream"
                              : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <IcClock size={16} />
                          <span className="font-semibold">
                            {fmtSessionDate(s.date)} · {s.startTime}
                          </span>
                        </div>
                        <span
                          className={`text-xs font-bold ${
                            full
                              ? "text-red-600"
                              : seatsLeft <= 3
                                ? "text-brand-orange"
                                : "opacity-60"
                          }`}
                        >
                          {full ? "Full" : `${seatsLeft} seats left`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* STEP 2 — child */}
          {step === 2 && (
            <>
              <h2 className="mb-1 text-base font-bold">Who is attending?</h2>
              <p className="mb-4 text-xs opacity-60">
                You can select more than one child — booking 2 or more children
                gets 10% off the total.
              </p>
              {loadingChildren ? (
                <div className="py-6 text-center text-sm opacity-60">
                  Loading…
                </div>
              ) : children.length === 0 ? (
                <div className="rounded-lg bg-brand-cream/60 px-4 py-6 text-center text-sm opacity-70">
                  You haven't added any children yet.
                </div>
              ) : (
                <div className="mb-4 flex flex-col gap-2.5">
                  {children.map((c) => {
                    const cid = c._id || c.id;
                    const fits = c.age >= a.ageMin && c.age <= a.ageMax;
                    const chosen = selectedChildIds.includes(cid);
                    return (
                      <button
                        key={cid}
                        type="button"
                        disabled={!fits}
                        onClick={() => fits && toggleChild(cid)}
                        className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left ${
                          !fits
                            ? "cursor-not-allowed border-gray-100 opacity-55"
                            : chosen
                              ? "border-brand-orange bg-brand-cream"
                              : "border-gray-200 bg-white"
                        }`}
                      >
                        <div
                          className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border-2 ${
                            chosen
                              ? "border-brand-orange bg-brand-orange"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          {chosen && (
                            <IcCheck size={14} className="text-white" />
                          )}
                        </div>
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gold">
                          <IcChild size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold">{c.name}</div>
                          <div className="text-xs opacity-60">
                            {c.age} years old
                          </div>
                        </div>
                        {!fits && (
                          <span className="text-[11px] font-semibold text-red-600">
                            Not in range ({a.ageMin}-{a.ageMax})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedChildIds.length > 1 && (
                <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-brand-cream px-3 py-2 text-xs">
                  <IcTag size={14} />
                  {selectedChildIds.length} children selected — sibling discount
                  applied, total AED {estimatedTotal}
                </div>
              )}
              <Link
                to="/parent/dashboard"
                className="text-xs font-semibold text-brand-orange no-underline"
              >
                + Add a new child in your dashboard
              </Link>
            </>
          )}

          {/* STEP 3 — review */}
          {step === 3 && selectedSession && (
            <>
              <h2 className="mb-4 text-base font-bold">Review</h2>
              <div className="mb-5 flex flex-col gap-2.5">
                <Row label="Class" value={a.title} />
                <Row label="Instructor" value={a.instructor?.name} />
                <Row
                  label="Date"
                  value={fmtSessionDate(selectedSession.date)}
                />
                <Row label="Time" value={selectedSession.startTime} />
                <Row
                  label={selectedChildren.length > 1 ? "Children" : "Child"}
                  value={selectedChildren
                    .map((c) => `${c.name} (${c.age} yrs)`)
                    .join(", ")}
                />
              </div>
              {selectedChildren.length > 1 && (
                <div className="mb-1.5 flex justify-between text-xs opacity-70">
                  <span>
                    AED {a.price} × {selectedChildren.length} children
                  </span>
                  <span>AED {estimatedSubtotal}</span>
                </div>
              )}
              {hasSiblingDiscount && (
                <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-green-700">
                  <span className="flex items-center gap-1">
                    <IcTag size={13} /> Sibling discount (10% off total)
                  </span>
                  <span>-AED {estimatedDiscount}</span>
                </div>
              )}
              <div className="mb-5 flex items-center justify-between border-t border-gray-100 pt-3.5">
                <span className="font-bold">Total</span>
                <span className="text-xl font-bold text-brand-orange">
                  AED {estimatedTotal}
                </span>
              </div>
              <button
                onClick={handleReserve}
                disabled={reserving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-orange py-3.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {reserving ? "Reserving your seat…" : "Continue to payment"}
              </button>
              <p className="mt-2.5 text-center text-[11px] opacity-55">
                Your seat is held for 15 minutes once you continue.
              </p>
            </>
          )}

          {/* STEP 4 — payment */}
          {step === 4 && booking && clientSecret && (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold">Payment</h2>
                {!reservationExpired && (
                  <span className="rounded-full bg-brand-cream px-3 py-1 text-xs font-bold text-brand-orange">
                    Seat held: {fmtCountdown(reservationMs)}
                  </span>
                )}
              </div>
              {reservationExpired ? (
                <div className="rounded-lg bg-red-50 px-4 py-4 text-center text-sm text-red-700">
                  Your seat reservation expired. Please go back and book again.
                  <div className="mt-3">
                    <Link
                      to={`/activity/${activityId}`}
                      className="font-bold text-brand-orange no-underline"
                    >
                      Back to class
                    </Link>
                  </div>
                </div>
              ) : (
                <Elements
                  stripe={stripePromise}
                  options={{ clientSecret, appearance: { theme: "stripe" } }}
                >
                  <PaymentForm
                    booking={booking}
                    onConfirmed={handleConfirmed}
                  />
                </Elements>
              )}
            </>
          )}

          {/* STEP 5 — confirmation */}
          {step === 5 && (
            <div className="py-5 text-center">
              <div className="mx-auto mb-4 flex h-[70px] w-[70px] items-center justify-center rounded-full bg-green-100">
                <IcCheck size={36} className="text-green-600" />
              </div>
              <h2 className="mb-2 text-xl font-bold">Booking confirmed!</h2>
              <p className="mb-2 text-[13px] leading-relaxed opacity-70">
                {selectedChildren.map((c) => c.name).join(" & ")}{" "}
                {selectedChildren.length > 1 ? "are" : "is"} booked for{" "}
                <b>{a.title}</b>
                {selectedSession && (
                  <>
                    {" "}
                    on {fmtSessionDate(selectedSession.date)} at{" "}
                    {selectedSession.startTime}
                  </>
                )}
                .
              </p>
              <p className="mb-6 text-xs opacity-60">
                Booking reference: <b>{confirmedBooking?.bookingNumber}</b>. A
                confirmation email is on its way.
              </p>
              <div className="flex flex-wrap justify-center gap-2.5">
                <Link
                  to="/parent/dashboard"
                  className="rounded-lg bg-brand-orange px-5 py-3 text-[13px] font-bold text-white no-underline"
                >
                  View my bookings
                </Link>
                <Link
                  to="/activities"
                  className="rounded-lg border border-gray-200 bg-white px-5 py-3 text-[13px] font-bold no-underline"
                >
                  Browse more classes
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* nav buttons */}
        {step < 3 && (
          <div className="mt-4 flex gap-2.5">
            {step > 1 && (
              <button
                onClick={() => {
                  setStep(step - 1);
                  setStepError("");
                }}
                className="rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm font-bold"
              >
                Back
              </button>
            )}
            <button
              onClick={goNext}
              className="flex-1 rounded-lg bg-brand-orange py-3.5 text-sm font-bold text-white"
            >
              Continue
            </button>
          </div>
        )}
        {step === 3 && (
          <div className="mt-4">
            <button
              onClick={() => {
                setStep(2);
                setStepError("");
              }}
              className="rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm font-bold"
            >
              Back
            </button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
