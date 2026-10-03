import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  Truck,
  RefreshCw,
  FileText,
  XCircle,
  Clock,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  RotateCcw,
  ExternalLink,
  Search,
  Filter,
  Settings,
  ShieldCheck,
} from "lucide-react";
import {
  cancelShipment,
  createShipmentForOrder,
  createReturnShipment,
  generateShippingLabel,
  getOrderShipments,
  getShipments,
  getShipmentEvents,
  trackShipment,
  syncShipments,
  getShippingProviders,
  updateShippingProvider,
} from "../../services/shipping";

const STATUS_CONFIG = {
  pending:            { label: "Pending",           color: "muted"  },
  rate_selected:      { label: "Rate Selected",     color: "muted"  },
  created:            { label: "Shipment Created",  color: "blue"   },
  label_ready:        { label: "Label Ready",       color: "blue"   },
  picked_up:          { label: "Picked Up",         color: "yellow" },
  in_transit:         { label: "In Transit",        color: "yellow" },
  out_for_delivery:   { label: "Out for Delivery",  color: "yellow" },
  delivered:          { label: "Delivered",         color: "green"  },
  failed:             { label: "Failed",            color: "red"    },
  cancelled:          { label: "Cancelled",         color: "red"    },
  return_requested:   { label: "Return Requested",  color: "orange" },
  return_in_transit:  { label: "Return In Transit", color: "orange" },
  returned:           { label: "Returned",          color: "green"  },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "muted" };
  return <span className={`shipment-status-badge shipment-status-${cfg.color}`}>{cfg.label}</span>;
}

export default function AdminShipments({ orderId }) {
  const [shipments, setShipments] = useState([]);
  const [expandedEvents, setExpandedEvents] = useState({});
  const [eventData, setEventData] = useState({});
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [returnModal, setReturnModal] = useState(null);
  const [returnForm, setReturnForm] = useState({ reason: "", pickupAddress: "" });
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [providersModalOpen, setProvidersModalOpen] = useState(false);
  const [providersList, setProvidersList] = useState([]);

  const isStandalone = !orderId;

  async function loadProviders() {
    try {
      const data = await getShippingProviders();
      setProvidersList(data || []);
    } catch {
      // Non-blocking
    }
  }

  async function load() {
    setLoading(true);
    try {
      if (orderId) {
        const result = await getOrderShipments(orderId);
        setShipments(result || []);
      } else {
        const result = await getShipments({
          status: statusFilter !== "all" ? statusFilter : undefined,
        });
        setShipments(result || []);
      }
    } catch {
      setMsg({ text: "Shipments could not be loaded.", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    if (isStandalone) {
      void loadProviders();
    }
  }, [orderId, statusFilter]);

  async function handleToggleProvider(prov) {
    setAction(`toggle-${prov.id}`, true);
    try {
      await updateShippingProvider(prov.id, { is_active: !prov.is_active });
      await loadProviders();
      setMsg({ text: `Provider ${prov.name} is now ${!prov.is_active ? "active" : "inactive"}.`, type: "success" });
    } catch {
      setMsg({ text: "Failed to update provider status.", type: "error" });
    } finally {
      setAction(`toggle-${prov.id}`, false);
    }
  }

  async function handleSyncAll() {
    setAction("sync-all", true);
    setMsg({ text: "", type: "" });
    try {
      const res = await syncShipments();
      setMsg({ text: `Synchronized ${res?.synchronized || 0} active shipment(s).`, type: "success" });
      await load();
    } catch {
      setMsg({ text: "Tracking synchronization failed.", type: "error" });
    } finally {
      setAction("sync-all", false);
    }
  }

  function setAction(id, val) {
    setActionLoading((p) => ({ ...p, [id]: val }));
  }

  async function handleCreate() {
    if (!orderId) return;
    setAction("create", true);
    setMsg({ text: "", type: "" });
    try {
      await createShipmentForOrder(orderId);
      setMsg({ text: "Shipment created successfully.", type: "success" });
      await load();
    } catch (err) {
      setMsg({ text: err?.response?.data?.message || "Shipment creation failed.", type: "error" });
    } finally {
      setAction("create", false);
    }
  }

  async function handleRefreshTracking(shipmentId) {
    setAction(shipmentId, true);
    setMsg({ text: "", type: "" });
    try {
      await trackShipment(shipmentId);
      setMsg({ text: "Tracking synchronized.", type: "success" });
      await load();
    } catch {
      setMsg({ text: "Tracking sync failed.", type: "error" });
    } finally {
      setAction(shipmentId, false);
    }
  }

  async function handleLabel(shipmentId) {
    setAction(`label-${shipmentId}`, true);
    try {
      const result = await generateShippingLabel(shipmentId);
      if (result?.labelUrl) window.open(result.labelUrl, "_blank", "noopener,noreferrer");
      await load();
    } catch {
      setMsg({ text: "Label generation failed.", type: "error" });
    } finally {
      setAction(`label-${shipmentId}`, false);
    }
  }

  async function handleCancel(shipmentId) {
    if (!confirm("Cancel this shipment?")) return;
    setAction(`cancel-${shipmentId}`, true);
    try {
      await cancelShipment(shipmentId);
      setMsg({ text: "Shipment cancelled.", type: "success" });
      await load();
    } catch {
      setMsg({ text: "Cancellation failed.", type: "error" });
    } finally {
      setAction(`cancel-${shipmentId}`, false);
    }
  }

  async function toggleEvents(shipmentId) {
    if (expandedEvents[shipmentId]) {
      setExpandedEvents((p) => ({ ...p, [shipmentId]: false }));
      return;
    }
    setAction(`events-${shipmentId}`, true);
    try {
      const events = await getShipmentEvents(shipmentId);
      setEventData((p) => ({ ...p, [shipmentId]: events }));
      setExpandedEvents((p) => ({ ...p, [shipmentId]: true }));
    } catch {
      setMsg({ text: "Could not load shipment history.", type: "error" });
    } finally {
      setAction(`events-${shipmentId}`, false);
    }
  }

  async function handleReturnSubmit(e) {
    e.preventDefault();
    const shipment = returnModal;
    setAction(`return-${shipment.id}`, true);
    try {
      let pickup;
      try { pickup = JSON.parse(returnForm.pickupAddress); }
      catch { pickup = { address: returnForm.pickupAddress }; }

      const targetOrderId = orderId || shipment.orderId;
      await createReturnShipment(targetOrderId, {
        shipmentId: shipment.id,
        reason: returnForm.reason,
        pickupAddress: pickup,
      });
      setMsg({ text: "Return shipment created.", type: "success" });
      setReturnModal(null);
      await load();
    } catch (err) {
      setMsg({ text: err?.response?.data?.message || "Return creation failed.", type: "error" });
    } finally {
      setAction(`return-${shipment.id}`, false);
    }
  }

  const filteredShipments = shipments.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (s.trackingNumber && s.trackingNumber.toLowerCase().includes(q)) ||
      (s.courierName && s.courierName.toLowerCase().includes(q)) ||
      (s.orderId && s.orderId.toLowerCase().includes(q)) ||
      (s.id && s.id.toLowerCase().includes(q))
    );
  });

  const canCreateShipment = orderId && !shipments.some((s) =>
    ["created", "label_ready", "picked_up", "in_transit", "out_for_delivery", "delivered"].includes(s.status)
  );

  // KPIs for standalone page
  const totalCount = shipments.length;
  const inTransitCount = shipments.filter((s) => ["picked_up", "in_transit", "out_for_delivery"].includes(s.status)).length;
  const deliveredCount = shipments.filter((s) => s.status === "delivered").length;
  const returnCount = shipments.filter((s) => ["return_requested", "return_in_transit", "returned"].includes(s.status)).length;

  return (
    <div className={isStandalone ? "admin-page-container" : "admin-shipments-section"}>
      {isStandalone ? (
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Truck size={24} /> Shipments & Logistics
            </h1>
            <p className="admin-page-subtitle">
              Manage multi-carrier shipping, labels, real-time tracking, delivery status, and returns.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              className="admin-button admin-button-secondary"
              onClick={() => {
                void loadProviders();
                setProvidersModalOpen(true);
              }}
            >
              <Settings size={14} /> Carriers ({providersList.length || 7})
            </button>
            <button
              type="button"
              className="admin-button admin-button-dark"
              onClick={handleSyncAll}
              disabled={actionLoading["sync-all"]}
            >
              {actionLoading["sync-all"] ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
              Sync Live Tracking
            </button>
            <button
              type="button"
              className="admin-button admin-button-secondary"
              onClick={load}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
            </button>
          </div>
        </div>
      ) : (
        <div className="admin-shipments-header">
          <h3><Truck size={16} /> Carrier Shipments</h3>
          {canCreateShipment && (
            <button
              className="admin-button admin-button-dark"
              onClick={handleCreate}
              disabled={actionLoading.create}
            >
              {actionLoading.create ? <Loader2 size={14} className="spin" /> : <Package size={14} />}
              Create Shipment
            </button>
          )}
        </div>
      )}

      {isStandalone && (
        <div className="admin-kpi-grid" style={{ marginBottom: 24 }}>
          <div className="admin-kpi-card">
            <span className="admin-kpi-label">Total Shipments</span>
            <strong className="admin-kpi-value">{totalCount}</strong>
          </div>
          <div className="admin-kpi-card">
            <span className="admin-kpi-label">In Transit</span>
            <strong className="admin-kpi-value" style={{ color: "#d97706" }}>{inTransitCount}</strong>
          </div>
          <div className="admin-kpi-card">
            <span className="admin-kpi-label">Delivered</span>
            <strong className="admin-kpi-value" style={{ color: "#16a34a" }}>{deliveredCount}</strong>
          </div>
          <div className="admin-kpi-card">
            <span className="admin-kpi-label">Returns</span>
            <strong className="admin-kpi-value" style={{ color: "#ea580c" }}>{returnCount}</strong>
          </div>
        </div>
      )}

      {isStandalone && (
        <div className="admin-toolbar" style={{ marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { id: "all", label: "All" },
              { id: "created", label: "Created" },
              { id: "in_transit", label: "In Transit" },
              { id: "delivered", label: "Delivered" },
              { id: "return_in_transit", label: "Returns" },
              { id: "cancelled", label: "Cancelled" },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`admin-tab-btn ${statusFilter === tab.id ? "is-active" : ""}`}
                onClick={() => setStatusFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ position: "relative", minWidth: 260 }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#888" }} />
            <input
              type="text"
              placeholder="Search tracking, order ID, courier…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-search-input"
              style={{ paddingLeft: 34, width: "100%", height: 38 }}
            />
          </div>
        </div>
      )}

      {msg.text && (
        <p className={`inline-alert ${msg.type === "success" ? "inline-alert-success" : "inline-alert-error"}`} style={{ marginBottom: 16 }}>
          {msg.text}
        </p>
      )}

      {loading && (
        <div className="admin-loading" style={{ padding: 40, textAlign: "center" }}>
          <Loader2 size={24} className="spin" style={{ margin: "0 auto 12px auto" }} />
          Loading shipments…
        </div>
      )}

      {!loading && filteredShipments.length === 0 && (
        <div className="admin-shipments-empty" style={{ padding: 40, textAlign: "center", background: "var(--admin-card-bg, #fff)", border: "1px dashed var(--admin-border, #ddd)", borderRadius: 8 }}>
          <Package size={40} style={{ color: "var(--admin-muted, #888)", marginBottom: 8 }} />
          <p style={{ margin: 0, fontWeight: 500, color: "var(--admin-text, #333)" }}>
            {isStandalone ? "No shipments found matching the criteria." : "No carrier shipments created yet for this order."}
          </p>
        </div>
      )}

      <div style={{ display: "grid", gap: 14 }}>
        {filteredShipments.map((shipment) => (
          <article key={shipment.id} className="shipment-card">
            <div className="shipment-card-header">
              <div className="shipment-meta" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <StatusBadge status={shipment.status} />
                <span className="shipment-type-tag">
                  {shipment.shipmentType === "return" ? "↩ Return" : "↗ Delivery"}
                </span>
                {shipment.courierName && <span className="shipment-courier"><strong>{shipment.courierName}</strong></span>}
                {shipment.serviceName && <span style={{ fontSize: 12, color: "var(--admin-muted, #777)" }}>({shipment.serviceName})</span>}
                {isStandalone && shipment.orderId && (
                  <Link to={`/admin/orders?search=${shipment.orderId}`} style={{ fontSize: 12, color: "#c5a059", textDecoration: "underline", marginLeft: 4 }}>
                    Order Ref: {String(shipment.orderId).slice(0, 8)}…
                  </Link>
                )}
              </div>
              <div className="shipment-tracking">
                {shipment.trackingNumber ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="shipment-tracking-num">AWB: {shipment.trackingNumber}</span>
                    {shipment.trackingUrl && (
                      <a href={shipment.trackingUrl} target="_blank" rel="noreferrer" className="shipment-track-link">
                        <ExternalLink size={12} /> Track
                      </a>
                    )}
                  </div>
                ) : (
                  <span className="shipment-no-tracking">No tracking number</span>
                )}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--admin-muted, #666)", margin: "8px 0", flexWrap: "wrap", gap: 8 }}>
              <div>
                Created: {new Date(shipment.createdAt).toLocaleString()}
                {shipment.deliveredAt && ` · Delivered: ${new Date(shipment.deliveredAt).toLocaleString()}`}
              </div>
              {shipment.shippingCost > 0 && (
                <div>
                  Shipping Cost: <strong>₹{Number(shipment.shippingCost).toFixed(2)}</strong>
                  {shipment.codAmount > 0 && ` · COD to collect: ₹${Number(shipment.codAmount).toFixed(2)}`}
                </div>
              )}
            </div>

            {shipment.labelUrl && (
              <div className="shipment-label-row">
                <FileText size={13} />
                <a href={shipment.labelUrl} target="_blank" rel="noreferrer">
                  View Shipping Label & Packing Slip
                </a>
              </div>
            )}

            <div className="shipment-actions">
              {shipment.trackingNumber && !["delivered", "cancelled", "returned"].includes(shipment.status) && (
                <button
                  className="shipment-action-btn"
                  onClick={() => handleRefreshTracking(shipment.id)}
                  disabled={actionLoading[shipment.id]}
                >
                  {actionLoading[shipment.id] ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />}
                  Sync Tracking
                </button>
              )}

              {!["delivered", "cancelled", "returned"].includes(shipment.status) && (
                <button
                  className="shipment-action-btn"
                  onClick={() => handleLabel(shipment.id)}
                  disabled={actionLoading[`label-${shipment.id}`]}
                >
                  {actionLoading[`label-${shipment.id}`] ? <Loader2 size={13} className="spin" /> : <FileText size={13} />}
                  Generate Label
                </button>
              )}

              {shipment.status === "delivered" && shipment.shipmentType === "delivery" && (
                <button
                  className="shipment-action-btn"
                  onClick={() => {
                    setReturnModal(shipment);
                    setReturnForm({
                      reason: "",
                      pickupAddress: JSON.stringify(shipment.deliveryAddress || {}),
                    });
                  }}
                >
                  <RotateCcw size={13} /> Create Return
                </button>
              )}

              {!["delivered", "cancelled", "returned"].includes(shipment.status) && (
                <button
                  className="shipment-action-btn shipment-action-danger"
                  onClick={() => handleCancel(shipment.id)}
                  disabled={actionLoading[`cancel-${shipment.id}`]}
                >
                  {actionLoading[`cancel-${shipment.id}`] ? <Loader2 size={13} className="spin" /> : <XCircle size={13} />}
                  Cancel
                </button>
              )}

              <button
                className="shipment-action-btn"
                onClick={() => toggleEvents(shipment.id)}
                disabled={actionLoading[`events-${shipment.id}`]}
              >
                {actionLoading[`events-${shipment.id}`] ? (
                  <Loader2 size={13} className="spin" />
                ) : expandedEvents[shipment.id] ? (
                  <ChevronUp size={13} />
                ) : (
                  <ChevronDown size={13} />
                )}
                History
              </button>
            </div>

            {expandedEvents[shipment.id] && (
              <div className="shipment-events">
                {(eventData[shipment.id] || []).length === 0 ? (
                  <p className="shipment-events-empty">No tracking milestones recorded yet.</p>
                ) : (
                  <ol className="shipment-events-list">
                    {(eventData[shipment.id] || []).map((event) => (
                      <li key={event.id} className="shipment-event-item">
                        <div className="event-dot" />
                        <div className="event-body">
                          <span className="event-status">{STATUS_CONFIG[event.status]?.label || event.status}</span>
                          {event.description && <span className="event-desc">{event.description}</span>}
                          {event.location && <span className="event-location"><MapPin size={11} /> {event.location}</span>}
                          <time className="event-time">
                            <Clock size={10} /> {new Date(event.event_time).toLocaleString()}
                          </time>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </article>
        ))}
      </div>

      {/* Return shipment modal */}
      {returnModal && (
        <div className="modal-overlay" onClick={() => setReturnModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3><RotateCcw size={16} /> Create Return Shipment</h3>
            <p style={{ fontSize: 13, color: "var(--admin-muted, #777)", margin: "4px 0 16px 0" }}>
              Generate reverse logistics pickup for return order.
            </p>
            <form onSubmit={handleReturnSubmit}>
              <label style={{ display: "grid", gap: 6, marginBottom: 14, fontSize: 13 }}>
                Reason for Return *
                <textarea
                  required
                  value={returnForm.reason}
                  onChange={(e) => setReturnForm((p) => ({ ...p, reason: e.target.value }))}
                  rows={3}
                  style={{ padding: "8px 10px", border: "1px solid var(--admin-border, #ddd)", borderRadius: 4, fontSize: 13, resize: "vertical" }}
                  placeholder="e.g. Defective item, size exchange, incorrect item received…"
                />
              </label>
              <label style={{ display: "grid", gap: 6, marginBottom: 20, fontSize: 13 }}>
                Customer Pickup Address (JSON or text) *
                <textarea
                  required
                  value={returnForm.pickupAddress}
                  onChange={(e) => setReturnForm((p) => ({ ...p, pickupAddress: e.target.value }))}
                  rows={3}
                  style={{ padding: "8px 10px", border: "1px solid var(--admin-border, #ddd)", borderRadius: 4, fontSize: 13, resize: "vertical" }}
                  placeholder='{"name":"Customer Name","phone":"9876543210","addressLine1":"Flat 4B, Emerald Heights","city":"Mumbai","state":"Maharashtra","country":"India","postalCode":"400001"}'
                />
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" className="admin-button admin-button-dark" disabled={actionLoading[`return-${returnModal.id}`]}>
                  {actionLoading[`return-${returnModal.id}`] ? <Loader2 size={14} className="spin" /> : null}
                  Confirm & Schedule Return
                </button>
                <button type="button" className="admin-button" onClick={() => setReturnModal(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Carriers & Logistics Configuration Modal */}
      {providersModalOpen && (
        <div className="modal-overlay" onClick={() => setProvidersModalOpen(false)}>
          <div className="modal-box" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <Settings size={18} /> Shipping Carrier Providers
              </h3>
              <button
                type="button"
                className="admin-button admin-button-sm"
                onClick={() => setProvidersModalOpen(false)}
              >
                ✕ Close
              </button>
            </div>
            <p style={{ fontSize: 13, color: "var(--admin-muted, #777)", margin: "0 0 16px 0" }}>
              Enable or disable shipping providers, manage carrier priorities, and inspect API credentials.
            </p>

            <div style={{ display: "grid", gap: 10, maxHeight: 420, overflowY: "auto", paddingRight: 4 }}>
              {(providersList.length > 0 ? providersList : [
                { id: "local", code: "local_delivery", name: "Local Delivery Fleet", is_active: true, priority: 100 },
                { id: "pickup", code: "store_pickup", name: "Boutique Store Pickup", is_active: true, priority: 90 },
                { id: "sr", code: "shiprocket", name: "Shiprocket Logistics", is_active: true, priority: 80 },
                { id: "del", code: "delhivery", name: "Delhivery Express", is_active: true, priority: 75 },
                { id: "bd", code: "bluedart", name: "Blue Dart Aviation", is_active: true, priority: 70 },
                { id: "es", code: "easyship", name: "Easyship Global", is_active: true, priority: 65 },
                { id: "shp", code: "shippo", name: "Shippo Multi-Carrier", is_active: true, priority: 60 },
              ]).map((prov) => {
                const isWorking = actionLoading[`toggle-${prov.id}`];
                return (
                  <div
                    key={prov.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 14px",
                      background: prov.is_active ? "#faf8f5" : "#f5f5f5",
                      border: "1px solid #ebd9c2",
                      borderRadius: 6,
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong style={{ fontSize: 13, color: "#1a1714" }}>{prov.name}</strong>
                        <span style={{ fontSize: 10, padding: "1px 6px", background: "#f0ece4", borderRadius: 3, fontFamily: "monospace" }}>
                          {prov.code}
                        </span>
                        {prov.is_default && (
                          <span style={{ fontSize: 10, padding: "1px 6px", background: "#fef3c7", color: "#92400e", borderRadius: 3, fontWeight: 700 }}>
                            Default
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 11, color: "#666" }}>
                        <span>Priority: {prov.priority}</span>
                        {prov.hasEnvApiKey ? (
                          <span style={{ color: "#16a34a", display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <CheckCircle size={11} /> API Key Active (ENV)
                          </span>
                        ) : (
                          <span style={{ color: "#8a6d3b" }}>
                            ⚡ Smart Sandbox Engine Active
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`admin-button admin-button-sm ${prov.is_active ? "admin-button-secondary" : "admin-button-dark"}`}
                      onClick={() => handleToggleProvider(prov)}
                      disabled={isWorking}
                    >
                      {isWorking ? <Loader2 size={12} className="spin" /> : null}
                      {prov.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #e5e5e5", fontSize: 11, color: "#888", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Multi-carrier failover protects rate quoting across all active providers.</span>
              <button
                type="button"
                className="admin-button admin-button-dark admin-button-sm"
                onClick={() => setProvidersModalOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
