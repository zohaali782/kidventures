import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const I = ({ children, size = 24, sw = 2 }) => (
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
const IcCal = (p) => (
  <I {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </I>
);
const IcLock = (p) => (
  <I {...p}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </I>
);
const IcSmile = (p) => (
  <I {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </I>
);
const IcEdit = (p) => (
  <I {...p}>
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </I>
);
const IcVerify = (p) => (
  <I {...p}>
    <path d="M9 12l2 2 4-4" />
    <path d="M12 3l7 4v5c0 4-3 7-7 9-4-2-7-5-7-9V7z" />
  </I>
);
const IcClasses = (p) => (
  <I {...p}>
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
  </I>
);
const IcMoney = (p) => (
  <I {...p}>
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
  </I>
);

const parentSteps = [
  {
    icon: IcSearch,
    title: "Search & discover",
    text: "Browse classes by category, age group, and area — or use filters to find exactly what your child needs.",
  },
  {
    icon: IcCal,
    title: "Pick a date & book",
    text: "Choose an upcoming session, select which child is attending, and review the details before you continue.",
  },
  {
    icon: IcLock,
    title: "Pay securely",
    text: "Complete payment with Stripe. The price you see is exactly what you pay — no hidden fees. Your seat is confirmed instantly.",
  },
  {
    icon: IcSmile,
    title: "Attend & enjoy",
    text: "Show up on the day — your instructor already has everything they need to know about your child, including any allergies.",
  },
];

const instructorSteps = [
  {
    icon: IcEdit,
    title: "Sign up",
    text: "Create your instructor account in minutes — no documents needed to get started.",
  },
  {
    icon: IcVerify,
    title: "Get verified",
    text: "Complete your profile with your bio, categories, and (where relevant) a trade licence. Our team reviews every application.",
  },
  {
    icon: IcClasses,
    title: "Publish your classes",
    text: "Create a class listing with pricing, schedule, and photos. Once approved, it goes live for parents to book.",
  },
  {
    icon: IcMoney,
    title: "Get paid",
    text: "You keep 85% of the price you set — Kidventures takes a 15% commission. Track your earnings from your dashboard.",
  },
];

function StepCard({ icon: Icon, title, text, index }) {
  return (
    <div className="relative rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-cream text-brand-orange">
        <Icon size={24} />
      </div>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-orange text-[10px] font-bold text-white">
          {index}
        </span>
        <h3 className="text-base font-bold">{title}</h3>
      </div>
      <p className="text-sm leading-relaxed opacity-75">{text}</p>
    </div>
  );
}

export default function HowItWorksPage() {
  const [tab, setTab] = useState("parents");
  const steps = tab === "parents" ? parentSteps : instructorSteps;

  return (
    <div className="min-h-screen bg-white font-sans text-brand-brown">
      <Helmet>
        <title>How It Works — Kidventures</title>
      </Helmet>
      <Navbar />

      <section className="bg-brand-cream px-5 py-14 text-center sm:px-10">
        <h1 className="mb-3 text-3xl font-bold sm:text-4xl">
          How Kidventures works
        </h1>
        <p className="mx-auto mb-7 max-w-xl text-sm leading-relaxed opacity-80 sm:text-base">
          Whether you're booking a class for your child or teaching one
          yourself, here's exactly what to expect.
        </p>
        <div className="inline-flex rounded-full border border-gray-200 bg-white p-1">
          {[
            ["parents", "For Parents"],
            ["instructors", "For Instructors"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-full px-5 py-2 text-sm font-semibold ${
                tab === key ? "bg-brand-orange text-white" : "text-brand-brown"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14 sm:px-10">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <StepCard key={s.title} {...s} index={i + 1} />
          ))}
        </div>

        <div className="mt-10 text-center">
          {tab === "parents" ? (
            <Link
              to="/activities"
              className="inline-block rounded-xl bg-brand-orange px-7 py-3 text-sm font-bold text-white no-underline"
            >
              Browse Classes
            </Link>
          ) : (
            <Link
              to="/become-instructor"
              className="inline-block rounded-xl bg-brand-orange px-7 py-3 text-sm font-bold text-white no-underline"
            >
              Become an Instructor
            </Link>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
