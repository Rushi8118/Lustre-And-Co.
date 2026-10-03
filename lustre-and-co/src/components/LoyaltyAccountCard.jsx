// lustre-and-co/src/components/LoyaltyAccountCard.jsx
import { useEffect, useState } from "react";
import { Crown, Gift, Star, TrendingUp, Wallet } from "lucide-react";
import {
  getLoyaltyAccount,
  getLoyaltyTiers,
  redeemPoints,
  updateBirthday,
} from "../services/loyalty";

const TIER_COLORS = {
  Bronze: { from: "#cd7f32", to: "#a0522d", icon: "🥉" },
  Silver: { from: "#9e9e9e", to: "#757575", icon: "🥈" },
  Gold:   { from: "#c5a059", to: "#9a7a3c", icon: "🥇" },
  VIP:    { from: "#7c3aed", to: "#4c1d95", icon: "💎" },
};

function ProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 100;
  return (
    <div className="loyalty-progress-track">
      <div className="loyalty-progress-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function LoyaltyAccountCard({ onUpdate }) {
  const [account, setAccount] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [redeemInput, setRedeemInput] = useState("");
  const [redeemMsg, setRedeemMsg] = useState(null);
  const [redeeming, setRedeeming] = useState(false);

  const [bdMonth, setBdMonth] = useState("");
  const [bdDay, setBdDay] = useState("");
  const [bdYear, setBdYear] = useState("");
  const [bdMsg, setBdMsg] = useState(null);
  const [savingBd, setSavingBd] = useState(false);

  useEffect(() => {
    Promise.all([getLoyaltyAccount(), getLoyaltyTiers()])
      .then(([acc, t]) => {
        setAccount(acc);
        setTiers(t || []);
        if (acc?.birthdayMonth) setBdMonth(String(acc.birthdayMonth));
        if (acc?.birthdayDay) setBdDay(String(acc.birthdayDay));
        if (acc?.birthdayYear) setBdYear(String(acc.birthdayYear));
      })
      .catch(() => setError("Your loyalty account could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  const tierName = account?.currentTier?.name ?? "Bronze";
  const tierStyle = TIER_COLORS[tierName] ?? TIER_COLORS.Bronze;

  // Find next tier
  const currentTierIdx = tiers.findIndex((t) => t.name === tierName);
  const nextTier = tiers[currentTierIdx + 1] ?? null;
  const progressPts = nextTier ? account?.lifetimePoints ?? 0 : 0;
  const progressMax = nextTier?.minLifetimePoints ?? 1;

  async function handleRedeem(e) {
    e.preventDefault();
    const pts = parseInt(redeemInput, 10);
    if (!pts || pts <= 0) { setRedeemMsg({ ok: false, text: "Enter a valid number of points." }); return; }
    setRedeeming(true); setRedeemMsg(null);
    try {
      const updated = await redeemPoints(pts, `redeem-${Date.now()}`);
      setAccount(updated);
      setRedeemInput("");
      setRedeemMsg({ ok: true, text: `Converted ${pts} points to ₹${(pts * (account?.currentTier ? 1 : 1)).toFixed(2)} wallet balance.` });
      onUpdate?.();
    } catch (err) {
      setRedeemMsg({ ok: false, text: err.response?.data?.message ?? "Could not redeem points." });
    } finally { setRedeeming(false); }
  }

  async function handleSaveBirthday(e) {
    e.preventDefault();
    setSavingBd(true); setBdMsg(null);
    try {
      const updated = await updateBirthday({ month: Number(bdMonth), day: Number(bdDay), year: Number(bdYear) });
      setAccount(updated);
      setBdMsg({ ok: true, text: "Birthday saved. You'll receive points on your special day! 🎂" });
    } catch (err) {
      setBdMsg({ ok: false, text: err.response?.data?.message ?? "Could not save birthday." });
    } finally { setSavingBd(false); }
  }

  if (loading) return <div className="loyalty-card loyalty-card--loading"><span className="app-boot-mark">✦</span><p>Loading rewards…</p></div>;
  if (error) return <div className="loyalty-card loyalty-card--error"><p>{error}</p></div>;

  return (
    <div className="loyalty-card">
      {/* Tier header */}
      <div className="loyalty-tier-banner" style={{ background: `linear-gradient(135deg, ${tierStyle.from}, ${tierStyle.to})` }}>
        <div className="loyalty-tier-badge">
          <span className="loyalty-tier-icon">{tierStyle.icon}</span>
          <div>
            <p className="loyalty-tier-label">Member Status</p>
            <h2 className="loyalty-tier-name">{tierName}</h2>
          </div>
        </div>
        <div className="loyalty-points-display">
          <span className="loyalty-points-value">{(account?.availablePoints ?? 0).toLocaleString()}</span>
          <span className="loyalty-points-unit">points</span>
        </div>
      </div>

      {/* Tier progress */}
      {nextTier && (
        <div className="loyalty-progress-wrap">
          <div className="loyalty-progress-labels">
            <span>{tierName}</span>
            <span>{nextTier.name} ({nextTier.minLifetimePoints.toLocaleString()} pts)</span>
          </div>
          <ProgressBar value={progressPts} max={progressMax} color={tierStyle.from} />
          <p className="loyalty-progress-hint">
            {Math.max(0, progressMax - progressPts).toLocaleString()} more points to {nextTier.name}
          </p>
        </div>
      )}

      {/* Stats row */}
      <div className="loyalty-stats-row">
        <div className="loyalty-stat">
          <Wallet size={18} className="loyalty-stat-icon" />
          <span className="loyalty-stat-label">Wallet</span>
          <strong className="loyalty-stat-value">₹{Number(account?.walletBalance ?? 0).toFixed(2)}</strong>
        </div>
        <div className="loyalty-stat">
          <TrendingUp size={18} className="loyalty-stat-icon" />
          <span className="loyalty-stat-label">Lifetime</span>
          <strong className="loyalty-stat-value">{(account?.lifetimePoints ?? 0).toLocaleString()} pts</strong>
        </div>
        <div className="loyalty-stat">
          <Star size={18} className="loyalty-stat-icon" />
          <span className="loyalty-stat-label">Redeemed</span>
          <strong className="loyalty-stat-value">{(account?.redeemedPoints ?? 0).toLocaleString()} pts</strong>
        </div>
      </div>

      {/* Tier benefits */}
      {account?.currentTier?.benefits?.length > 0 && (
        <div className="loyalty-benefits">
          <h3 className="loyalty-section-title">
            <Crown size={15} /> {tierName} Benefits
          </h3>
          <ul className="loyalty-benefits-list">
            {account.currentTier.benefits.map((b) => (
              <li key={b}><span className="loyalty-benefit-dot">✦</span>{b}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Redeem points */}
      <div className="loyalty-redeem-section">
        <h3 className="loyalty-section-title"><Wallet size={15} /> Convert Points to Wallet</h3>
        <p className="loyalty-section-sub">Redeem your points as store credit for any future order.</p>
        <form onSubmit={handleRedeem} className="loyalty-redeem-form">
          <input
            id="loyalty-redeem-input"
            type="number"
            min="1"
            max={account?.availablePoints ?? 0}
            placeholder="Enter points to convert"
            value={redeemInput}
            onChange={(e) => setRedeemInput(e.target.value)}
            className="loyalty-input"
          />
          <button type="submit" className="button button-gold button-sm" disabled={redeeming || (account?.availablePoints ?? 0) === 0}>
            {redeeming ? "Converting…" : "Convert"}
          </button>
        </form>
        {redeemMsg && <p className={`loyalty-feedback ${redeemMsg.ok ? "ok" : "err"}`}>{redeemMsg.text}</p>}
      </div>

      {/* Birthday */}
      <div className="loyalty-birthday-section">
        <h3 className="loyalty-section-title"><Gift size={15} /> Birthday Reward</h3>
        <p className="loyalty-section-sub">Add your birthday to receive bonus points every year on your special day.</p>
        <form onSubmit={handleSaveBirthday} className="loyalty-birthday-form">
          <input id="loyalty-bd-month" type="number" min="1" max="12" placeholder="MM" value={bdMonth} onChange={(e) => setBdMonth(e.target.value)} className="loyalty-input loyalty-input--sm" />
          <input id="loyalty-bd-day"   type="number" min="1" max="31" placeholder="DD" value={bdDay}   onChange={(e) => setBdDay(e.target.value)}   className="loyalty-input loyalty-input--sm" />
          <input id="loyalty-bd-year"  type="number" min="1900" max="2100" placeholder="YYYY" value={bdYear}  onChange={(e) => setBdYear(e.target.value)}  className="loyalty-input loyalty-input--sm" />
          <button type="submit" className="button button-dark button-sm" disabled={savingBd}>
            {savingBd ? "Saving…" : "Save"}
          </button>
        </form>
        {bdMsg && <p className={`loyalty-feedback ${bdMsg.ok ? "ok" : "err"}`}>{bdMsg.text}</p>}
      </div>
    </div>
  );
}
