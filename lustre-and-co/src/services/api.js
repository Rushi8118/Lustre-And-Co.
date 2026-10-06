import axios from "axios";

export const SESSION_HINT_KEY = "lustre_session_hint";
export const AUTH_TOKEN_KEY = "lustre_auth_token";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  headers: {
    "Content-Type": "application/json"
  },
  withCredentials: true
});

export function setAuthToken(token) {
  try {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {}
}

export function getAuthToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

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
    return localStorage.getItem(SESSION_HINT_KEY) === "1" || Boolean(getAuthToken());
  } catch {
    return false;
  }
}

// Request interceptor: attach Bearer token if present (alongside withCredentials for cookies)
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Concurrent 401s share one refresh request.
let refreshPromise = null;

function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${api.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        if (res.data?.token) {
          setAuthToken(res.data.token);
        }
        return res;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Response interceptor: refresh session once on 401, then retry the request.
api.interceptors.response.use(
  (response) => {
    // If backend issued a new token in response body, save it
    if (response.data?.token) {
      setAuthToken(response.data.token);
    }
    return response;
  },
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
        // Update header with fresh token if available
        const freshToken = getAuthToken();
        if (freshToken) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${freshToken}`;
        }
        return api(originalRequest);
      } catch {
        // Only tell signed-in users their session ended; guests get no notice.
        if (hasSessionHint()) {
          setSessionHint(false);
          setAuthToken(null);
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
