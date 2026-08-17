import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://api.mindchuk.co.in",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// We store a reference to the refreshAccessToken fn from AuthContext
// to avoid circular imports. Set it from AuthProvider on mount.
let _refreshFn = null;
let _clearAuthFn = null;
let isRefreshing = false;
let failedQueue = [];

export function registerAuthHandlers(refreshFn, clearAuthFn) {
  _refreshFn = refreshFn;
  _clearAuthFn = clearAuthFn;
}

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    // Skip refresh for the refresh endpoint itself to avoid infinite loops
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/signin")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        if (!_refreshFn) throw new Error("No refresh handler registered");
        const newToken = await _refreshFn();
        processQueue(null, newToken);
        originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (_clearAuthFn) _clearAuthFn();
        window.location.href = "/signin";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;