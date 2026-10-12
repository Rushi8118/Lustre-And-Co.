import React from "react";

/**
 * Catches render-time errors so one bad component cannot blank the whole site.
 *
 * Without this, a single undefined field on one product (several product fields
 * are optional on the admin form) unmounts the entire React tree and the visitor
 * is left staring at a white page with no way back.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Keep the detail in the console for debugging; shoppers only see the notice.
    console.error("Unhandled UI error:", error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    // A new route should get a clean slate, otherwise the notice sticks forever.
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <section className="section">
        <div className="container" style={{ textAlign: "center", maxWidth: "32rem" }}>
          <h1 style={{ marginBottom: "0.75rem" }}>Something went wrong</h1>
          <p style={{ marginBottom: "1.5rem" }}>
            We could not display this page. Please try again, or head back to the
            homepage to keep browsing.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="button button-dark"
              onClick={() => this.setState({ hasError: false })}
            >
              Try again
            </button>
            <a className="button button-light" href="/">
              Back to homepage
            </a>
          </div>
        </div>
      </section>
    );
  }
}
