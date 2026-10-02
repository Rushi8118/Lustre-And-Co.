import axios from "axios";

export const TOKEN_KEY = "lustre_token";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json"
  }
});

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

// Attach the JWT for signed-in users
api.interceptors.request.use((config) => {
  const token = readToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalize error messages and surface expired sessions to the app
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const raw = error.response?.data?.message;
    error.userMessage = Array.isArray(raw)
      ? raw.join(" ")
      : raw ||
        (error.response
          ? "Something went wrong. Please try again."
          : "We can't reach the store server right now. Please check your connection and try again.");

    const isAuthAttempt = /\/auth\/(login|register)/.test(error.config?.url || "");
    if (error.response?.status === 401 && readToken() && !isAuthAttempt) {
      window.dispatchEvent(new Event("lustre:session-expired"));
    }

    return Promise.reject(error);
  }
);

export function getErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  return error?.userMessage || fallback;
}

export default api;
