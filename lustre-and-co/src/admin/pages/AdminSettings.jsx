import { Check, CreditCard, Globe, Lock, Store, Truck, UserRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CheckboxField, ErrorState, Field, FormError, LoadingState, StatusBadge } from "../components/AdminUi";
import { useSettings } from "../../context/SettingsContext";
import { useStore } from "../../context/StoreContext";
import api, { getErrorMessage } from "../../services/api";

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
