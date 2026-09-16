/** Lightweight placeholder shown while a page's code chunk is downloading. */
export default function PageLoader({ fullScreen = false }) {
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
