import { useState } from "react";
import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
import api, { getErrorMessage } from "../services/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const { settings } = useSettings();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err, "This reset link is invalid or has expired."));
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
              Account security
            </span>
            <h1>
              Choose a new
              <br />
              <em>password.</em>
            </h1>
            <p>Reset links can be used once and expire after one hour.</p>
          </div>
          <div className="auth-brand-footer">
            <span>
              © {new Date().getFullYear()} {settings.store.name}
            </span>
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
            {!token ? (
              <div className="auth-success-state">
                <h2>Reset link missing</h2>
                <p>Please open the full link from your reset email, or request a new one.</p>
                <Link to="/account/forgot-password" className="button button-dark">
                  Request a new link
                </Link>
              </div>
            ) : done ? (
              <div className="auth-success-state">
                <div className="auth-success-icon">✓</div>
                <h2>Password updated.</h2>
                <p>You can now sign in with your new password.</p>
                <Link to="/account/login" className="button button-dark">
                  Sign in
                </Link>
              </div>
            ) : (
              <>
                <div className="auth-form-heading">
                  <span className="auth-form-eyebrow">Reset password</span>
                  <h2>Set your new password.</h2>
                </div>
                <form className="auth-modern-form" onSubmit={submit}>
                  <label className="auth-field">
                    <span>New password</span>
                    <div className="auth-input-wrap">
                      <LockKeyhole size={17} className="auth-input-icon" />
                      <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                  </label>
                  <label className="auth-field">
                    <span>Confirm new password</span>
                    <div className="auth-input-wrap">
                      <LockKeyhole size={17} className="auth-input-icon" />
                      <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                    </div>
                  </label>
                  {error && <p className="auth-form-error">{error}</p>}
                  <button className="auth-submit-button" type="submit" disabled={isSubmitting}>
                    <span>{isSubmitting ? "Saving…" : "Update password"}</span>
                    <ArrowRight size={17} />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
