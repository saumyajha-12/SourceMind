import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../Authcontext";
import {
  AuthLayout, FormField, InputWithIcon, ErrorBanner, SubmitButton, extractError,
} from "../Components/Authui";

export default function Signup() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const e = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email address";
    if (form.password.length < 8) e.password = "Password must be at least 8 characters";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const data = await signup({ email: form.email, password: form.password });

      navigate("/verify-email", {
        state: {
          email: form.email,
          otpExpiresInSeconds: data.expiresInSeconds,
        },
      });
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
      icon={UserPlusIcon}
      title="Create account"
      subtitle="Get started for free today"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/signin" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Sign in
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

        <FormField label="Password" error={errors.password}>
          <InputWithIcon
            icon={LockClosedIcon}
            type={showPassword ? "text" : "password"}
            placeholder="Min. 8 characters"
            value={form.password}
            onChange={set("password")}
            error={errors.password}
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

        <SubmitButton loading={loading} loadingText="Creating account…">
          Create account
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}