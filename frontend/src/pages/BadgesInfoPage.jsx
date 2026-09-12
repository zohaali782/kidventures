import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BadgeMedal, { BADGE_META } from "../components/BadgeMedal";

const BADGE_ORDER = ["founding", "popular", "bronze", "admin"];

const BADGE_DETAILS = {
  founding: {
    howToGet:
      "Be one of the first 20 instructors to have your profile approved on Kidventures.",
    notes:
      "This badge is permanent once earned and is awarded automatically — there is nothing extra to apply for.",
  },
  popular: {
    howToGet:
      "Get 5 or more confirmed bookings within the current calendar month.",
    notes:
      "This badge resets at the start of every month, so it always reflects who is in demand right now.",
  },
  bronze: {
    howToGet:
      "Maintain an average rating of 4.5★ or higher, from at least 5 parent reviews.",
    notes:
      "Calculated automatically from your review history and updates as new reviews come in.",
  },
  admin: {
    howToGet:
      "Awarded at the discretion of the Kidventures team to instructors who go above and beyond.",
    notes:
      "There's no fixed formula for this one — it's our way of highlighting instructors we personally vouch for.",
  },
};

export default function BadgesInfoPage() {
  return (
    <div className="min-h-screen bg-brand-cream flex flex-col">
      <Helmet>
        <title>Instructor Badges | Kidventures</title>
        <meta
          name="description"
          content="Learn what each Kidventures instructor badge means and how instructors earn them."
        />
      </Helmet>

      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-brand-brown mb-3">
            Instructor Badges
          </h1>
          <p className="text-gray-600 max-w-xl mx-auto">
            Badges are Kidventures' way of highlighting trusted, in-demand,
            and highly-rated instructors. Here's what each one means and how
            it's earned.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-14 mt-4">
          {BADGE_ORDER.map((type) => {
            const meta = BADGE_META[type];
            const details = BADGE_DETAILS[type];
            return (
              <div
                key={type}
                className="relative overflow-visible rounded-2xl bg-white pt-24 pb-6 px-6 shadow-md flex flex-col items-center text-center"
              >
                {/* Medal hangs off the top edge of the card, like a real
                    award ribbon pinned to it. */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                  <BadgeMedal type={type} size={88} showLabel />
                </div>

                <h2 className="font-bold text-brand-brown text-lg">
                  {meta.label}
                </h2>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  {meta.blurb}
                </p>
                <div className="mt-4 w-full rounded-xl bg-brand-cream/60 p-4 text-left">
                  <div className="text-xs font-bold uppercase tracking-wide text-brand-orange mb-1">
                    How to earn it
                  </div>
                  <p className="text-sm text-brand-brown/90">
                    {details.howToGet}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">{details.notes}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center bg-white rounded-2xl shadow-sm p-8">
          <h3 className="text-xl font-bold text-brand-brown mb-2">
            Want to earn your own badges?
          </h3>
          <p className="text-gray-600 mb-5">
            Join Kidventures as an instructor and start building your
            reputation with parents across the UAE.
          </p>
          <Link
            to="/become-instructor"
            className="inline-block rounded-full bg-brand-orange px-7 py-3 font-bold text-white no-underline"
          >
            Become an Instructor
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
