import { useEffect, useState } from "react";

/**
 * Placeholder shown while a page's code chunk is downloading.
 *
 * It waits a moment before appearing: most chunks arrive faster than that, and
 * a spinner that flashes for 150ms reads as a stutter rather than as progress.
 */
export default function PageLoader({ fullScreen = false, delay = 220 }) {
  const [visible, setVisible] = useState(delay === 0);

  useEffect(() => {
    if (delay === 0) return undefined;
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!visible) return null;

  return (
    <div
      className={`page-loader ${fullScreen ? "page-loader-full" : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className="page-loader-spinner" aria-hidden="true" />
      <span className="visually-hidden">Loading…</span>
    </div>
  );
}
