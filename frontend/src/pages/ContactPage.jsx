import { Helmet } from "react-helmet-async";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const I = ({ children, size = 20, sw = 2 }) => (
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
const IcMail = (p) => (
  <I {...p}>
    <path d="M4 4h16v16H4z" />
    <path d="m22 6-10 7L2 6" />
  </I>
);
const IcPhone = (p) => (
  <I {...p}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </I>
);
const IcPin = (p) => (
  <I {...p}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </I>
);
const IcClock = (p) => (
  <I {...p}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </I>
);

function Card({ icon: Icon, title, children }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-cream text-brand-orange">
        <Icon size={22} />
      </div>
      <h3 className="mb-1.5 text-base font-bold">{title}</h3>
      <div className="text-sm leading-relaxed opacity-75">{children}</div>
    </div>
  );
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-brand-brown">
      <Helmet>
        <title>Contact Us — Kidventures</title>
      </Helmet>
      <Navbar />

      <section className="bg-brand-cream px-5 py-14 text-center sm:px-10">
        <h1 className="mb-3 text-3xl font-bold sm:text-4xl">Get in touch</h1>
        <p className="mx-auto max-w-xl text-sm leading-relaxed opacity-80 sm:text-base">
          Questions about a booking, an instructor application, or anything
          else? We're happy to help.
        </p>
      </section>

      <section className="mx-auto grid max-w-4xl grid-cols-1 gap-5 px-5 py-14 sm:grid-cols-2 sm:px-10">
        <Card icon={IcMail} title="Email">
          <a
            href="mailto:support@kidventures.com"
            className="font-semibold text-brand-orange no-underline"
          >
            support@kidventures.com
          </a>
          <p className="mt-1.5 text-xs opacity-60">
            We typically reply within 24 hours.
          </p>
        </Card>
        <Card icon={IcPhone} title="Phone / WhatsApp">
          <a
            href="tel:+97140000000"
            className="font-semibold text-brand-orange no-underline"
          >
            +971 4 000 0000
          </a>
          <p className="mt-1.5 text-xs opacity-60">Sunday–Thursday, 9am–6pm</p>
        </Card>
        <Card icon={IcPin} title="Based in">
          Dubai, United Arab Emirates
        </Card>
        <Card icon={IcClock} title="Support hours">
          Sunday–Thursday, 9:00 AM – 6:00 PM (Gulf Standard Time)
        </Card>
      </section>

      <section className="mx-auto max-w-2xl px-5 pb-16 text-center sm:px-10">
        <p className="text-sm opacity-70">
          Looking for help with a specific booking? Include your booking
          reference (e.g. <span className="font-semibold">KV-2026-XXXXXXX</span>
          ) in your email so we can find it faster.
        </p>
      </section>

      <Footer />
    </div>
  );
}
