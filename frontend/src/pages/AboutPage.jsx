import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-brand-brown">
      <Helmet>
        <title>
          About Us — Kidventures | Kids' Activities & Classes in the UAE
        </title>
        <meta
          name="description"
          content="Kidventures is a UAE-based platform that helps parents discover and book children's activities, classes, workshops and camps — all in one place. Learn about our mission."
        />
        <meta property="og:title" content="About Kidventures" />
        <meta
          property="og:description"
          content="Discover how Kidventures helps UAE families find and book the right children's activities, classes and experiences."
        />
        <link rel="canonical" href="https://kidventures.com/about" />
      </Helmet>

      <Navbar />

      <section className="bg-brand-cream px-5 py-12 text-center sm:px-10">
        <h1 className="mb-2 text-3xl font-bold">About Us</h1>
      </section>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h2 className="mb-3 text-xl font-bold text-brand-brown">
          Why Kidventures
        </h2>

        <p className="mb-8 text-base leading-7 text-brand-brown/80">
          At Kidventures, we believe childhood is meant to be filled with
          curiosity, creativity, learning and adventure. Kidventures is a
          UAE-based platform that makes it easier for families to{" "}
          <strong>
            discover and book children's activities, classes, workshops, camps
            and experiences
          </strong>
          , based on what they're looking for, when they want it and where
          they want it.
        </p>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-bold text-brand-brown">
            Making It Easier for Parents
          </h2>
          <p className="mb-3 text-sm leading-7 text-brand-brown/80">
            Finding the right activity for a child can often mean searching
            through social media pages, WhatsApp groups, websites and multiple
            platforms, only to find that the activity isn't available on the
            date, at the location or for the age group you need.
          </p>
          <p className="mb-3 font-semibold text-brand-orange">
            Kidventures brings it all together in one place.
          </p>
          <p className="mb-2 text-sm text-brand-brown/80">
            Parents can search and discover activities based on:
          </p>
          <ul className="mb-3 list-disc space-y-1.5 pl-5 text-sm leading-6 text-brand-brown/80">
            <li>
              <strong>What their child is interested in</strong>, arts and
              crafts, educational workshops, cooking, technology, creative
              activities and more
            </li>
            <li>
              <strong>Date</strong>, find activities available on a specific
              day
            </li>
            <li>
              <strong>Location</strong>, discover activities in a convenient
              area
            </li>
            <li>
              <strong>Age group</strong>, find experiences suitable for their
              child's age
            </li>
          </ul>
          <p className="text-sm leading-7 text-brand-brown/80">
            Whether a parent is looking for something to do this weekend, during
            the school holidays, after school or on a specific date, Kidventures
            makes it easier to find relevant options without having to search
            across multiple places.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-bold text-brand-brown">
            What We Do
          </h2>
          <p className="mb-3 text-sm leading-7 text-brand-brown/80">
            We connect families with instructors, educators, activity providers
            and organizations offering experiences for children across the UAE.
            Parents can browse activities, filter their options based on their
            needs, discover new experiences and book directly through the
            Kidventures platform.
          </p>
          <p className="text-sm leading-7 text-brand-brown/80">
            For instructors and activity providers, Kidventures provides a
            platform to showcase their expertise, reach new families and grow
            their activities.
          </p>
        </section>

        <section className="mb-8 rounded-2xl bg-brand-cream p-6">
          <h2 className="mb-2 text-xl font-bold text-brand-brown">
            Our Mission
          </h2>
          <p className="mb-3 text-lg font-semibold text-brand-orange">
            To help every child discover something they love.
          </p>
          <p className="text-sm leading-7 text-brand-brown/80">
            We want to make discovering children's activities easier for parents
            while giving children more opportunities to explore their interests,
            develop skills, build confidence and have fun. We believe the right
            activity can become more than just something to do, it can spark a
            passion, uncover a talent, build a friendship or become a lifelong
            interest.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-bold text-brand-brown">
            More Than a Directory
          </h2>
          <p className="mb-3 text-sm leading-7 text-brand-brown/80">
            Kidventures isn't simply a list of activities. We are building a{" "}
            <strong>discovery marketplace for children's experiences</strong>,
            designed around the way parents actually search.
          </p>
          <p className="text-sm leading-7 text-brand-brown/80">
            Instead of asking "Where can I find a children's activity?", parents
            can simply tell Kidventures what they're looking for, what
            activity, what date, what location and for what age group, and book
            relevant experiences in one place.
          </p>
        </section>

        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <section className="rounded-2xl border border-gray-100 p-5">
            <h2 className="mb-2 text-base font-bold text-brand-brown">
              For Families
            </h2>
            <p className="text-sm leading-6 text-brand-brown/80">
              We want Kidventures to become a trusted destination for parents
              looking for quality activities and experiences for their children,
              saving time, making discovery easier and helping families find
              activities they may never have discovered otherwise.
            </p>
          </section>
          <section className="rounded-2xl border border-gray-100 p-5">
            <h2 className="mb-2 text-base font-bold text-brand-brown">
              For Instructors
            </h2>
            <p className="text-sm leading-6 text-brand-brown/80">
              Kidventures gives instructors and activity providers an
              opportunity to showcase their activities, connect with families
              actively looking for children's experiences and grow their reach.
            </p>
          </section>
        </div>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-bold text-brand-brown">
            Giving Back
          </h2>
          <p className="text-sm leading-7 text-brand-brown/80">
            We also believe that every child deserves opportunities to learn,
            grow and thrive. As part of our commitment to giving back,
            Kidventures aims to contribute a portion of its proceeds towards
            initiatives supporting children in need.
          </p>
        </section>

        <section className="mb-4 rounded-2xl bg-brand-cream p-6 text-center">
          <h2 className="mb-2 text-xl font-bold text-brand-brown">
            Our Vision
          </h2>
          <p className="mb-4 text-sm leading-7 text-brand-brown/80">
            We envision a UAE where finding something meaningful for your child
            is as easy as searching for what they love, choosing when and where
            they want to do it, and booking it all in one place.
          </p>
          <p className="text-lg font-bold text-brand-orange">
            Discover. Learn. Create. Explore.
          </p>
          <p className="mt-1 text-sm font-semibold text-brand-brown/70">
            Your child's next adventure starts here.
          </p>
          <Link
            to="/activities"
            className="mt-5 inline-block rounded-[10px] bg-brand-orange px-6 py-3 text-sm font-bold text-white no-underline"
          >
            Explore Activities
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
