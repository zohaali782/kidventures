import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../api/axios";

/**
 * Forgot password — email daalo, reset link aa jayega.
 *
 * NOTE: backend ka jawab hamesha ek jaisa hota hai, chahe email registered
 * ho ya na ho. Is liye hum bhi "email nahi mili" jaisa kuch nahi dikhate —
 * warna koi is page se check kar sakta hai ke kaun si email account rakhti hai.
 */
function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");

    if (!email.trim()) {
      setError("Enter your email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-brand-brown [color-scheme:light]">
      <Helmet>
        <title>Forgot Password — Kidventures</title>
        <meta
          name="description"
          content="Reset your Kidventures account password."
        />
      </Helmet>

      <Navbar />

      <section className="flex justify-center bg-brand-cream px-5 py-12">
        <div className="w-full max-w-[420px] rounded-[18px] bg-white p-6 shadow-[0_4px_24px_rgba(61,43,31,0.10)] sm:p-8">
          {sent ? (
            <>
              <h1 className="mb-1.5 text-2xl font-bold text-brand-brown">
                Check your inbox
              </h1>
              <p className="mb-6 text-[13px] leading-relaxed text-brand-brown/70">
                If an account exists for <strong>{email.trim()}</strong>, we've
                sent a reset link to it. The link works once and expires in
                1 hour.
              </p>

              <div className="mb-6 rounded-[10px] border border-brand-orange/30 bg-brand-orange/10 px-4 py-3 text-[13px] text-brand-brown">
                Don't see it? Check your spam folder before requesting another
                link.
              </div>

              <Link
                to="/login"
                className="block w-full rounded-[10px] bg-brand-orange py-3 text-center text-sm font-bold text-white no-underline"
              >
                Back to log in
              </Link>
            </>
          ) : (
            <>
              <h1 className="mb-1.5 text-2xl font-bold text-brand-brown">
                Forgot your password?
              </h1>
              <p className="mb-6 text-[13px] text-brand-brown/70">
                Enter your email and we'll send you a link to set a new one.
              </p>

              {error && (
                <div className="mb-4 rounded-[10px] border border-[#c0392b]/30 bg-[#c0392b]/10 px-4 py-3 text-[13px] text-[#c0392b]">
                  {error}
                </div>
              )}

              <div className="mb-5">
                <label className="mb-1.5 block text-left text-[13px] font-semibold">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="you@example.com"
                  className={`w-full rounded-[10px] border px-3.5 py-3 text-sm text-brand-brown outline-none focus:border-brand-orange ${
                    error ? "border-[#c0392b]" : "border-gray-200"
                  }`}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full cursor-pointer rounded-[10px] bg-brand-orange py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>

              <p className="mt-5 text-center text-[13px] text-brand-brown/80">
                Remembered it?{" "}
                <Link
                  to="/login"
                  className="font-bold text-brand-orange no-underline"
                >
                  Log in
                </Link>
              </p>
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default ForgotPasswordPage;
