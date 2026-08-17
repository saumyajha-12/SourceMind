import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api, { registerAuthHandlers } from "./Api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessToken, setAccessTokenState] = useState(null);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const setAccessToken = useCallback((token) => {
    setAccessTokenState(token);
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common["Authorization"];
    }
  }, []);

  const clearAuth = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, [setAccessToken]);

  const refreshAccessToken = useCallback(async () => {
    const { data } = await api.post("api/auth/refresh", {}, { withCredentials: true });
    setAccessToken(data.accessToken);
    return data.accessToken;
  }, [setAccessToken]);

  useEffect(() => {
    registerAuthHandlers(refreshAccessToken, clearAuth);
  }, [refreshAccessToken, clearAuth]);

  useEffect(() => {
    const restore = async () => {
      try {
        const { data } = await api.post("api/auth/refresh", {}, { withCredentials: true });
        setAccessToken(data.accessToken);
        setUser({ restored: true });
      } catch {
      } finally {
        setAuthChecked(true);
      }
    };
    restore();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signup = async ({ email, password }) => {
    const { data } = await api.post("api/auth/signup", { email, password });
    return data;
  };

  const resendVerificationOtp = async ({ email }) => {
    const { data } = await api.post("api/auth/resend-verification-otp", { email });
    return data;
  };

  const verifyEmail = async ({ email, otp }) => {
    const { data } = await api.post("api/auth/verify-email", { email, otp });
    return data;
  };

  const signin = async ({ email, password }) => {
    const { data } = await api.post("api/auth/signin", { email, password }, { withCredentials: true });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try {
      await api.post("api/auth/logout", {}, { withCredentials: true });
    } finally {
      clearAuth();
    }
  };

  const forgotPassword = async ({ email }) => {
    const { data } = await api.post("api/auth/forgot-password", { email });
    return data;
  };

  const resetPassword = async ({ email, token, newPassword }) => {
    const { data } = await api.post("api/auth/reset-password", { email, token, newPassword });
    return data;
  };

  const isAuthenticated = !!accessToken && !!user;

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        user,
        isAuthenticated,
        authChecked,
        setAccessToken,
        clearAuth,
        signup,
        resendVerificationOtp,
        verifyEmail,
        signin,
        logout,
        forgotPassword,
        resetPassword,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}