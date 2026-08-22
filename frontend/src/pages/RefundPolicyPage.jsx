import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const h2 = "mb-2 text-lg font-bold";
const p = "mb-3 text-sm leading-relaxed opacity-80";
const ul = "mb-3 list-disc space-y-1 pl-5 text-sm leading-relaxed opacity-80";

function Section({ title, children }) {
  return (
    <div className="mb-7">
      <h2 className={h2}>{title}</h2>
      <div className="space-y-2.5 text-sm leading-relaxed opacity-80">
        {children}
      </div>
    </div>
  );
}

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-brand-brown">
      <Helmet>
        <title>Refund & Cancellation Policy — Kidventures</title>
        <meta
          name="description"
          content="Learn about Kidventures' cancellation windows, refund eligibility, no-show policy and how to request a refund for a booked children's activity."
        />
        <meta
          property="og:title"
          content="Kidventures Refund & Cancellation Policy"
        />
        <link rel="canonical" href="https://kidventures.com/refund-policy" />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <Navbar />

      <section className="bg-brand-cream px-5 py-12 text-center sm:px-10">
        <h1 className="mb-2 text-3xl font-bold">
          Refund & Cancellation Policy
        </h1>
        <p className="text-xs opacity-60">Last Updated: 12 August 2026</p>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-10">
        <p className={p}>
          At Kidventures, we want families to feel confident when booking
          activities and experiences through our Platform. Because Kidventures
          is a marketplace connecting families with independent instructors and
          activity providers, cancellation and refund terms may vary depending
          on the activity. The specific cancellation terms applicable to a
          booking will be displayed to the customer where applicable before
          completing the booking.
        </p>

        <Section title="1. Customer Cancellations">
          <p className={p}>
            Unless a different cancellation policy is clearly stated for a
            specific activity:
          </p>

          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-green-50 p-4">
              <p className="mb-1 text-xs font-bold text-green-800">
                More than 48 hours before
              </p>
              <p className="text-xs leading-5 text-green-900/80">
                Full refund, less any applicable non-refundable payment
                processing or service fees.
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4">
              <p className="mb-1 text-xs font-bold text-amber-800">
                24–48 hours before
              </p>
              <p className="text-xs leading-5 text-amber-900/80">
                A partial refund may be offered, depending on the activity
                provider's policy.
              </p>
            </div>
            <div className="rounded-xl bg-red-50 p-4">
              <p className="mb-1 text-xs font-bold text-red-800">
                Less than 24 hours before
              </p>
              <p className="text-xs leading-5 text-red-900/80">
                Generally non-refundable, unless the provider agrees otherwise
                or exceptional circumstances apply.
              </p>
            </div>
          </div>
        </Section>

        <Section title="2. No-Shows">
          <p className={p}>
            If a customer does not attend a booked activity without cancelling
            within the applicable cancellation period, the booking will
            generally be considered a no-show and may not be eligible for a
            refund.
          </p>
        </Section>

        <Section title="3. Instructor or Activity Provider Cancellation">
          <p className={p}>
            If an instructor or activity provider cancels an activity,
            Kidventures may offer the customer:
          </p>
          <ul className={ul}>
            <li>A full refund; or</li>
            <li>
              The option to transfer the booking to another available date or
              session.
            </li>
          </ul>
          <p className={p}>
            Where an activity cannot reasonably be rescheduled, the customer
            will generally be entitled to a refund of the amount paid for the
            cancelled activity.
          </p>
        </Section>

        <Section title="4. Activity Changes">
          <p className={p}>
            If an activity is materially changed, including a significant change
            to the date, time, location or nature of the activity, Kidventures
            may offer the customer the option to:
          </p>
          <ul className={ul}>
            <li>Accept the revised activity;</li>
            <li>Transfer the booking to another available session; or</li>
            <li>Request a refund where applicable.</li>
          </ul>
        </Section>

        <Section title="5. Refund Processing">
          <p className={p}>
            Approved refunds will generally be returned through the original
            payment method. Because payments are processed through third-party
            payment providers such as Stripe, the time required for a refund to
            appear in a customer's account may depend on the payment provider
            and the customer's bank. Kidventures does not control the processing
            time of the customer's bank or card issuer.
          </p>
        </Section>

        <Section title="6. Payment Processing Fees">
          <p className={p}>
            Where permitted by applicable law and disclosed at the time of
            booking, payment processing or service fees may be non-refundable
            even when the underlying activity payment is refunded.
          </p>
        </Section>

        <Section title="7. Exceptional Circumstances">
          <p className={p}>
            Kidventures may consider refund requests arising from exceptional
            circumstances on a case-by-case basis. Examples may include serious
            emergencies, government restrictions, venue closures or
            circumstances outside the reasonable control of the customer,
            instructor or Kidventures. Supporting documentation may be requested
            where appropriate.
          </p>
        </Section>

        <Section title="8. Disputes and Booking Issues">
          <p className={p}>
            If you believe an activity was materially different from its
            description or there was an issue with your booking, please contact
            Kidventures as soon as possible after the activity. We may request
            relevant information from both the customer and activity provider
            before determining an appropriate resolution.
          </p>
        </Section>

        <Section title="9. Instructor Responsibility">
          <p className={p}>
            Activity providers are responsible for delivering their activities
            substantially as described on the Platform and for complying with
            applicable laws, licenses, permits and safety requirements.
            Kidventures may assist with resolving booking-related issues but
            does not replace the activity provider's own obligations to
            customers.
          </p>
        </Section>

        <Section title="10. How to Request a Refund">
          <p className={p}>
            To request a refund or cancellation,{" "}
            <Link to="/contact" className="font-semibold text-brand-orange">
              contact Kidventures
            </Link>{" "}
            through the customer-support contact details provided on the
            Platform. Please include:
          </p>
          <ul className={ul}>
            <li>Customer name</li>
            <li>Booking reference</li>
            <li>Activity name</li>
            <li>Date of activity</li>
            <li>Reason for the request</li>
          </ul>
        </Section>

        <Section title="11. Changes to This Policy">
          <p className={p}>
            Kidventures may update this Refund & Cancellation Policy from time
            to time. The updated policy will be published on the Platform with a
            revised "Last Updated" date.
          </p>
        </Section>

        <p className="mt-8 rounded-xl bg-brand-cream p-4 text-sm font-semibold leading-6">
          By completing a booking through Kidventures, you acknowledge and agree
          to the cancellation and refund terms applicable to that booking.
        </p>
      </section>

      <Footer />
    </div>
  );
}
