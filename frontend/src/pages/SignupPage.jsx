import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../api/axios";
import { saveAuth, parseAuthResponse, homeForRole } from "../api/auth";

const inputCls = (bad) =>
  `w-full rounded-[10px] border px-3.5 py-3 text-sm text-brand-brown outline-none focus:border-brand-orange ${
    bad ? "border-[#c0392b]" : "border-gray-200"
  }`;

function Field({ label, children, error }) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-left text-[13px] font-semibold">
        {label}
      </label>
      {children}
      {error && <div className="mt-1.5 text-xs text-[#c0392b]">{error}</div>}
    </div>
  );
}

function SignupPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState("parent"); // parent | instructor
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Enter your full name";
    if (!form.email.trim()) e.email = "Enter your email";
    else if (!emailOk(form.email)) e.email = "Enter a valid email";
    if (!form.phone.trim()) e.phone = "Enter your phone number";
    else if (form.phone.replace(/\D/g, "").length < 7)
      e.phone = "Enter a valid phone number";
    if (!form.password) e.password = "Create a password";
    else if (form.password.length < 8) e.password = "At least 8 characters";
    else if (!/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password))
      // Backend ka bhi yehi qanoon hai (User.validatePasswordStrength) —
      // yahan pehle bata dete hain taake signup reject na ho
      e.password = "Must include at least one letter and one number";
    if (form.confirm !== form.password) e.confirm = "Passwords do not match";
    return e;
  };

  const handleSubmit = async () => {
    setServerError("");
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    try {
      const res = await api.post("/auth/signup", {
        role,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });
      // Agar verification email gayi hai to abhi login nahi hua —
      // pehle email confirm karni hai.
      if (res.data?.verificationRequired) {
        navigate("/login?verify=1", { replace: true });
        return;
      }

      // Warna token httpOnly cookie mein set ho chuka hai — yahan sirf user info.
      const { user } = parseAuthResponse(res.data);
      if (user) {
        saveAuth({ user });
        navigate(homeForRole(user?.role || role), { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    } catch (err) {
      setServerError(
        err?.response?.data?.message ||
          err?.message ||
          "Could not create your account. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-brand-brown [color-scheme:light]">
      <Helmet>
        <title>Sign Up — Kidventures</title>
        <meta
          name="description"
          content="Create a Kidventures account to book kids' activities, or join as an instructor to teach classes in Dubai."
        />
      </Helmet>

      <Navbar />

      <section className="flex justify-center bg-brand-cream px-5 py-12">
        <div className="w-full max-w-[440px] rounded-[18px] bg-white p-6 shadow-[0_4px_24px_rgba(61,43,31,0.10)] sm:p-8">
          <h1 className="mb-1.5 text-2xl font-bold text-brand-brown">
            Create your account
          </h1>
          <p className="mb-5 text-[13px] text-brand-brown/70">
            Join Kidventures to book or teach classes.
          </p>

          {serverError && (
            <div className="mb-4 rounded-[10px] border border-[#c0392b]/30 bg-[#c0392b]/10 px-4 py-3 text-[13px] text-[#c0392b]">
              {serverError}
            </div>
          )}

          {/* Role toggle */}
          <div className="mb-4 flex rounded-xl bg-brand-cream p-1">
            {[
              { key: "parent", label: "I'm a Parent" },
              { key: "instructor", label: "I'm an Instructor" },
            ].map((r) => (
              <button
                key={r.key}
                onClick={() => {
                  setRole(r.key);
                  setErrors({});
                  setServerError("");
                }}
                className={`flex-1 rounded-[9px] py-2.5 text-[13px] font-bold ${
                  role === r.key
                    ? "bg-brand-orange text-white"
                    : "bg-transparent text-brand-brown"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Instructor note */}
          {role === "instructor" && (
            <div className="mb-5 rounded-[10px] border border-brand-sky/30 bg-brand-sky/10 px-4 py-3 text-[12px] leading-relaxed text-brand-brown/80">
              Create your account now, you&apos;ll add your profile, teaching
              details and verification documents from your dashboard. You can
              publish classes once our team verifies you.
            </div>
          )}

          <Field label="Full name" error={errors.name}>
            <input
              className={inputCls(errors.name)}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Your name"
            />
          </Field>

          <Field label="Email" error={errors.email}>
            <input
              type="email"
              className={inputCls(errors.email)}
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="you@example.com"
            />
          </Field>

          <Field label="Phone number" error={errors.phone}>
            <input
              className={inputCls(errors.phone)}
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+971 ..."
            />
          </Field>

          <Field label="Password" error={errors.password}>
            <input
              type="password"
              className={inputCls(errors.password)}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="At least 8 characters, 1 letter & 1 number"
            />
          </Field>

          <Field label="Confirm password" error={errors.confirm}>
            <input
              type="password"
              className={inputCls(errors.confirm)}
              value={form.confirm}
              onChange={(e) => set("confirm", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Re-enter password"
            />
          </Field>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="mt-1 w-full cursor-pointer rounded-[10px] bg-brand-orange py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>

          <p className="mt-5 text-center text-[13px] text-brand-brown/80">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-bold text-brand-orange no-underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default SignupPage;
