import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { initAnalytics, trackPageView } from "../services/analytics";

/**
 * Reports a page view on every route change. Single-page apps only trigger one
 * real page load, so without this Google Analytics would record just the entry
 * page and never show where visitors drop off.
 */
export default function AnalyticsTracker() {
  const location = useLocation();
  const isFirstView = useRef(true);

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    // GA already counted the page the visitor landed on.
    if (isFirstView.current) {
      isFirstView.current = false;
      return;
    }
    // Let the page set its title first, then report.
    const timer = setTimeout(() => {
      trackPageView(`${location.pathname}${location.search}`);
    }, 80);
    return () => clearTimeout(timer);
  }, [location.pathname, location.search]);

  return null;
}
