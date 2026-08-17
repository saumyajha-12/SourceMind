import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { EnvelopeIcon, KeyIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../Authcontext";
import {
  AuthLayout, FormField, InputWithIcon, ErrorBanner, SuccessBanner, SubmitButton, extractError,
} from "../Components/Authui";

export default function ForgotPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();

  const prefillEmail = location.state?.email || "";
  const [email, setEmail] = useState(prefillEmail);
  const [emailError, setEmailError] = useState("");
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(""); setSuccess(""); setEmailError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      const data = await forgotPassword({ email });
      setSuccess(data.message || "If this email exists, a reset code has been sent.");
      setTimeout(() => navigate("/reset-password", { state: { email } }), 2000);
    } catch (err) {
      setApiError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={KeyIcon}
      title="Reset password"
      subtitle="We'll send a reset code to your email"
      footer={
        <>
          Remember your password?{" "}
          <Link to="/signin" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField label="Email" error={emailError}>
          <InputWithIcon
            icon={EnvelopeIcon}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
            error={emailError}
            autoComplete="email"
          />
        </FormField>

        <ErrorBanner message={apiError} />
        <SuccessBanner message={success} />

        <SubmitButton loading={loading} loadingText="Sending code…">
          Send reset code
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}