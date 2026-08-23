import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../api/axios";

/**
 * Reset password — email ke link se yahan aate hain.
 *
 * URL se token milta hai (/reset-password/:token). Woh token raw hai;
 * database me sirf uska hash rakha hai, is liye server hi tasdeeq karta hai.
 */
function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!password) {
      e.password = "Enter a new password";
    } else if (password.length < 8) {
      e.password = "At least 8 characters";
    } else if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      // Backend ka bhi yehi qanoon hai — yahan pehle bata dete hain
      e.password = "Must include at least one letter and one number";
    }

    if (!confirm) e.confirm = "Confirm your new password";
    else if (confirm !== password) e.confirm = "Passwords don't match";

    return e;
  };

  const handleSubmit = async () => {
    setServerError("");
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { password });
      navigate("/login?reset=1", { replace: true });
    } catch (err) {
      setServerError(
        err?.response?.data?.message ||
          err?.message ||
          "Could not reset your password. Please try again.",
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
        <title>Reset Password — Kidventures</title>
        <meta name="description" content="Set a new Kidventures password." />
      </Helmet>

      <Navbar />

      <section className="flex justify-center bg-brand-cream px-5 py-12">
        <div className="w-full max-w-[420px] rounded-[18px] bg-white p-6 shadow-[0_4px_24px_rgba(61,43,31,0.10)] sm:p-8">
          <h1 className="mb-1.5 text-2xl font-bold text-brand-brown">
            Set a new password
          </h1>
          <p className="mb-6 text-[13px] text-brand-brown/70">
            Choose something you haven't used here before.
          </p>

          {serverError && (
            <div className="mb-4 rounded-[10px] border border-[#c0392b]/30 bg-[#c0392b]/10 px-4 py-3 text-[13px] text-[#c0392b]">
              {serverError}
              {/* Expired ya galat link — nayi request ka raasta de dein */}
              <div className="mt-2">
                <Link
                  to="/forgot-password"
                  className="font-bold text-[#c0392b] underline"
                >
                  Request a new link
                </Link>
              </div>
            </div>
          )}

          {/* New password */}
          <div className="mb-4">
            <label className="mb-1.5 block text-left text-[13px] font-semibold">
              New password
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="At least 8 characters"
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
            {errors.password ? (
              <div className="mt-1.5 text-xs text-[#c0392b]">
                {errors.password}
              </div>
            ) : (
              <div className="mt-1.5 text-xs text-brand-brown/60">
                Use at least 8 characters with a letter and a number.
              </div>
            )}
          </div>

          {/* Confirm */}
          <div className="mb-5">
            <label className="mb-1.5 block text-left text-[13px] font-semibold">
              Confirm new password
            </label>
            <input
              type={showPass ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Type it again"
              className={inputCls(errors.confirm)}
            />
            {errors.confirm && (
              <div className="mt-1.5 text-xs text-[#c0392b]">
                {errors.confirm}
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full cursor-pointer rounded-[10px] bg-brand-orange py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Updating..." : "Update password"}
          </button>

          <p className="mt-5 text-center text-[13px] text-brand-brown/80">
            <Link
              to="/login"
              className="font-bold text-brand-orange no-underline"
            >
              Back to log in
            </Link>
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default ResetPasswordPage;
