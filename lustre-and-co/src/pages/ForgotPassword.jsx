import { useState } from "react";
import { ArrowLeft, ArrowRight, Mail, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
import api, { getErrorMessage } from "../services/api";

export default function ForgotPassword() {
  const { settings } = useSettings();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (!email.trim()) return;
    setIsSubmitting(true);
    setError("");
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setSubmitted(true);
    } catch (err) {
      setError(getErrorMessage(err, "We couldn't process that request."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-layout">
        <div className="auth-brand-panel">
          <Link to="/" className="auth-logo">
            {settings.store.name}
          </Link>

          <div className="auth-brand-copy">
            <span className="auth-kicker">
              <Sparkles size={14} />
              A little help
            </span>
            <h1>
              Find your way
              <br />
              <em>back to shine.</em>
            </h1>
            <p>Enter the email connected to your account and we’ll send you a secure link to reset your password.</p>
          </div>

          <div className="auth-brand-footer">
            <span>
              © {new Date().getFullYear()} {settings.store.name}
            </span>
            <span>Secure account access.</span>
          </div>
        </div>

        <div className="auth-form-panel">
          <div className="auth-form-panel-top">
            <Link to="/" className="auth-mobile-logo">
              {settings.store.name}
            </Link>
            <Link to="/account/login" className="auth-form-switch">
              Return to sign in
            </Link>
          </div>

          <div className="auth-form-content">
            {!submitted ? (
              <>
                <div className="auth-form-heading">
                  <span className="auth-form-eyebrow">Reset password</span>
                  <h2>Let’s get you back in.</h2>
                  <p>We’ll send a password-reset link to your registered email address.</p>
                </div>

                <form className="auth-modern-form" onSubmit={submit}>
                  <label className="auth-field">
                    <span>Email address</span>
                    <div className="auth-input-wrap">
                      <Mail size={17} className="auth-input-icon" />
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                      />
                    </div>
                  </label>

                  {error && <p className="auth-form-error">{error}</p>}

                  <button className="auth-submit-button" type="submit" disabled={isSubmitting}>
                    <span>{isSubmitting ? "Sending…" : "Send reset link"}</span>
                    <ArrowRight size={17} />
                  </button>
                </form>
              </>
            ) : (
              <div className="auth-success-state">
                <div className="auth-success-icon">✓</div>
                <span className="auth-form-eyebrow">Check your inbox</span>
                <h2>Request received.</h2>
                <p>
                  If an account exists for <strong>{email}</strong>, a password reset link has been issued. It is valid
                  for one hour.
                </p>
                <Link to="/account/login" className="button button-dark">
                  <ArrowLeft size={16} />
                  Return to sign in
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
