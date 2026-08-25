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
const IcMoney = (p) => (
  <I {...p}>
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
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
const IcVerify = (p) => (
  <I {...p}>
    <path d="M9 12l2 2 4-4" />
    <path d="M12 3l7 4v5c0 4-3 7-7 9-4-2-7-5-7-9V7z" />
  </I>
);
const IcUsers = (p) => (
  <I {...p}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </I>
);
const IcEdit = (p) => (
  <I {...p}>
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </I>
);
const IcClasses = (p) => (
  <I {...p}>
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
  </I>
);
const IcCheck = (p) => (
  <I {...p}>
    <polyline points="20 6 9 17 4 12" />
  </I>
);

const benefits = [
  {
    icon: IcMoney,
    title: "Keep 85% of every booking",
    text: "You set the price, parents pay exactly that — Kidventures takes a transparent 15% commission, nothing hidden.",
  },
  {
    icon: IcCal,
    title: "You control your schedule",
    text: "Set your own sessions, capacity, and pricing. Add or cancel dates any time from your dashboard.",
  },
  {
    icon: IcUsers,
    title: "Reach families across Dubai",
    text: "Get discovered by parents actively searching for classes like yours — no marketing spend required.",
  },
  {
    icon: IcVerify,
    title: "A trusted platform",
    text: "Every instructor is verified, which means parents trust the classes they find here — and trust converts to bookings.",
  },
];

const steps = [
  {
    icon: IcEdit,
    title: "Create your account",
    text: "Sign up as an instructor — takes less than a minute, no documents needed yet.",
  },
  {
    icon: IcVerify,
    title: "Complete verification",
    text: "Add your bio, categories, and required documents from your dashboard for our team to review.",
  },
  {
    icon: IcClasses,
    title: "Publish your first class",
    text: "Set your price, schedule, and photos. Once approved, parents can start booking right away.",
  },
];

export default function BecomeInstructorPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-brand-brown">
      <Helmet>
        <title>Become an Instructor — Kidventures</title>
      </Helmet>
      <Navbar />

      {/* hero */}
      <section className="bg-brand-cream px-5 py-16 text-center sm:px-10">
        <h1 className="mb-4 text-3xl font-bold sm:text-4xl">
          Teach what you love. Reach families across Dubai.
        </h1>
        <p className="mx-auto mb-7 max-w-xl text-sm leading-relaxed opacity-80 sm:text-base">
          Kidventures connects skilled instructors with parents looking for
          quality kids' activities — from art and robotics to sports and music.
          You bring the expertise, we bring the families.
        </p>
        <Link
          to="/signup"
          className="inline-block rounded-xl bg-brand-orange px-7 py-3.5 text-sm font-bold text-white no-underline"
        >
          Sign Up as an Instructor
        </Link>
      </section>

      {/* benefits */}
      <section className="mx-auto max-w-5xl px-5 py-14 sm:px-10">
        <h2 className="mb-8 text-center text-2xl font-bold">
          Why teach on Kidventures
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-cream text-brand-orange">
                <b.icon size={22} />
              </div>
              <div>
                <h3 className="mb-1 text-base font-bold">{b.title}</h3>
                <p className="text-sm leading-relaxed opacity-75">{b.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* how it works mini */}
      <section className="bg-brand-cream px-5 py-14 sm:px-10">
        <h2 className="mb-8 text-center text-2xl font-bold">
          Getting started takes 3 steps
        </h2>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="rounded-2xl bg-white p-6 text-center shadow-sm"
            >
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-orange text-sm font-bold text-white">
                {i + 1}
              </div>
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-cream text-brand-orange">
                <s.icon size={22} />
              </div>
              <h3 className="mb-1.5 text-base font-bold">{s.title}</h3>
              <p className="text-sm leading-relaxed opacity-75">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* requirements */}
      <section className="mx-auto max-w-3xl px-5 py-14 text-center sm:px-10">
        <h2 className="mb-5 text-2xl font-bold">What you'll need</h2>
        <div className="mx-auto flex max-w-md flex-col gap-2.5 text-left">
          {[
            "A valid Emirates ID",
            "A trade licence, if you're based in the UAE",
            "Relevant certificates or experience in your subject",
            "A short intro video or active social media presence",
          ].map((r) => (
            <div key={r} className="flex items-center gap-2.5 text-sm">
              <IcCheck size={16} className="shrink-0 text-brand-orange" />
              {r}
            </div>
          ))}
        </div>
      </section>

      {/* service fees & pricing */}
      <section className="bg-brand-cream px-5 py-14 sm:px-10">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <h2 className="mb-4 text-2xl font-bold">Service Fees &amp; Pricing</h2>
          <div className="space-y-3 text-sm leading-relaxed opacity-85">
            <p>
              Kidventures charges a{" "}
              <strong>15% service fee on each successful booking</strong>.
              This supports the platform, activity promotion, booking
              management, payment processing and customer support.
            </p>
            <p>
              The 15% service fee is added to the instructor&apos;s listed
              price and paid by the parent at checkout. For example, if a
              workshop is listed at AED 100, the parent pays AED 115, and the
              instructor receives their AED 100 workshop price.
            </p>
            <p className="font-semibold">Instructors agree that:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                To ensure fair pricing, the final price on Kidventures,
                including the 15% service fee, must not be higher than the
                publicly available price for the same activity elsewhere.
              </li>
              <li>
                Instructors must not redirect Kidventures customers to book
                privately. Violations will result in listing suspension or
                removal from Kidventures.
              </li>
              <li>
                Genuine promotions and special sibling offers are permitted
                on the Kidventures platform.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 pb-16 text-center sm:px-10">
        <Link
          to="/signup"
          className="inline-block rounded-xl bg-brand-orange px-7 py-3.5 text-sm font-bold text-white no-underline"
        >
          Sign Up as an Instructor
        </Link>
      </section>

      <Footer />
    </div>
  );
}
