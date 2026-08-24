import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function CampsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-cream">
      <Helmet>
        <title>Camps — Kidventures</title>
      </Helmet>
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="max-w-md text-center">
          <h1 className="mb-2 text-2xl font-bold text-brand-brown">
            Camps are on their way
          </h1>
          <p className="mb-6 text-sm leading-relaxed text-brand-brown/70">
            We're putting together our holiday camps program. In the
            meantime, browse our regular classes and activities.
          </p>
          <Link
            to="/activities"
            className="inline-block rounded-full bg-brand-orange px-6 py-2.5 text-sm font-bold text-white no-underline hover:opacity-90"
          >
            Browse Activities
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
