import { useEffect, useState } from "react";
import {
  Truck,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  Sliders,
  ShieldCheck,
  Building,
  RefreshCw,
} from "lucide-react";
import {
  getShippingSettings,
  updateShippingSettings,
} from "../../services/shipping";

const defaults = {
  defaultProvider: "local_delivery",
  fallbackProvider: "",
  autoCreateShipments: false,
  autoSyncTracking: true,
  pickupAddress: {
    name: "Lustre & Co. Flagship Store & Warehouse",
    phone: "+91 98200 12345",
    email: "logistics@lustreandco.com",
    addressLine1: "Plot 42, Bandra-Kurla Complex",
    addressLine2: "Jewellery Financial Hub",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    postalCode: "400051",
  },
  localDeliveryEnabled: true,
  storePickupEnabled: true,
  freeShippingThreshold: "",
  flatShippingRate: 0,
};

export default function AdminShipping() {
  const [settings, setSettings] = useState(defaults);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("info");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getShippingSettings()
      .then((data) => {
        setSettings({
          ...defaults,
          ...data,
          pickupAddress: {
            ...defaults.pickupAddress,
            ...(data.pickupAddress || {}),
          },
          freeShippingThreshold:
            data.freeShippingThreshold !== null && data.freeShippingThreshold !== undefined
              ? data.freeShippingThreshold
              : "",
        });
      })
      .catch(() => {
        setStatus("Could not load shipping settings.");
        setStatusType("error");
      })
      .finally(() => setLoading(false));
  }, []);

  function update(field, value) {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updatePickup(field, value) {
    setSettings((current) => ({
      ...current,
      pickupAddress: {
        ...(current.pickupAddress || {}),
        [field]: value,
      },
    }));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setStatus("");

    try {
      const saved = await updateShippingSettings({
        ...settings,
        freeShippingThreshold:
          settings.freeShippingThreshold === "" || settings.freeShippingThreshold === null
            ? null
            : Number(settings.freeShippingThreshold),
        flatShippingRate: Number(settings.flatShippingRate || 0),
      });

      setSettings({
        ...saved,
        pickupAddress: {
          ...defaults.pickupAddress,
          ...(saved.pickupAddress || {}),
        },
        freeShippingThreshold:
          saved.freeShippingThreshold !== null && saved.freeShippingThreshold !== undefined
            ? saved.freeShippingThreshold
            : "",
      });

      setStatus("Shipping and courier provider settings updated successfully.");
      setStatusType("success");
    } catch (error) {
      setStatus(
        error.response?.data?.message ||
          "Could not save shipping settings. Please check your inputs.",
      );
      setStatusType("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="admin-page">
      <div className="admin-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <p className="admin-eyebrow" style={{ textTransform: "uppercase", letterSpacing: "1px", fontSize: "0.75rem", color: "#64748b", margin: 0 }}>
            Logistics &amp; Operations
          </p>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, margin: "0.2rem 0 0 0" }}>
            Shipping Configuration
          </h1>
          <p style={{ margin: "0.3rem 0 0 0", color: "#64748b", fontSize: "0.88rem" }}>
            Provider abstraction supporting Shiprocket, Delhivery, Blue Dart, Easyship, Shippo, Local delivery &amp; Store pickup.
          </p>
        </div>
      </div>

      {status && (
        <div
          role="status"
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            marginBottom: "1.2rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            backgroundColor: statusType === "success" ? "#f0fdf4" : "#fef2f2",
            color: statusType === "success" ? "#166534" : "#991b1b",
            border: `1px solid ${statusType === "success" ? "#bbf7d0" : "#fecaca"}`,
            fontSize: "0.88rem",
          }}
        >
          {statusType === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{status}</span>
        </div>
      )}

      {loading ? (
        <p style={{ color: "#64748b" }}>Loading shipping configuration…</p>
      ) : (
        <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Section 1: Carrier & Routing */}
          <div style={{ background: "var(--admin-surface)", padding: "1.5rem", borderRadius: "10px", border: "1px solid var(--admin-border)" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 600, margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Truck size={18} color="#b8860b" /> Primary &amp; Fallback Providers
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.2rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                  Default Provider
                </label>
                <select
                  value={settings.defaultProvider}
                  onChange={(event) => update("defaultProvider", event.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                >
                  <option value="local_delivery">Local delivery</option>
                  <option value="store_pickup">Store pickup</option>
                  <option value="shiprocket">Shiprocket</option>
                  <option value="delhivery">Delhivery</option>
                  <option value="blue_dart">Blue Dart</option>
                  <option value="easyship">Easyship</option>
                  <option value="shippo">Shippo</option>
                </select>
                <small style={{ color: "#64748b", display: "block", marginTop: "0.25rem" }}>
                  First choice for rate calculation and automated dispatch.
                </small>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                  Fallback Provider
                </label>
                <select
                  value={settings.fallbackProvider || ""}
                  onChange={(event) => update("fallbackProvider", event.target.value || null)}
                  style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                >
                  <option value="">None (Fail if default unavailable)</option>
                  <option value="shiprocket">Shiprocket</option>
                  <option value="delhivery">Delhivery</option>
                  <option value="blue_dart">Blue Dart</option>
                  <option value="easyship">Easyship</option>
                  <option value="shippo">Shippo</option>
                  <option value="local_delivery">Local delivery</option>
                </select>
                <small style={{ color: "#64748b", display: "block", marginTop: "0.25rem" }}>
                  Used automatically if the primary courier cannot service a destination.
                </small>
              </div>
            </div>
          </div>

          {/* Section 2: Automation Rules */}
          <div style={{ background: "var(--admin-surface)", padding: "1.5rem", borderRadius: "10px", border: "1px solid var(--admin-border)" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 600, margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Sliders size={18} color="#b8860b" /> Automation &amp; Sync
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.9rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={settings.autoCreateShipments}
                  onChange={(event) => update("autoCreateShipments", event.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "#b8860b" }}
                />
                <span><strong>Automatically create shipments</strong> after order confirmation (when paid or COD)</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.9rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={settings.autoSyncTracking}
                  onChange={(event) => update("autoSyncTracking", event.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "#b8860b" }}
                />
                <span><strong>Synchronize tracking automatically</strong> via background cron job (every 30 mins)</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.9rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={settings.localDeliveryEnabled}
                  onChange={(event) => update("localDeliveryEnabled", event.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "#b8860b" }}
                />
                <span>Enable local delivery service option</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.9rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={settings.storePickupEnabled}
                  onChange={(event) => update("storePickupEnabled", event.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "#b8860b" }}
                />
                <span>Enable boutique / store pickup option</span>
              </label>
            </div>
          </div>

          {/* Section 3: Pricing Rules */}
          <div style={{ background: "var(--admin-surface)", padding: "1.5rem", borderRadius: "10px", border: "1px solid var(--admin-border)" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 600, margin: "0 0 1rem 0" }}>
              Pricing &amp; Free Shipping Threshold
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.2rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                  Free Shipping Threshold (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 10000 (leave blank to disable)"
                  value={settings.freeShippingThreshold}
                  onChange={(event) => update("freeShippingThreshold", event.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "6px", border: "1px solid var(--admin-border)", background: "var(--admin-bg)", color: "var(--admin-text)" }}
                />
                <small style={{ color: "var(--admin-muted)", display: "block", marginTop: "0.25rem" }}>
                  Orders with cart value at or above this amount automatically receive complimentary insured shipping.
                </small>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                  Flat Fallback Shipping Rate (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.flatShippingRate}
                  onChange={(event) => update("flatShippingRate", event.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "6px", border: "1px solid var(--admin-border)", background: "var(--admin-bg)", color: "var(--admin-text)" }}
                />
                <small style={{ color: "var(--admin-muted)", display: "block", marginTop: "0.25rem" }}>
                  Fallback rate charged if live rates cannot be reached.
                </small>
              </div>
            </div>
          </div>

          {/* Section 4: Origin / Pickup Address */}
          <div style={{ background: "var(--admin-surface)", padding: "1.5rem", borderRadius: "10px", border: "1px solid var(--admin-border)" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 600, margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Building size={18} color="#b8860b" /> Origin / Warehouse Pickup Address
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.3rem" }}>Warehouse / Store Name</label>
                <input
                  type="text"
                  value={settings.pickupAddress?.name || ""}
                  onChange={(e) => updatePickup("name", e.target.value)}
                  style={{ width: "100%", padding: "0.5rem 0.7rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.3rem" }}>Contact Phone</label>
                <input
                  type="text"
                  value={settings.pickupAddress?.phone || ""}
                  onChange={(e) => updatePickup("phone", e.target.value)}
                  style={{ width: "100%", padding: "0.5rem 0.7rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.3rem" }}>Address Line 1</label>
                <input
                  type="text"
                  value={settings.pickupAddress?.addressLine1 || ""}
                  onChange={(e) => updatePickup("addressLine1", e.target.value)}
                  style={{ width: "100%", padding: "0.5rem 0.7rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.3rem" }}>City</label>
                <input
                  type="text"
                  value={settings.pickupAddress?.city || ""}
                  onChange={(e) => updatePickup("city", e.target.value)}
                  style={{ width: "100%", padding: "0.5rem 0.7rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.3rem" }}>State</label>
                <input
                  type="text"
                  value={settings.pickupAddress?.state || ""}
                  onChange={(e) => updatePickup("state", e.target.value)}
                  style={{ width: "100%", padding: "0.5rem 0.7rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.3rem" }}>Postal Code</label>
                <input
                  type="text"
                  value={settings.pickupAddress?.postalCode || ""}
                  onChange={(e) => updatePickup("postalCode", e.target.value)}
                  style={{ width: "100%", padding: "0.5rem 0.7rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.8rem",
                borderRadius: "8px",
                backgroundColor: "#1e293b",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "0.92rem",
                border: "none",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              <Save size={16} />
              {saving ? "Saving Configuration…" : "Save Shipping Settings"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
