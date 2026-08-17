import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { EnvelopeIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../Authcontext";
import {
  AuthLayout,
  FormField,
  InputWithIcon,
  ErrorBanner,
  SuccessBanner,
  SubmitButton,
  extractError,
} from "../Components/Authui";

const RESEND_COOLDOWN = 60;
const DEFAULT_OTP_EXPIRY_SECONDS = 10 * 60;

function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyEmail, resendVerificationOtp } = useAuth();

  const prefillEmail = location.state?.email || "";
  const initialExpirySeconds =
    location.state?.otpExpiresInSeconds || DEFAULT_OTP_EXPIRY_SECONDS;

  const [form, setForm] = useState({ email: prefillEmail, otp: "" });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);

  const [otpTimeLeft, setOtpTimeLeft] = useState(initialExpirySeconds);

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }

    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    if (otpTimeLeft <= 0) return;

    const t = setTimeout(() => setOtpTimeLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [otpTimeLeft]);

  const validate = () => {
    const e = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = "Enter a valid email address";
    }
    if (!form.otp.trim()) {
      e.otp = "OTP is required";
    } else if (!/^\d{6}$/.test(form.otp.trim())) {
      e.otp = "Enter a valid 6-digit OTP";
    }
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    setSuccess("");

    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    if (otpTimeLeft <= 0) {
      setApiError("OTP expired. Please resend a new code.");
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      await verifyEmail({ email: form.email, otp: form.otp });
      setSuccess("Email verified! Redirecting to sign in…");
      setTimeout(() => navigate("/signin", { state: { email: form.email } }), 1500);
    } catch (err) {
      setApiError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setApiError("");
    setSuccess("");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setErrors((prev) => ({ ...prev, email: "Enter a valid email address" }));
      return;
    }

    setResending(true);

    try {
      const data = await resendVerificationOtp({ email: form.email });

      setCountdown(RESEND_COOLDOWN);
      setCanResend(false);
      setOtpTimeLeft(data.expiresInSeconds || DEFAULT_OTP_EXPIRY_SECONDS);
      setForm((prev) => ({ ...prev, otp: "" }));
      setSuccess(data.message || "A new OTP has been sent to your email.");
    } catch (err) {
      setApiError(extractError(err));
    } finally {
      setResending(false);
    }
  };

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: "" }));
  };

  return (
    <AuthLayout
      icon={ShieldCheckIcon}
      title="Verify your email"
      subtitle={
        form.email
          ? `We sent a 6-digit code to ${form.email}`
          : "Enter the OTP sent to your email"
      }
      footer={
        <Link
          to="/signin"
          className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
        >
          ← Back to sign in
        </Link>
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

        <div className="rounded-lg border border-zinc-700 bg-zinc-900/70 px-4 py-3 text-sm">
          <p className="text-zinc-300">
            Current OTP valid for{" "}
            <span className="font-semibold text-indigo-400">
              {formatTime(otpTimeLeft)}
            </span>
          </p>
          {otpTimeLeft <= 0 && (
            <p className="mt-1 text-red-400">This OTP has expired. Please resend a new code.</p>
          )}
        </div>

        <FormField label="One-time code" error={errors.otp}>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={form.otp}
            onChange={set("otp")}
            autoComplete="one-time-code"
            className={`w-full bg-zinc-800 border text-white text-sm rounded-lg px-4 py-2.5 placeholder-zinc-600 tracking-[0.4em] text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${
              errors.otp ? "border-red-500/60" : "border-zinc-700"
            }`}
          />
        </FormField>

        <ErrorBanner message={apiError} />
        <SuccessBanner message={success} />

        <SubmitButton loading={loading} loadingText="Verifying…">
          Verify email
        </SubmitButton>

        <div className="text-center pt-1">
          {canResend ? (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium disabled:opacity-50"
            >
              {resending ? "Resending..." : "Resend code"}
            </button>
          ) : (
            <p className="text-xs text-zinc-600">
              Resend code in{" "}
              <span className="text-zinc-400 tabular-nums">{countdown}s</span>
            </p>
          )}
        </div>
      </form>
    </AuthLayout>
  );
}