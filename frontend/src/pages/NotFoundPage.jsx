import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-cream">
      <Helmet>
        <title>Page Not Found — Kidventures</title>
      </Helmet>
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="max-w-sm text-center">
          <div className="mb-2 text-6xl font-bold text-brand-orange">404</div>
          <h1 className="mb-2 text-lg font-bold text-brand-brown">
            We can't find that page
          </h1>
          <p className="mb-6 text-sm text-brand-brown/70">
            The page you're looking for doesn't exist, or may have moved.
          </p>
          <Link
            to="/"
            className="inline-block rounded-full bg-brand-orange px-6 py-2.5 text-sm font-bold text-white no-underline hover:opacity-90"
          >
            Back to homepage
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
