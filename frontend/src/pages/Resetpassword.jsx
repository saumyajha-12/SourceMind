import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../Authcontext";
import {
  AuthLayout, FormField, InputWithIcon, ErrorBanner, SuccessBanner, SubmitButton, extractError,
} from "../Components/Authui";

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  const prefillEmail = location.state?.email || "";
  const [form, setForm] = useState({ email: prefillEmail, token: "", newPassword: "" });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validate = () => {
    const e = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email address";
    if (!form.token.trim()) e.token = "Reset code is required";
    if (form.newPassword.length < 8) e.newPassword = "Password must be at least 8 characters";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(""); setSuccess("");
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const data = await resetPassword({ email: form.email, token: form.token, newPassword: form.newPassword });
      setSuccess(data.message || "Password reset successful! Redirecting to sign in…");
      setTimeout(() => navigate("/signin", { state: { email: form.email } }), 2000);
    } catch (err) {
      setApiError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: "" }));
  };

  return (
    <AuthLayout
      icon={ShieldCheckIcon}
      title="New password"
      subtitle="Enter the code from your email and choose a new password"
      footer={
        <>
          <Link to="/signin" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            ← Back to sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField label="Email" error={errors.email}>
          <InputWithIcon
            icon={EnvelopeIcon}
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={set("email")}
            error={errors.email}
            autoComplete="email"
          />
        </FormField>

        <FormField label="Reset code" error={errors.token}>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={form.token}
            onChange={set("token")}
            autoComplete="one-time-code"
            className={`w-full bg-zinc-800 border text-white text-sm rounded-lg px-4 py-2.5 placeholder-zinc-600 tracking-[0.4em] text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${errors.token ? "border-red-500/60" : "border-zinc-700"}`}
          />
        </FormField>

        <FormField label="New password" error={errors.newPassword}>
          <InputWithIcon
            icon={LockClosedIcon}
            type={showPassword ? "text" : "password"}
            placeholder="Min. 8 characters"
            value={form.newPassword}
            onChange={set("newPassword")}
            error={errors.newPassword}
            autoComplete="new-password"
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-zinc-500 hover:text-zinc-300 transition"
              >
                {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            }
          />
        </FormField>

        <ErrorBanner message={apiError} />
        <SuccessBanner message={success} />

        <SubmitButton loading={loading} loadingText="Resetting password…">
          Reset password
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}