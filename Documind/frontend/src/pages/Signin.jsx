import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../Authcontext";
import {
  AuthLayout,
  FormField,
  InputWithIcon,
  ErrorBanner,
  SubmitButton,
  extractError,
} from "../Components/Authui";

export default function SignIn() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signin, isAuthenticated } = useAuth();

  const prefillEmail = location.state?.email || "";

  const [form, setForm] = useState({
    email: prefillEmail,
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const validate = () => {
    const e = {};

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = "Enter a valid email address";
    }

    if (!form.password) {
      e.password = "Password is required";
    }

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
      await signin({
        email: form.email,
        password: form.password,
      });

      navigate("/");
    } catch (err) {
      const message = extractError(err);

      if (message === "Please verify your email first") {
        setApiError("Please verify your email first. Redirecting...");

        setTimeout(() => {
          navigate("/verify-email", {
            state: {
              email: form.email,
            },
          });
        }, 2000);

        return;
      }

      setApiError(message);
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => {
    setForm((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: "",
    }));
  };

  return (
    <AuthLayout
      icon={LockClosedIcon}
      title="Welcome back"
      subtitle="Sign in to continue"
      footer={
        <>
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            Sign up
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

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-zinc-400 tracking-wide uppercase">
              Password
            </span>

            <Link
              to="/forgot-password"
              state={{ email: form.email }}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <InputWithIcon
            icon={LockClosedIcon}
            type={showPassword ? "text" : "password"}
            placeholder="Your password"
            value={form.password}
            onChange={set("password")}
            error={errors.password}
            autoComplete="current-password"
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-zinc-500 hover:text-zinc-300 transition"
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
              </button>
            }
          />

          {errors.password && (
            <p className="mt-1.5 text-xs text-red-400">{errors.password}</p>
          )}
        </div>

        <ErrorBanner message={apiError} />

        <SubmitButton loading={loading} loadingText="Signing in…">
          Sign in
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}