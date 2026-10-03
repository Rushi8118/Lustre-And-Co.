import { Check, CreditCard, Globe, Lock, ShieldCheck, ShoppingBag, Store, Truck, UserRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CheckboxField, ErrorState, Field, FormError, LoadingState, StatusBadge } from "../components/AdminUi";
import { useSettings } from "../../context/SettingsContext";
import { useStore } from "../../context/StoreContext";
import api, { getErrorMessage } from "../../services/api";
import {
  getRecoverySettings,
  processAbandonedCarts,
  updateRecoverySettings,
} from "../../services/abandonedCarts";

function Card({ id, eyebrow, title, children }) {
  return (
    <section className="admin-settings-card" id={id}>
      <div className="admin-settings-card-heading">
        <span className="admin-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <div className="admin-form-grid">{children}</div>
    </section>
  );
}

const NUMERIC_COMMERCE = ["freeShippingThreshold", "shippingFee", "expressShippingFee", "taxPercent", "returnWindowDays", "lowStockThreshold"];

export default function AdminSettings() {
  const { settings: publicSettings, reload } = useSettings();
  const { user, updateUser, showToast } = useStore();

  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({ name: user?.name || "", phone: user?.phone || "" });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [accountMessage, setAccountMessage] = useState(null);

  // 2FA state
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorSetupStep, setTwoFactorSetupStep] = useState(false);
  const [twoFactorInputCode, setTwoFactorInputCode] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const { data } = await api.get("/admin/settings");
      setDraft({ store: data.store, social: data.social, commerce: data.commerce });
    } catch (err) {
      setError(getErrorMessage(err, "Settings could not be loaded."));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (section, field) => (eventOrValue) => {
    const value = eventOrValue?.target ? eventOrValue.target.value : eventOrValue;
    setDraft((current) => ({ ...current, [section]: { ...current[section], [field]: value } }));
  };

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setSaveError("");
    try {
      const commerce = { ...draft.commerce };
      NUMERIC_COMMERCE.forEach((key) => {
        commerce[key] = Number(commerce[key]) || 0;
      });
      await api.put("/admin/settings", { store: draft.store, social: draft.social, commerce });
      await reload();
      showToast("Settings saved and applied to the storefront.", "success");
    } catch (err) {
      setSaveError(getErrorMessage(err, "Settings could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    setAccountMessage(null);
    try {
      const { data } = await api.put("/users/profile", { name: profile.name.trim(), phone: profile.phone.trim() });
      updateUser({ name: data.name, phone: data.phone });
      setAccountMessage({ success: true, text: "Profile updated." });
    } catch (err) {
      setAccountMessage({ success: false, text: getErrorMessage(err, "Profile could not be updated.") });
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setAccountMessage(null);
    try {
      const { data } = await api.put("/users/password", passwords);
      setPasswords({ currentPassword: "", newPassword: "" });
      setAccountMessage({ success: true, text: data.message });
    } catch (err) {
      setAccountMessage({ success: false, text: getErrorMessage(err, "Password could not be changed.") });
    }
  }

  async function startSetup2FA() {
    setTwoFactorLoading(true);
    try {
      await api.post("/auth/2fa/setup");
      setTwoFactorSetupStep(true);
      showToast("Security verification code dispatched to your email.", "info");
    } catch (err) {
      showToast(getErrorMessage(err, "Failed to start 2FA setup."), "error");
    } finally {
      setTwoFactorLoading(false);
    }
  }

  async function confirmEnable2FA(e) {
    e.preventDefault();
    if (!twoFactorInputCode || twoFactorInputCode.length < 6) return;
    setTwoFactorLoading(true);
    try {
      await api.post("/auth/2fa/enable", { code: twoFactorInputCode });
      updateUser({ two_factor_enabled: true });
      setTwoFactorSetupStep(false);
      setTwoFactorInputCode("");
      showToast("Two-Factor Authentication is now active for your account.", "success");
    } catch (err) {
      showToast(getErrorMessage(err, "Invalid verification code."), "error");
    } finally {
      setTwoFactorLoading(false);
    }
  }

  async function disable2FA() {
    if (!window.confirm("Are you sure you want to disable Two-Factor Authentication?")) return;
    setTwoFactorLoading(true);
    try {
      await api.post("/auth/2fa/disable");
      updateUser({ two_factor_enabled: false });
      showToast("Two-Factor Authentication has been disabled.", "info");
    } catch (err) {
      showToast(getErrorMessage(err, "Failed to disable 2FA."), "error");
    } finally {
      setTwoFactorLoading(false);
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!draft) return <LoadingState label="Loading settings…" />;

  const { store, social, commerce } = draft;
  const payments = publicSettings.payments;

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Configuration</span>
          <h1>Settings</h1>
          <p>Store profile, shipping and tax rules, payment options, and your admin account.</p>
        </div>
      </div>

      <div className="admin-settings-layout">
        <aside className="admin-settings-nav">
          <a href="#store"><Store size={16} /> Store profile</a>
          <a href="#social"><Globe size={16} /> Social links</a>
          <a href="#commerce"><Truck size={16} /> Shipping &amp; tax</a>
          <a href="#payments"><CreditCard size={16} /> Payments</a>
          <a href="#abandoned-carts"><ShoppingBag size={16} /> Abandoned carts</a>
          <a href="#security"><ShieldCheck size={16} /> Security &amp; 2FA</a>
          <a href="#account"><UserRound size={16} /> Admin account</a>
        </aside>

        <div className="admin-settings-content">
          <form onSubmit={save} className="admin-settings-content">
            <Card id="store" eyebrow="Store profile" title="Public store details">
              <Field label="Store name"><input value={store.name} onChange={set("store", "name")} required /></Field>
              <Field label="Tagline"><input value={store.tagline} onChange={set("store", "tagline")} /></Field>
              <Field label="Support email"><input type="email" value={store.supportEmail} onChange={set("store", "supportEmail")} /></Field>
              <Field label="Support phone"><input value={store.supportPhone} onChange={set("store", "supportPhone")} /></Field>
              <Field label="WhatsApp number" hint="Digits with country code, e.g. 919876543210"><input value={store.whatsappNumber} onChange={set("store", "whatsappNumber")} /></Field>
              <Field label="Support hours"><input value={store.hours} onChange={set("store", "hours")} /></Field>
              <Field label="Address" full><input value={store.address} onChange={set("store", "address")} /></Field>
              <Field label="Store description (footer)" full><textarea value={store.description} onChange={set("store", "description")} /></Field>
            </Card>

            <Card id="social" eyebrow="Social" title="Social links">
              {["instagram", "facebook", "youtube", "whatsapp"].map((key) => (
                <Field key={key} label={key[0].toUpperCase() + key.slice(1)} hint="Leave blank to hide the icon">
                  <input value={social[key] || ""} onChange={set("social", key)} placeholder="https://…" />
                </Field>
              ))}
            </Card>

            <Card id="commerce" eyebrow="Checkout rules" title="Shipping, tax & inventory">
              <Field label="Currency">
                <select value={commerce.currency} onChange={set("commerce", "currency")}>
                  <option value="INR">Indian Rupee (₹)</option>
                  <option value="USD">US Dollar ($)</option>
                </select>
              </Field>
              <Field label="Tax (GST) %"><input type="number" min="0" max="100" step="0.01" value={commerce.taxPercent} onChange={set("commerce", "taxPercent")} /></Field>
              <Field label="Free shipping threshold"><input type="number" min="0" value={commerce.freeShippingThreshold} onChange={set("commerce", "freeShippingThreshold")} /></Field>
              <Field label="Standard shipping fee"><input type="number" min="0" value={commerce.shippingFee} onChange={set("commerce", "shippingFee")} /></Field>
              <Field label="Express delivery fee"><input type="number" min="0" value={commerce.expressShippingFee} onChange={set("commerce", "expressShippingFee")} /></Field>
              <Field label="Return window (days)"><input type="number" min="0" value={commerce.returnWindowDays} onChange={set("commerce", "returnWindowDays")} /></Field>
              <Field label="Dispatch time"><input value={commerce.dispatchTime} onChange={set("commerce", "dispatchTime")} /></Field>
              <Field label="Standard delivery estimate"><input value={commerce.standardDelivery} onChange={set("commerce", "standardDelivery")} /></Field>
              <Field label="Express delivery estimate"><input value={commerce.expressDelivery} onChange={set("commerce", "expressDelivery")} /></Field>
              <Field label="Low stock alert threshold"><input type="number" min="0" value={commerce.lowStockThreshold} onChange={set("commerce", "lowStockThreshold")} /></Field>
              <CheckboxField label="Offer cash on delivery" checked={commerce.codEnabled} onChange={set("commerce", "codEnabled")} />
              <CheckboxField label="Publish reviews without moderation" checked={commerce.autoApproveReviews} onChange={set("commerce", "autoApproveReviews")} />
            </Card>

            <div className="admin-settings-save-bar">
              <FormError message={saveError} />
              <button className="admin-button admin-button-dark" type="submit" disabled={saving}>
                <Check size={16} /> {saving ? "Saving…" : "Save settings"}
              </button>
            </div>
          </form>

          <section className="admin-settings-card" id="payments">
            <div className="admin-settings-card-heading">
              <span className="admin-eyebrow">Payments</span>
              <h2>Payment gateway</h2>
            </div>
            <p>
              Online payments (Razorpay):{" "}
              <StatusBadge tone={payments.onlineEnabled ? "success" : "warning"}>{payments.onlineEnabled ? "Enabled" : "Not configured"}</StatusBadge>
            </p>
            <p className="admin-muted">
              API keys are secrets and are read from <code>server/.env</code> (<code>RAZORPAY_KEY_ID</code>, <code>RAZORPAY_KEY_SECRET</code>), never
              stored in the database. Restart the API after changing them.
            </p>
          </section>

          <AdminAbandonedCartSettings />

          <section className="admin-settings-card" id="security">
            <div className="admin-settings-card-heading">
              <span className="admin-eyebrow">Enterprise Security</span>
              <h2>Two-Factor Authentication (2FA)</h2>
            </div>
            <p className="admin-muted">
              Add a critical layer of defense to administrative sessions. When enabled, signing in requires a 6-digit verification code delivered to your administrator email.
            </p>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "16px 0", padding: "16px 20px", border: "1px solid var(--admin-border, #e7e5e4)", borderRadius: "8px", background: "var(--admin-bg, #fbf7ee)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <ShieldCheck size={28} color={user?.two_factor_enabled ? "#16a34a" : "#ca8a04"} />
                <div>
                  <strong style={{ fontSize: "14px", display: "block" }}>
                    Status: {user?.two_factor_enabled ? "Enabled & Active" : "Disabled (Standard Access)"}
                  </strong>
                  <span style={{ fontSize: "12px", color: "var(--admin-muted, #78716c)" }}>
                    {user?.two_factor_enabled
                      ? "High-security OTP challenge is mandatory for portal login."
                      : "Recommended for all store administrators, managers, and staff."}
                  </span>
                </div>
              </div>

              {user?.two_factor_enabled ? (
                <button
                  type="button"
                  className="admin-button admin-button-danger"
                  onClick={disable2FA}
                  disabled={twoFactorLoading}
                >
                  {twoFactorLoading ? "Disabling…" : "Disable 2FA"}
                </button>
              ) : (
                <button
                  type="button"
                  className="admin-button admin-button-dark"
                  onClick={startSetup2FA}
                  disabled={twoFactorLoading}
                >
                  {twoFactorLoading ? "Sending Code…" : "Enable 2FA"}
                </button>
              )}
            </div>

            {twoFactorSetupStep && (
              <div style={{ padding: "16px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", marginTop: "12px" }}>
                <h4 style={{ margin: "0 0 8px 0" }}>Enter Activation Code</h4>
                <p style={{ fontSize: "13px", color: "#475569", margin: "0 0 12px 0" }}>
                  A 6-digit confirmation code was dispatched to <strong>{user?.email}</strong>. Enter it below to activate Two-Factor Authentication:
                </p>
                <form onSubmit={confirmEnable2FA} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="••••••"
                    value={twoFactorInputCode}
                    onChange={(e) => setTwoFactorInputCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    style={{
                      fontFamily: "monospace",
                      fontSize: "18px",
                      letterSpacing: "4px",
                      textAlign: "center",
                      width: "140px",
                      padding: "8px",
                    }}
                    required
                  />
                  <button type="submit" className="admin-button admin-button-dark" disabled={twoFactorLoading || twoFactorInputCode.length < 6}>
                    {twoFactorLoading ? "Activating…" : "Confirm & Enable"}
                  </button>
                  <button type="button" className="admin-button admin-button-secondary" onClick={() => setTwoFactorSetupStep(false)}>
                    Cancel
                  </button>
                </form>
              </div>
            )}
          </section>

          <section className="admin-settings-card" id="account">
            <div className="admin-settings-card-heading">
              <span className="admin-eyebrow">Admin account</span>
              <h2>{user?.email}</h2>
            </div>
            <form className="admin-form-grid" onSubmit={saveProfile}>
              <Field label="Full name"><input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required /></Field>
              <Field label="Phone"><input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></Field>
              <div className="admin-modal-actions">
                <button type="submit" className="admin-button admin-button-light">Save profile</button>
              </div>
            </form>
            <form className="admin-form-grid" onSubmit={changePassword} style={{ marginTop: 18 }}>
              <Field label="Current password">
                <input type="password" autoComplete="current-password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} required />
              </Field>
              <Field label="New password" hint="At least 8 characters">
                <input type="password" autoComplete="new-password" minLength={8} value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} required />
              </Field>
              <div className="admin-modal-actions">
                <button type="submit" className="admin-button admin-button-dark">
                  <Lock size={14} /> Change password
                </button>
              </div>
            </form>
            {accountMessage && (
              <p className={accountMessage.success ? "admin-muted" : "admin-form-error"} role="status">
                {accountMessage.text}
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

const initialAbandonedCartSettings = {
  enabled: true,
  autoRecoveryEmail: true,
  abandonmentThresholdMinutes: 60,
  firstReminderDelayHours: 2,
  secondReminderDelayHours: 48,
  couponPercentage: 10,
  couponCode: 'LUSTRE10',
  firstReminderSubject: '',
  firstReminderHeadline: '',
  firstReminderBody: '',
  secondReminderSubject: '',
  secondReminderHeadline: '',
  secondReminderBody: '',
  senderEmail: '',
};

export function AdminAbandonedCartSettings() {
  const [settings, setSettings] = useState(initialAbandonedCartSettings);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getRecoverySettings()
      .then(setSettings)
      .catch(() => setStatus('Could not load abandoned-cart settings.'));
  }, []);

  function update(field, value) {
    setSettings((current) => ({ ...current, [field]: value }));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setStatus('');

    try {
      const saved = await updateRecoverySettings({
        ...settings,
        abandonmentThresholdMinutes: Number(
          settings.abandonmentThresholdMinutes,
        ),
        firstReminderDelayHours: Number(settings.firstReminderDelayHours),
        secondReminderDelayHours: Number(settings.secondReminderDelayHours),
        couponPercentage: Number(settings.couponPercentage),
      });

      setSettings(saved);
      setStatus('Abandoned-cart settings saved.');
    } catch {
      setStatus('Could not save settings.');
    } finally {
      setSaving(false);
    }
  }

  async function processNow() {
    setStatus('Processing abandoned carts...');

    try {
      const result = await processAbandonedCarts();
      setStatus(`${result.sent} recovery email(s) sent.`);
    } catch {
      setStatus('Could not process abandoned carts.');
    }
  }

  return (
    <section className="admin-settings-card" id="abandoned-carts">
      <div className="admin-settings-card-heading">
        <span className="admin-eyebrow">Recovery Automation</span>
        <h2>Abandoned cart recovery</h2>
      </div>
      <p className="admin-muted" style={{ margin: '0 0 16px 0' }}>
        Send scheduled reminders to customers who leave items in their bag.
      </p>

      <form onSubmit={save} className="admin-form-grid">
        <label className="admin-checkbox-label" style={{ gridColumn: '1 / -1' }}>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(event) => update('enabled', event.target.checked)}
          />
          Enable abandoned-cart recovery
        </label>

        <label className="admin-checkbox-label" style={{ gridColumn: '1 / -1' }}>
          <input
            type="checkbox"
            checked={settings.autoRecoveryEmail}
            onChange={(event) =>
              update('autoRecoveryEmail', event.target.checked)
            }
          />
          Send automated emails
        </label>

        <Field label="Abandonment threshold (minutes)">
          <input
            type="number"
            min="5"
            value={settings.abandonmentThresholdMinutes}
            onChange={(event) =>
              update('abandonmentThresholdMinutes', event.target.value)
            }
          />
        </Field>

        <Field label="First reminder delay (hours)">
          <input
            type="number"
            min="0.5"
            step="0.5"
            value={settings.firstReminderDelayHours}
            onChange={(event) =>
              update('firstReminderDelayHours', event.target.value)
            }
          />
        </Field>

        <Field label="Second reminder delay (hours)">
          <input
            type="number"
            min="1"
            step="1"
            value={settings.secondReminderDelayHours}
            onChange={(event) =>
              update('secondReminderDelayHours', event.target.value)
            }
          />
        </Field>

        <Field label="Coupon percentage (%)">
          <input
            type="number"
            min="0"
            max="100"
            value={settings.couponPercentage}
            onChange={(event) =>
              update('couponPercentage', event.target.value)
            }
          />
        </Field>

        <Field label="Coupon code">
          <input
            value={settings.couponCode}
            onChange={(event) => update('couponCode', event.target.value)}
          />
        </Field>

        <Field label="First reminder subject" full>
          <input
            value={settings.firstReminderSubject}
            onChange={(event) =>
              update('firstReminderSubject', event.target.value)
            }
          />
        </Field>

        <Field label="First reminder body" full>
          <textarea
            rows="3"
            value={settings.firstReminderBody}
            onChange={(event) =>
              update('firstReminderBody', event.target.value)
            }
          />
        </Field>

        <Field label="Second reminder subject" full>
          <input
            value={settings.secondReminderSubject}
            onChange={(event) =>
              update('secondReminderSubject', event.target.value)
            }
          />
        </Field>

        <Field label="Second reminder body" full>
          <textarea
            rows="3"
            value={settings.secondReminderBody}
            onChange={(event) =>
              update('secondReminderBody', event.target.value)
            }
          />
        </Field>

        <div className="admin-modal-actions" style={{ gridColumn: '1 / -1', marginTop: 12 }}>
          <button type="submit" className="admin-button admin-button-dark" disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>

          <button type="button" className="admin-button admin-button-light" onClick={processNow}>
            Process now
          </button>
        </div>

        {status && (
          <p role="status" className="admin-muted" style={{ gridColumn: '1 / -1', marginTop: 8 }}>
            {status}
          </p>
        )}
      </form>
    </section>
  );
}

