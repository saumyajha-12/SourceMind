// Shared layout wrapper for all auth pages
export function AuthLayout({ icon: Icon, title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-125 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-600 mb-4">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-zinc-500">{subtitle}</p>}
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl shadow-black/40">
          {children}
        </div>

        {/* Footer links */}
        {footer && <div className="mt-6 text-center text-sm text-zinc-500">{footer}</div>}
      </div>
    </div>
  );
}

// ── Form primitives ──────────────────────────────────────────────────────────

export function FieldLabel({ children }) {
  return (
    <label className="block text-xs font-medium text-zinc-400 mb-1.5 tracking-wide uppercase">
      {children}
    </label>
  );
}

export function InputWithIcon({ icon: Icon, rightElement, error, ...props }) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
      )}
      <input
        {...props}
        className={`w-full bg-zinc-800 border text-white text-sm rounded-lg py-2.5 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition
          ${Icon ? "pl-9" : "pl-4"}
          ${rightElement ? "pr-10" : "pr-4"}
          ${error ? "border-red-500/60" : "border-zinc-700"}`}
      />
      {rightElement && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>
      )}
    </div>
  );
}

export function FormField({ label, error, children }) {
  return (
    <div>
      {label && <FieldLabel>{label}</FieldLabel>}
      {children}
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
      {message}
    </p>
  );
}

export function SuccessBanner({ message }) {
  if (!message) return null;
  return (
    <p className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-3 py-2">
      {message}
    </p>
  );
}

export function SubmitButton({ loading, children, loadingText, disabled }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2.5 mt-1 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-zinc-900 flex items-center justify-center gap-2"
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
      )}
      {loading ? (loadingText || "Loading…") : children}
    </button>
  );
}

// Helper: extract clean error message from axios error
export function extractError(err) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    "Something went wrong"
  );
}