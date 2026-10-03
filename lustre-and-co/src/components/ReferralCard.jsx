// lustre-and-co/src/components/ReferralCard.jsx
import { useEffect, useState } from "react";
import { Copy, Gift, Link2, Users } from "lucide-react";
import { applyReferralCode, getReferralSummary } from "../services/loyalty";

export default function ReferralCard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [applyMsg, setApplyMsg] = useState(null);
  const [applying, setApplying] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getReferralSummary()
      .then(setSummary)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const referralLink = summary?.referralCode
    ? `${window.location.origin}/?ref=${encodeURIComponent(summary.referralCode)}`
    : null;

  async function copyLink() {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setApplyMsg({ ok: false, text: "Copying is not supported in this browser." });
    }
  }

  async function handleApply(e) {
    e.preventDefault();
    if (!code.trim()) return;
    setApplying(true); setApplyMsg(null);
    try {
      await applyReferralCode(code.trim());
      setCode("");
      setApplyMsg({ ok: true, text: "Referral code applied! You'll receive points after your first qualifying order." });
    } catch (err) {
      setApplyMsg({ ok: false, text: err.response?.data?.message ?? "The referral code could not be applied." });
    } finally { setApplying(false); }
  }

  if (loading) return null;

  return (
    <div className="referral-card">
      <div className="referral-card-header">
        <Users size={20} className="referral-card-icon" />
        <div>
          <h3 className="referral-card-title">Invite Friends, Earn Rewards</h3>
          <p className="referral-card-sub">Share your unique referral link and earn points when your friend completes their first order.</p>
        </div>
      </div>

      {summary?.referralCode && (
        <>
          <div className="referral-code-display">
            <span className="referral-code-value">{summary.referralCode}</span>
            <button type="button" className="referral-copy-btn" onClick={copyLink} aria-label="Copy referral link">
              <Copy size={15} />
              <span>{copied ? "Copied!" : "Copy Link"}</span>
            </button>
          </div>

          <div className="referral-stats-row">
            <div className="referral-stat">
              <Link2 size={16} />
              <span>{summary.total} link{summary.total !== 1 ? "s" : ""} clicked</span>
            </div>
            <div className="referral-stat referral-stat--success">
              <Gift size={16} />
              <span>{summary.rewarded} reward{summary.rewarded !== 1 ? "s" : ""} earned</span>
            </div>
          </div>
        </>
      )}

      <div className="referral-divider" />

      <div className="referral-apply-section">
        <h4>Have a referral code from a friend?</h4>
        <form onSubmit={handleApply} className="referral-apply-form">
          <input
            id="referral-code-input"
            type="text"
            placeholder="LUSTRE-XXXXXXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="loyalty-input"
            maxLength={20}
          />
          <button type="submit" className="button button-dark button-sm" disabled={applying}>
            {applying ? "Applying…" : "Apply Code"}
          </button>
        </form>
        {applyMsg && <p className={`loyalty-feedback ${applyMsg.ok ? "ok" : "err"}`}>{applyMsg.text}</p>}
      </div>
    </div>
  );
}
