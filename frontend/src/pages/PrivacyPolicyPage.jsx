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

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-brand-brown">
      <Helmet>
        <title>Privacy Policy — Kidventures</title>
        <meta
          name="description"
          content="Read how Kidventures collects, uses, discloses and protects your personal information when you use our platform to discover and book children's activities."
        />
        <meta property="og:title" content="Kidventures Privacy Policy" />
        <link rel="canonical" href="https://kidventures.com/privacy-policy" />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <Navbar />

      <section className="bg-brand-cream px-5 py-12 text-center sm:px-10">
        <h1 className="mb-2 text-3xl font-bold">Privacy Policy</h1>
        <p className="text-xs opacity-60">Last Updated: 12 August 2026</p>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-10">
        <p className={p}>
          Kidventures ("Kidventures", "we", "us", or "our") respects your
          privacy and is committed to protecting the personal information of our
          users. This Privacy Policy explains how we collect, use, disclose and
          protect information when you use the Kidventures website, platform and
          related services (collectively, the "Platform"). By using Kidventures,
          you acknowledge that you have read and understood this Privacy Policy.
        </p>

        <Section title="1. Information We Collect">
          <p className={p}>
            Depending on how you use Kidventures, we may collect information
            including:
          </p>

          <p className="mb-1.5 text-sm font-semibold text-brand-brown">
            Information provided by parents or users
          </p>
          <ul className={ul}>
            <li>Full name</li>
            <li>Email address</li>
            <li>Phone number</li>
            <li>Billing and transaction information</li>
            <li>Account login information</li>
            <li>
              Child's first name, age or age group and relevant activity
              information where necessary to facilitate a booking
            </li>
            <li>Booking and activity history</li>
            <li>Communications with Kidventures or activity providers</li>
            <li>
              Information voluntarily provided when contacting us or
              participating in activities
            </li>
          </ul>

          <p className="mb-1.5 text-sm font-semibold text-brand-brown">
            Information provided by instructors and activity providers
          </p>
          <ul className={ul}>
            <li>Name</li>
            <li>Business or organization name</li>
            <li>Contact information</li>
            <li>Professional qualifications or experience</li>
            <li>
              Business license or registration information where applicable
            </li>
            <li>Activity and class information</li>
            <li>Payment and payout information</li>
            <li>
              Profile photographs and other information voluntarily submitted
              for publication on the Platform
            </li>
          </ul>

          <p className="mb-1.5 text-sm font-semibold text-brand-brown">
            Automatically collected information
          </p>
          <ul className={ul}>
            <li>IP address</li>
            <li>Browser and device information</li>
            <li>Operating system</li>
            <li>Pages viewed</li>
            <li>Approximate location information</li>
            <li>Usage and interaction data</li>
            <li>Cookies and similar technologies</li>
          </ul>
        </Section>

        <Section title="2. How We Use Information">
          <p className={p}>We may use personal information to:</p>
          <ul className={ul}>
            <li>Create and manage user accounts</li>
            <li>Process bookings and payments</li>
            <li>
              Facilitate communication between families and activity providers
            </li>
            <li>Provide and improve our services</li>
            <li>Manage instructor and activity-provider profiles</li>
            <li>
              Send booking confirmations, reminders and service-related
              communications
            </li>
            <li>Respond to enquiries and customer support requests</li>
            <li>Prevent fraud, misuse and unauthorized transactions</li>
            <li>Comply with legal and regulatory requirements</li>
            <li>
              Analyze Platform usage and improve the Kidventures experience
            </li>
            <li>
              Send marketing communications where permitted by law and, where
              required, with your consent
            </li>
          </ul>
        </Section>

        <Section title="3. Payments">
          <p className={p}>
            Payments made through Kidventures may be processed by third-party
            payment service providers, including <strong>Stripe</strong>.
            Kidventures does not generally store complete payment card numbers
            on its own systems. Payment information may be collected and
            processed directly by Stripe in accordance with its own privacy and
            security practices. You can review Stripe's privacy information on
            its website.
          </p>
        </Section>

        <Section title="4. Sharing Information">
          <p className={p}>
            We may share information where reasonably necessary to operate
            Kidventures, including with:
          </p>
          <ul className={ul}>
            <li>
              Activity providers and instructors when required to fulfil a
              booking
            </li>
            <li>Payment processors and financial service providers</li>
            <li>
              Technology, hosting, analytics and customer-support providers
            </li>
            <li>Professional advisers</li>
            <li>
              Government authorities or law-enforcement agencies where legally
              required
            </li>
            <li>
              Other parties where necessary to protect the rights, safety or
              security of Kidventures, our users or others
            </li>
          </ul>
          <p className={p}>
            We do not sell users' personal information as a commercial data
            product.
          </p>
        </Section>

        <Section title="5. Children's Information">
          <p className={p}>
            Kidventures is designed for parents, guardians and families. We may
            collect limited information about children when it is necessary to
            facilitate participation in a booked activity. Parents or legal
            guardians are responsible for ensuring that information provided
            about a child is accurate and that they have the appropriate
            authority to provide that information. We ask users not to provide
            unnecessary sensitive information about children through the
            Platform.
          </p>
        </Section>

        <Section title="6. Cookies">
          <p className={p}>
            Kidventures may use cookies and similar technologies to:
          </p>
          <ul className={ul}>
            <li>Keep users signed in</li>
            <li>Remember preferences</li>
            <li>Understand how the Platform is used</li>
            <li>Improve functionality</li>
            <li>Measure marketing performance</li>
            <li>Help provide relevant content and communications</li>
          </ul>
          <p className={p}>
            Users may be able to manage cookies through their browser settings.
          </p>
        </Section>

        <Section title="7. Data Security">
          <p className={p}>
            We take reasonable administrative, technical and organizational
            measures to protect personal information against unauthorized
            access, loss, misuse, alteration or disclosure. However, no internet
            transmission or electronic storage system can be guaranteed to be
            completely secure.
          </p>
        </Section>

        <Section title="8. Data Retention">
          <p className={p}>
            We retain personal information for as long as reasonably necessary
            to provide our services, maintain business and transaction records,
            resolve disputes, prevent fraud and comply with applicable legal
            obligations. When information is no longer required, we may securely
            delete or anonymize it where appropriate.
          </p>
        </Section>

        <Section title="9. Third-Party Services">
          <p className={p}>
            Kidventures may use third-party services such as payment processors,
            hosting providers, analytics services, communication tools and other
            technology providers. These providers may process information in
            accordance with their own privacy policies and applicable
            agreements.
          </p>
        </Section>

        <Section title="10. Your Rights">
          <p className={p}>
            Subject to applicable law, you may have rights to:
          </p>
          <ul className={ul}>
            <li>Request access to personal information we hold about you</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of information where legally permissible</li>
            <li>Withdraw consent where processing is based on consent</li>
            <li>Object to or restrict certain processing</li>
            <li>Unsubscribe from marketing communications</li>
          </ul>
          <p className={p}>
            Requests may be made by contacting us using the contact details
            provided on the Platform.
          </p>
        </Section>

        <Section title="11. Changes to This Policy">
          <p className={p}>
            We may update this Privacy Policy from time to time. Any updated
            version will be published on the Kidventures Platform with a revised
            "Last Updated" date.
          </p>
        </Section>

        <Section title="12. Contact Us">
          <p className={p}>
            If you have questions about this Privacy Policy or how we handle
            personal information, please{" "}
            <Link to="/contact" className="font-semibold text-brand-orange">
              contact Kidventures
            </Link>{" "}
            through the contact details provided on our website.
          </p>
        </Section>

        <p className="mt-8 text-sm font-semibold opacity-70">
          By using Kidventures, you acknowledge this Privacy Policy.
        </p>
      </section>

      <Footer />
    </div>
  );
}
