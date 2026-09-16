import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStore } from "../context/StoreContext";

/**
 * Landing page for the Google sign-in redirect: the API sends the browser here
 * with ?token=..., which is exchanged for the signed-in profile.
 */
export default function OAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { signInWithToken } = useStore();
  const [error, setError] = useState("");
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const token = params.get("token");
    if (!token) {
      navigate("/account/login", { replace: true });
      return;
    }

    signInWithToken(token)
      .then((user) => navigate(user?.role === "admin" ? "/admin" : "/account", { replace: true }))
      .catch(() => setError("We could not complete your Google sign-in. Please try again."));
  }, [params, navigate, signInWithToken]);

  return (
    <main className="auth-page auth-page-simple">
      <div className="auth-callback-card">
        {error ? (
          <>
            <h2>Sign-in failed</h2>
            <p>{error}</p>
            <button type="button" className="auth-submit-button" onClick={() => navigate("/account/login")}>
              <span>Back to sign in</span>
            </button>
          </>
        ) : (
          <>
            <span className="auth-callback-spinner" aria-hidden="true" />
            <h2>Signing you in…</h2>
            <p>One moment while we finish setting up your session.</p>
          </>
        )}
      </div>
    </main>
  );
}
