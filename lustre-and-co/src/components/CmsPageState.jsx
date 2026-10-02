import { Link } from "react-router-dom";

export default function CmsPageState({ status, error }) {
  if (status === "loading") {
    return (
      <section className="section">
        <div className="container">
          <p className="catalog-loading">Loading…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container empty-state">
        <span className="empty-icon">✦</span>
        <h1>{status === "not-found" ? "This page isn’t available" : "Something went wrong"}</h1>
        <p>{status === "not-found" ? "It may have been unpublished. Please check back soon." : error}</p>
        <Link to="/" className="button button-dark">
          Back to home
        </Link>
      </div>
    </section>
  );
}
