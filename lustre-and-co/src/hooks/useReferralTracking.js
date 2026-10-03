// lustre-and-co/src/hooks/useReferralTracking.js
import { useEffect } from "react";
import { trackReferral } from "../services/loyalty";

const SESSION_KEY = "lustre_referral_session";

function getReferralSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

export default function useReferralTracking() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("ref") || params.get("referral") || params.get("referralCode");
    if (!code) return;

    // Persist so it can be applied at registration
    try { localStorage.setItem("lustre_referral_code", code); } catch { /* ignore */ }

    void trackReferral(code, {
      sessionId: getReferralSessionId(),
      landingPage: window.location.href,
    }).catch(() => null); // never break the storefront
  }, []);

  return null;
}
