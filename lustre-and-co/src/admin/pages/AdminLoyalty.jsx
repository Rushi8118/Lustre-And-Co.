// lustre-and-co/src/admin/pages/AdminLoyalty.jsx
import { useEffect, useState } from "react";
import {
  Crown,
  RefreshCw,
  Save,
  Settings,
  Star,
  Timer,
  Users
} from "lucide-react";
import {
  adjustCustomerPoints,
  getAdminLoyaltyTiers,
  getLoyaltySettings,
  updateLoyaltySettings,
  updateLoyaltyTier,
} from "../../services/loyalty";

const DEFAULT_SETTINGS = {
  enabled: true,
  pointsPerCurrency: 1,
  currencyUnit: 1,
  reviewPoints: 50,
  referralInviterPoints: 500,
  referralFriendPoints: 250,
  birthdayPoints: 200,
  minimumReferralOrderAmount: 500,
  pointsExpireDays: "",
  birthdayRewardEnabled: true,
  reviewRewardEnabled: true,
  referralRewardEnabled: true,
};

function SettingRow({ label, hint, children }) {
  return (
    <div className="loyalty-admin-row">
      <div className="loyalty-admin-row-label">
        <strong>{label}</strong>
        {hint && <span className="loyalty-admin-hint">{hint}</span>}
      </div>
      <div className="loyalty-admin-row-control">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <label className="loyalty-toggle">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="loyalty-toggle-track">
        <span className="loyalty-toggle-thumb" />
      </span>
    </label>
  );
}

export default function AdminLoyalty() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [tiers, setTiers] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Admin adjust form
  const [adjustUserId, setAdjustUserId] = useState("");
  const [adjustPoints, setAdjustPoints] = useState("");
  const [adjustDesc, setAdjustDesc] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    Promise.all([getLoyaltySettings(), getAdminLoyaltyTiers()])
      .then(([s, t]) => {
        setSettings({ ...DEFAULT_SETTINGS, ...s, pointsExpireDays: s.pointsExpireDays ?? "" });
        setTiers(t || []);
      })
      .catch(() => setLoadError("Could not load loyalty settings. Make sure the SQL migration has been run."));
  }, []);

  function showToast(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  function updateField(key, value) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  async function saveSettings(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await updateLoyaltySettings({
        ...settings,
        pointsPerCurrency: Number(settings.pointsPerCurrency),
        currencyUnit: Number(settings.currencyUnit),
        reviewPoints: Number(settings.reviewPoints),
        referralInviterPoints: Number(settings.referralInviterPoints),
        referralFriendPoints: Number(settings.referralFriendPoints),
        birthdayPoints: Number(settings.birthdayPoints),
        minimumReferralOrderAmount: Number(settings.minimumReferralOrderAmount),
        pointsExpireDays: settings.pointsExpireDays === "" ? null : Number(settings.pointsExpireDays),
      });
      setSettings({ ...saved, pointsExpireDays: saved.pointsExpireDays ?? "" });
      showToast("Loyalty settings saved.");
    } catch (err) {
      showToast(err.response?.data?.message ?? "Could not save settings.", false);
    } finally {
      setSaving(false);
    }
  }

  function updateTierField(id, key, value) {
    setTiers((ts) => ts.map((t) => (t.id === id ? { ...t, [key]: value } : t)));
  }

  async function saveTier(tier) {
    try {
      const saved = await updateLoyaltyTier(tier.id, {
        name: tier.name,
        minLifetimePoints: Number(tier.minLifetimePoints),
        minLifetimeSpend: Number(tier.minLifetimeSpend),
        pointsMultiplier: Number(tier.pointsMultiplier),
        birthdayMultiplier: Number(tier.birthdayMultiplier),
        benefits: typeof tier.benefits === "string"
          ? tier.benefits.split("\n").map((b) => b.trim()).filter(Boolean)
          : tier.benefits || [],
        sortOrder: Number(tier.sortOrder),
        isActive: Boolean(tier.isActive),
      });
      setTiers((ts) => ts.map((t) => (t.id === saved.id ? { ...saved, benefits: saved.benefits || [] } : t)));
      showToast(`${saved.name} tier saved.`);
    } catch (err) {
      showToast(err.response?.data?.message ?? "Could not save tier.", false);
    }
  }

  async function handleAdjustPoints(e) {
    e.preventDefault();
    if (!adjustUserId.trim() || !adjustPoints) return;
    setAdjusting(true);
    try {
      await adjustCustomerPoints({
        userId: adjustUserId.trim(),
        points: Number(adjustPoints),
        description: adjustDesc.trim() || undefined,
      });
      setAdjustUserId("");
      setAdjustPoints("");
      setAdjustDesc("");
      showToast("Points adjusted successfully.");
    } catch (err) {
      showToast(err.response?.data?.message ?? "Could not adjust points.", false);
    } finally {
      setAdjusting(false);
    }
  }

  if (loadError) {
    return (
      <div className="admin-page">
        <h1 className="admin-page-title">Loyalty &amp; Referrals</h1>
        <div className="inline-alert inline-alert-error">{loadError}</div>
      </div>
    );
  }

  return (
    <div className="admin-page admin-loyalty-page">
      {toast && (
        <div className={`admin-loyalty-toast ${toast.ok ? "ok" : "err"}`}>
          {toast.msg}
        </div>
      )}

      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            <Crown size={22} /> Loyalty &amp; Referrals
          </h1>
          <p className="admin-page-subtitle">
            Configure reward points, tiers, referral codes, and birthday rewards.
          </p>
        </div>
      </div>

      {/* Global Settings */}
      <form onSubmit={saveSettings} className="admin-loyalty-section">
        <h2 className="admin-loyalty-section-title">
          <Settings size={16} /> Program Settings
        </h2>

        <SettingRow label="Enable loyalty program" hint="Turns all point earning and redemption on or off.">
          <Toggle checked={settings.enabled} onChange={(e) => updateField("enabled", e.target.checked)} />
        </SettingRow>

        <SettingRow label="Points per currency unit" hint="How many points a customer earns per ₹1 spent (e.g. 1 = 1 point per ₹1).">
          <input type="number" min="0" step="0.01" value={settings.pointsPerCurrency} onChange={(e) => updateField("pointsPerCurrency", e.target.value)} className="admin-input admin-input--sm" />
        </SettingRow>

        <SettingRow label="Currency unit (₹)" hint="The currency amount that corresponds to the points-per-currency rate.">
          <input type="number" min="0.01" step="0.01" value={settings.currencyUnit} onChange={(e) => updateField("currencyUnit", e.target.value)} className="admin-input admin-input--sm" />
        </SettingRow>

        <div className="admin-loyalty-divider" />
        <h3 className="admin-loyalty-sub-title"><Star size={14} /> Reward Amounts</h3>

        <SettingRow label="Points for an approved review">
          <input type="number" min="0" value={settings.reviewPoints} onChange={(e) => updateField("reviewPoints", e.target.value)} className="admin-input admin-input--sm" />
        </SettingRow>
        <SettingRow label="Points for referring a new customer (inviter)">
          <input type="number" min="0" value={settings.referralInviterPoints} onChange={(e) => updateField("referralInviterPoints", e.target.value)} className="admin-input admin-input--sm" />
        </SettingRow>
        <SettingRow label="Points for joining through a referral (friend)">
          <input type="number" min="0" value={settings.referralFriendPoints} onChange={(e) => updateField("referralFriendPoints", e.target.value)} className="admin-input admin-input--sm" />
        </SettingRow>
        <SettingRow label="Birthday points">
          <input type="number" min="0" value={settings.birthdayPoints} onChange={(e) => updateField("birthdayPoints", e.target.value)} className="admin-input admin-input--sm" />
        </SettingRow>
        <SettingRow label="Minimum referral qualifying order (₹)" hint="A referred customer must spend at least this amount for both parties to be rewarded.">
          <input type="number" min="0" value={settings.minimumReferralOrderAmount} onChange={(e) => updateField("minimumReferralOrderAmount", e.target.value)} className="admin-input admin-input--sm" />
        </SettingRow>

        <div className="admin-loyalty-divider" />
        <h3 className="admin-loyalty-sub-title"><Timer size={14} /> Expiration &amp; Toggles</h3>

        <SettingRow label="Points expire after (days)" hint="Leave blank for no expiration.">
          <input type="number" min="1" max="3650" placeholder="No expiration" value={settings.pointsExpireDays} onChange={(e) => updateField("pointsExpireDays", e.target.value)} className="admin-input admin-input--sm" />
        </SettingRow>
        <SettingRow label="Birthday rewards enabled">
          <Toggle checked={settings.birthdayRewardEnabled} onChange={(e) => updateField("birthdayRewardEnabled", e.target.checked)} />
        </SettingRow>
        <SettingRow label="Review rewards enabled">
          <Toggle checked={settings.reviewRewardEnabled} onChange={(e) => updateField("reviewRewardEnabled", e.target.checked)} />
        </SettingRow>
        <SettingRow label="Referral rewards enabled">
          <Toggle checked={settings.referralRewardEnabled} onChange={(e) => updateField("referralRewardEnabled", e.target.checked)} />
        </SettingRow>

        <div className="admin-loyalty-actions">
          <button type="submit" className="admin-button admin-button-gold" disabled={saving}>
            <Save size={15} /> {saving ? "Saving…" : "Save Program Settings"}
          </button>
        </div>
      </form>

      {/* Tiers */}
      <div className="admin-loyalty-section">
        <h2 className="admin-loyalty-section-title">
          <Crown size={16} /> Loyalty Tiers
        </h2>
        <p className="admin-loyalty-section-desc">
          Tiers are assigned based on a customer's lifetime points AND lifetime spend. A customer must meet both thresholds.
        </p>

        <div className="admin-loyalty-tiers-grid">
          {tiers.map((tier) => (
            <div key={tier.id} className={`admin-tier-card admin-tier-card--${tier.name.toLowerCase()}`}>
              <div className="admin-tier-card-header">
                <h3>{tier.name}</h3>
                <Toggle checked={tier.isActive} onChange={(e) => updateTierField(tier.id, "isActive", e.target.checked)} />
              </div>

              <div className="admin-tier-fields">
                <label>Min lifetime points
                  <input type="number" min="0" value={tier.minLifetimePoints} onChange={(e) => updateTierField(tier.id, "minLifetimePoints", e.target.value)} className="admin-input" />
                </label>
                <label>Min lifetime spend (₹)
                  <input type="number" min="0" value={tier.minLifetimeSpend} onChange={(e) => updateTierField(tier.id, "minLifetimeSpend", e.target.value)} className="admin-input" />
                </label>
                <label>Points multiplier
                  <input type="number" min="0" step="0.05" value={tier.pointsMultiplier} onChange={(e) => updateTierField(tier.id, "pointsMultiplier", e.target.value)} className="admin-input" />
                </label>
                <label>Birthday multiplier
                  <input type="number" min="0" step="0.05" value={tier.birthdayMultiplier} onChange={(e) => updateTierField(tier.id, "birthdayMultiplier", e.target.value)} className="admin-input" />
                </label>
                <label className="admin-tier-benefits-label">Benefits (one per line)
                  <textarea
                    rows={3}
                    value={Array.isArray(tier.benefits) ? tier.benefits.join("\n") : tier.benefits}
                    onChange={(e) => updateTierField(tier.id, "benefits", e.target.value)}
                    className="admin-input"
                  />
                </label>
              </div>

              <button type="button" className="admin-button admin-button-dark" onClick={() => saveTier(tier)}>
                <Save size={14} /> Save {tier.name}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Manual adjust */}
      <div className="admin-loyalty-section">
        <h2 className="admin-loyalty-section-title">
          <Users size={16} /> Manual Points Adjustment
        </h2>
        <p className="admin-loyalty-section-desc">
          Directly add or deduct points from a customer account. Use negative values to deduct.
        </p>
        <form onSubmit={handleAdjustPoints} className="admin-loyalty-adjust-form">
          <input
            type="text"
            placeholder="Customer User ID (UUID)"
            value={adjustUserId}
            onChange={(e) => setAdjustUserId(e.target.value)}
            required
            className="admin-input"
          />
          <input
            type="number"
            placeholder="Points (e.g. 100 or -50)"
            value={adjustPoints}
            onChange={(e) => setAdjustPoints(e.target.value)}
            required
            className="admin-input admin-input--sm"
          />
          <input
            type="text"
            placeholder="Reason / description (optional)"
            value={adjustDesc}
            onChange={(e) => setAdjustDesc(e.target.value)}
            className="admin-input"
          />
          <button type="submit" className="admin-button admin-button-dark" disabled={adjusting}>
            <RefreshCw size={14} /> {adjusting ? "Adjusting…" : "Apply Adjustment"}
          </button>
        </form>
      </div>
    </div>
  );
}
