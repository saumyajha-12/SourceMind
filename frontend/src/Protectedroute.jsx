import { Navigate } from "react-router-dom";
import { useAuth } from "./Authcontext";

// Full-page loading spinner shared by both guards
function AuthSpinner() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-xs text-zinc-600 tracking-widest uppercase">Loading</p>
      </div>
    </div>
  );
}

/** Wrap protected app routes — redirects to /signin if not authenticated */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, authChecked } = useAuth();
  if (!authChecked) return <AuthSpinner />;
  if (!isAuthenticated) return <Navigate to="/signin" replace />;
  return children;
}

/** Wrap auth pages — redirects authenticated users away to dashboard */
export function GuestRoute({ children }) {
  const { isAuthenticated, authChecked } = useAuth();
  if (!authChecked) return <AuthSpinner />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}