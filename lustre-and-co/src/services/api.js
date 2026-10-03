import axios from "axios";

// Session tokens are httpOnly cookies set by the API, so page scripts never see them.
// This flag only records that someone was signed in, so guests skip the profile call.
export const SESSION_HINT_KEY = "lustre_session_hint";
const LEGACY_TOKEN_KEYS = ["lustre_token", "lustre_refresh_token"];

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json"
  },
  withCredentials: true
});

export function setSessionHint(active) {
  try {
    if (active) localStorage.setItem(SESSION_HINT_KEY, "1");
    else localStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    // Storage can be unavailable (private mode); the server cookie still decides.
  }
}

export function hasSessionHint() {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

// Remove tokens that earlier builds kept in localStorage.
try {
  LEGACY_TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
} catch {
  // ignore
}

// Concurrent 401s share one refresh request.
let refreshPromise = null;

function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${api.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Response interceptor: refresh the cookie session once, then retry the request.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const raw = error.response?.data?.message;
    error.userMessage = Array.isArray(raw)
      ? raw.join(" ")
      : raw ||
        (error.response
          ? "Something went wrong. Please try again."
          : "We can't reach the store server right now. Please check your connection and try again.");

    const isAuthPath = /\/auth\/(login|register|refresh|2fa|logout)/.test(originalRequest?.url || "");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthPath) {
      originalRequest._retry = true;
      try {
        await refreshSession();
        return api(originalRequest);
      } catch {
        // Only tell signed-in users their session ended; guests get no notice.
        if (hasSessionHint()) {
          setSessionHint(false);
          window.dispatchEvent(new Event("lustre:session-expired"));
        }
      }
    }

    return Promise.reject(error);
  }
);

export function getErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  return error?.userMessage || fallback;
}

export default api;
