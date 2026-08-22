import { Helmet } from "react-helmet-async";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function Section({ title, children }) {
  return (
    <div className="mb-7">
      <h2 className="mb-2 text-lg font-bold">{title}</h2>
      <div className="space-y-2.5 text-sm leading-relaxed opacity-80">
        {children}
      </div>
    </div>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-brand-brown">
      <Helmet>
        <title>Terms & Conditions — Kidventures</title>
      </Helmet>
      <Navbar />

      <section className="bg-brand-cream px-5 py-12 text-center sm:px-10">
        <h1 className="mb-2 text-3xl font-bold">Terms & Conditions</h1>
        <p className="text-xs opacity-60">Last Updated: 12 August 2026</p>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-10">
        <p className="mb-8 text-sm leading-relaxed opacity-80">
          These terms govern your use of Kidventures. By creating an account or
          booking a class, you agree to them.
        </p>

        <Section title="1. What Kidventures is">
          <p>
            Kidventures is a marketplace that connects parents in Dubai with
            independent instructors offering kids' activities and classes.
            Instructors are independent providers, not employees of Kidventures
            — Kidventures facilitates discovery, booking, and payment.
          </p>
        </Section>

        <Section title="2. Accounts">
          <p>
            You must provide accurate information when creating an account.
            You're responsible for keeping your login details secure and for all
            activity under your account.
          </p>
        </Section>

        <Section title="3. Bookings and payment">
          <p>
            When you book a class, your seat is reserved for 15 minutes while
            you complete payment. A booking is only confirmed once payment is
            successfully processed. Prices shown are exactly what you pay — no
            hidden fees are added at checkout.
          </p>
        </Section>

        <Section title="4. Cancellations and refunds">
          <p>
            See our{" "}
            <a
              href="/refund-policy"
              className="font-semibold text-brand-orange"
            >
              Refund Policy
            </a>{" "}
            for full details. In short: full refund up to 24 hours before a
            class, no refund within 24 hours of the class start time.
          </p>
        </Section>

        <Section title="5. Instructor responsibilities">
          <p>
            Instructors are responsible for the accuracy of their class
            listings, for delivering classes safely and as described, and for
            complying with our verification requirements. Kidventures reserves
            the right to suspend or remove any instructor or class that violates
            these terms or raises safety concerns.
          </p>
        </Section>

        <Section title="6. Parent responsibilities">
          <p>
            Parents are responsible for providing accurate information about
            their child, including allergies and medical notes, and for ensuring
            their child is dropped off and collected as required by each class.
          </p>
        </Section>

        <Section title="7. Limitation of liability">
          <p>
            Kidventures facilitates bookings between parents and independent
            instructors but is not responsible for the conduct of instructors or
            the outcome of any class. To the extent permitted by law,
            Kidventures' liability is limited to the amount paid for the
            relevant booking.
          </p>
        </Section>

        <Section title="8. Changes to these terms">
          <p>
            We may update these terms from time to time. Continued use of
            Kidventures after changes are posted means you accept the updated
            terms.
          </p>
        </Section>

        <Section title="9. Contact">
          <p>
            Questions about these terms? Reach out at{" "}
            <a
              href="mailto:support@kidventures.com"
              className="font-semibold text-brand-orange"
            >
              support@kidventures.com
            </a>
            .
          </p>
        </Section>
      </section>

      <Footer />
    </div>
  );
}
