import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../api/axios";
import { saveAuth, parseAuthResponse, homeForRole } from "../api/auth";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  // Signup / email-verification / session-expiry ke baad yahan aate hain —
  // user ko bata dena chahiye ke hua kya hai.
  const params = new URLSearchParams(location.search);
  const notice =
    {
      "verify=1":
        "Almost done, we've emailed you a confirmation link. Click it, then log in here.",
      "verified=1": "Email confirmed! You can log in now.",
      "verified=expired":
        "That confirmation link has expired. Request a new one below.",
      "expired=1": "Your session expired. Please log in again.",
      "reset=1":
        "Password updated. Log in with your new password.",
    }[
      params.has("verify")
        ? `verify=${params.get("verify")}`
        : params.has("verified")
          ? `verified=${params.get("verified")}`
          : params.has("expired")
            ? `expired=${params.get("expired")}`
            : params.has("reset")
              ? `reset=${params.get("reset")}`
              : ""
    ] || "";

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = "Enter your email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = "Enter a valid email";
    if (!password) e.password = "Enter your password";
    return e;
  };

  const handleSubmit = async () => {
    setServerError("");
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    try {
      const res = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });
      // Token ab response mein nahi aata — woh httpOnly cookie mein set ho
      // chuka hai. Yahan sirf user info milti hai (navbar/redirect ke liye).
      const { user } = parseAuthResponse(res.data);
      if (!user) {
        setServerError(
          "Logged in, but no user info came back — check the API response shape in src/api/auth.js.",
        );
        return;
      }
      saveAuth({ user });
      const dest = location.state?.from || homeForRole(user?.role);
      navigate(dest, { replace: true });
    } catch (err) {
      // err.message axios interceptor set karta hai — us me server ka asli
      // message hota hai, ya "Cannot reach the server..." agar backend band ho.
      setServerError(
        err?.response?.data?.message ||
          err?.message ||
          "Login failed. Please check your details and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (bad) =>
    `w-full rounded-[10px] border px-3.5 py-3 text-sm text-brand-brown outline-none focus:border-brand-orange ${
      bad ? "border-[#c0392b]" : "border-gray-200"
    }`;

  return (
    <div className="min-h-screen bg-white font-sans text-brand-brown [color-scheme:light]">
      <Helmet>
        <title>Log In — Kidventures</title>
        <meta
          name="description"
          content="Log in to your Kidventures account to book classes and manage your bookings."
        />
      </Helmet>

      <Navbar />

      <section className="flex justify-center bg-brand-cream px-5 py-12">
        <div className="w-full max-w-[420px] rounded-[18px] bg-white p-6 shadow-[0_4px_24px_rgba(61,43,31,0.10)] sm:p-8">
          <h1 className="mb-1.5 text-2xl font-bold text-brand-brown">
            Welcome back
          </h1>
          <p className="mb-6 text-[13px] text-brand-brown/70">
            Log in to book classes and manage your account.
          </p>

          {notice && !serverError && (
            <div className="mb-4 rounded-[10px] border border-brand-orange/30 bg-brand-orange/10 px-4 py-3 text-[13px] text-brand-brown">
              {notice}
            </div>
          )}

          {serverError && (
            <div className="mb-4 rounded-[10px] border border-[#c0392b]/30 bg-[#c0392b]/10 px-4 py-3 text-[13px] text-[#c0392b]">
              {serverError}
            </div>
          )}

          {/* Email */}
          <div className="mb-4">
            <label className="mb-1.5 block text-left text-[13px] font-semibold">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="you@example.com"
              className={inputCls(errors.email)}
            />
            {errors.email && (
              <div className="mt-1.5 text-xs text-[#c0392b]">
                {errors.email}
              </div>
            )}
          </div>

          {/* Password */}
          <div className="mb-3.5">
            <label className="mb-1.5 block text-left text-[13px] font-semibold">
              Password
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="Your password"
                className={`${inputCls(errors.password)} pr-16`}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-brand-orange"
              >
                {showPass ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password && (
              <div className="mt-1.5 text-xs text-[#c0392b]">
                {errors.password}
              </div>
            )}
          </div>

          <div className="mb-5 flex items-center justify-between text-[13px]">
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="accent-brand-orange"
              />
              Remember me
            </label>
            <Link
              to="/forgot-password"
              className="font-semibold text-brand-orange no-underline"
            >
              Forgot password?
            </Link>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full cursor-pointer rounded-[10px] bg-brand-orange py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>

          <p className="mt-5 text-center text-[13px] text-brand-brown/80">
            Don&apos;t have an account?{" "}
            <Link
              to="/signup"
              className="font-bold text-brand-orange no-underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default LoginPage;
