import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

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
const IcChevron = (p) => (
  <I {...p}>
    <polyline points="6 9 12 15 18 9" />
  </I>
);

const faqGroups = [
  {
    group: "For Parents",
    items: [
      {
        q: "How do I book a class?",
        a: "Browse activities, pick a class, choose a date and time, select which child is attending, and pay securely with your card. Your seat is held for 15 minutes while you complete payment.",
      },
      {
        q: "What is your cancellation policy?",
        a: "You can cancel for a full refund up to 24 hours before the class starts. Cancellations within 24 hours of the class are not refundable, as instructors have already prepared for your child's spot.",
      },
      {
        q: "Is payment secure?",
        a: "Yes. All payments are processed through Stripe, a leading global payment provider. Your card details are never stored on our servers.",
      },
      {
        q: "Do you offer a sibling discount?",
        a: "Yes, when you book 2 or more children in the same booking, you automatically get 10% off the total.",
      },
      {
        q: "Can't find a class you're looking for?",
        a: "Use our \"Request a Class\" page to tell us what you're after. We use these requests to decide which instructors to bring on next, and we'll email you when a matching class becomes available.",
      },
      {
        q: "Are instructors background-checked?",
        a: "Every instructor goes through a verification process, including identity checks and, where relevant, a trade licence, before their classes go live on Kidventures.",
      },
    ],
  },
  {
    group: "For Instructors",
    items: [
      {
        q: "How do I start teaching on Kidventures?",
        a: "Sign up as an instructor, then complete your profile and verification (bio, categories, documents) from your dashboard. Once approved, you can create and publish classes.",
      },
      {
        q: "How much does Kidventures take?",
        a: "Kidventures keeps a 15% commission on the price you set. Whatever price you list is exactly what parents pay. There's no extra fee added on top for them.",
      },
      {
        q: "When do I get paid?",
        a: "Payouts are processed after a class is completed. You can track your earnings and pending payouts from your Instructor Dashboard.",
      },
      {
        q: "Can I edit a class after publishing it?",
        a: "Yes, you can edit your class details, add new sessions, and manage photos any time from My Classes. Sessions with existing bookings are cancelled rather than deleted, to protect families who've already booked.",
      },
      {
        q: "What if my category isn't listed?",
        a: "You can type any category when creating a class. Our team reviews it and assigns the right category. Your class stays pending until that's resolved.",
      },
    ],
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 py-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="text-sm font-bold sm:text-[15px]">{q}</span>
        <IcChevron
          size={18}
          className={`shrink-0 text-brand-orange transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <p className="mt-2.5 text-sm leading-relaxed opacity-75">{a}</p>}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-brand-brown">
      <Helmet>
        <title>FAQs — Kidventures</title>
      </Helmet>
      <Navbar />

      <section className="bg-brand-cream px-5 py-14 text-center sm:px-10">
        <h1 className="mb-3 text-3xl font-bold sm:text-4xl">
          Frequently Asked Questions
        </h1>
        <p className="mx-auto max-w-xl text-sm leading-relaxed opacity-80 sm:text-base">
          Answers to the questions we hear most from parents and instructors.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-14 sm:px-10">
        {faqGroups.map((g) => (
          <div key={g.group} className="mb-10">
            <h2 className="mb-2 text-lg font-bold text-brand-orange">
              {g.group}
            </h2>
            <div>
              {g.items.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        ))}

        <div className="rounded-2xl bg-brand-cream px-6 py-5 text-center text-sm">
          Still have a question?{" "}
          <Link
            to="/contact"
            className="font-bold text-brand-orange no-underline"
          >
            Get in touch
          </Link>
          .
        </div>
      </section>

      <Footer />
    </div>
  );
}
