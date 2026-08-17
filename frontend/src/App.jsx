import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./Authcontext";
import { ProtectedRoute,GuestRoute } from "./Protectedroute";

import SignUp from "./pages/Signup";
import SignIn from "./pages/Signin";
import VerifyEmail from "./pages/Verifyemail";
import ForgotPassword from "./pages/Forgotpassword";
import ResetPassword from "./pages/Resetpassword";

import Chat from "./pages/Chat";
import LatestNews from "./Components/LatestNews";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Root */}
          <Route path="/" element={<Navigate to="/chat" replace />} />

          {/* Guest-only auth routes */}
          <Route
            path="/signup"
            element={
              <GuestRoute>
                <SignUp />
              </GuestRoute>
            }
          />
          <Route
            path="/signin"
            element={
              <GuestRoute>
                <SignIn />
              </GuestRoute>
            }
          />
          <Route
            path="/verify-email"
            element={
              <GuestRoute>
                <VerifyEmail />
              </GuestRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <GuestRoute>
                <ForgotPassword />
              </GuestRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <GuestRoute>
                <ResetPassword />
              </GuestRoute>
            }
          />

          {/* Protected app routes */}
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />

          <Route
            path="/chat/:chatId"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />

          <Route
            path="/latest-news"
            element={
              <ProtectedRoute>
                <LatestNews />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}