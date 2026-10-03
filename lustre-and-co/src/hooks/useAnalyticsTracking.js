import { useEffect } from "react";
import { trackAnalyticsEvent } from "../services/analytics";

function getSessionId() {
  const key = "lustre_analytics_session";

  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;

    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    sessionStorage.setItem(key, id);
    return id;
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function getDeviceType() {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth;

  if (width < 600) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export default function useAnalyticsTracking() {
  useEffect(() => {
    const event = {
      eventType: "page_view",
      sessionId: getSessionId(),
      pagePath: window.location.pathname,
      deviceType: getDeviceType(),
      browser: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      operatingSystem: typeof navigator !== "undefined" ? navigator.platform : undefined,
    };

    void trackAnalyticsEvent(event).catch(() => {
      // Analytics must never interrupt storefront UX
    });
  }, []);
}

export { getSessionId, getDeviceType };
