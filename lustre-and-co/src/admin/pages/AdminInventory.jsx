import { useEffect, useRef, useState } from "react";
import {
  Package,
  AlertTriangle,
  CheckCircle,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  XCircle,
  TrendingDown,
  ClipboardList,
  Plus,
  Loader2,
  BarChart3,
} from "lucide-react";
import {
  adjustInventory,
  acknowledgeInventoryAlert,
  getInventory,
  getInventoryAlerts,
  getInventoryMovements,
  getSuppliers,
  getPurchaseOrders,
  createPurchaseOrder,
  createSupplier,
  refreshInventoryAlerts,
} from "../../services/inventory";

const MOVEMENT_LABELS = {
  opening_stock: "Opening Stock",
  purchase_received: "Purchase Received",
  sale: "Sale",
  reservation: "Reservation",
  reservation_release: "Reservation Released",
  reservation_commit: "Reservation Committed",
  manual_adjustment: "Manual Adjustment",
  damage: "Damage",
  damage_reversal: "Damage Reversal",
  return: "Customer Return",
  refund_restock: "Refund Restock",
  write_off: "Write-off",
  transfer_in: "Transfer In",
  transfer_out: "Transfer Out",
  stock_count: "Stock Count",
};

function StockBadge({ value, reorderLevel }) {
  if (value <= 0) return <span className="inv-badge inv-badge-danger">Out of stock</span>;
  if (value <= reorderLevel) return <span className="inv-badge inv-badge-warning">Low: {value}</span>;
  return <span className="inv-badge inv-badge-good">{value}</span>;
}

export default function AdminInventory() {
  const [tab, setTab] = useState("stock");
  const [products, setProducts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ msg: "", type: "" });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | low | out
  const [adjOpen, setAdjOpen] = useState(false);
  const [poOpen, setPoOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [productMovements, setProductMovements] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(false);

  const [adj, setAdj] = useState({
    productId: "",
    quantity: "",
    movementType: "manual_adjustment",
    reason: "",
  });

  const [newSupplier, setNewSupplier] = useState({
    name: "", code: "", contactName: "", email: "", phone: "",
    address: "", city: "", state: "", country: "", paymentTerms: "",
  });

  const [po, setPo] = useState({
    supplierId: "", expectedDeliveryDate: "", notes: "",
    tax: "0", shipping: "0", items: [],
  });

  const searchTimer = useRef(null);

  async function load(q = search) {
    setLoading(true);
    try {
      const params = { search: q };
      if (filter === "low") params.lowStock = "true";
      if (filter === "out") params.outOfStock = "true";

      const [inv, alertsRes, suppRes, poRes] = await Promise.all([
        getInventory(params),
        getInventoryAlerts({ status: "open" }),
        getSuppliers(),
        getPurchaseOrders(),
      ]);

      setProducts(inv.products || []);
      setAlerts(alertsRes || []);
      setSuppliers(suppRes || []);
      setPurchaseOrders(poRes || []);
    } catch {
      setStatus({ msg: "Could not load inventory data.", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function loadMovements() {
    const { data } = await getInventoryMovements({ limit: 50 });
    setMovements(data?.movements || []);
  }

  useEffect(() => { load(); }, [filter]);

  function handleSearchChange(e) {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(val), 400);
  }

  async function handleAdjust(e) {
    e.preventDefault();
    setStatus({ msg: "", type: "" });
    try {
      await adjustInventory({ ...adj, quantity: Number(adj.quantity) });
      setStatus({ msg: "Stock adjusted successfully.", type: "success" });
      setAdj({ productId: "", quantity: "", movementType: "manual_adjustment", reason: "" });
      setAdjOpen(false);
      await load();
    } catch (err) {
      setStatus({ msg: err?.response?.data?.message || "Adjustment failed.", type: "error" });
    }
  }

  async function handleCreateSupplier(e) {
    e.preventDefault();
    setStatus({ msg: "", type: "" });
    try {
      await createSupplier(newSupplier);
      setStatus({ msg: "Supplier created.", type: "success" });
      setNewSupplier({ name: "", code: "", contactName: "", email: "", phone: "", address: "", city: "", state: "", country: "", paymentTerms: "" });
      setSupplierOpen(false);
      await load();
    } catch (err) {
      setStatus({ msg: err?.response?.data?.message || "Could not create supplier.", type: "error" });
    }
  }

  async function handleCreatePO(e) {
    e.preventDefault();
    setStatus({ msg: "", type: "" });
    try {
      const items = products
        .filter((p) => po.items.find((i) => i.productId === p.id))
        .map((p) => {
          const entry = po.items.find((i) => i.productId === p.id);
          return { productId: p.id, quantity: Number(entry.quantity), unitCost: Number(entry.unitCost) };
        });

      await createPurchaseOrder({
        supplierId: po.supplierId,
        expectedDeliveryDate: po.expectedDeliveryDate || undefined,
        notes: po.notes || undefined,
        tax: Number(po.tax || 0),
        shipping: Number(po.shipping || 0),
        items,
      });
      setStatus({ msg: "Purchase order created.", type: "success" });
      setPoOpen(false);
      setPo({ supplierId: "", expectedDeliveryDate: "", notes: "", tax: "0", shipping: "0", items: [] });
      await load();
    } catch (err) {
      setStatus({ msg: err?.response?.data?.message || "Could not create purchase order.", type: "error" });
    }
  }

  async function handleAcknowledge(id) {
    await acknowledgeInventoryAlert(id);
    await load();
  }

  async function handleRefreshAlerts() {
    setStatus({ msg: "", type: "" });
    try {
      await refreshInventoryAlerts();
      setStatus({ msg: "Alerts refreshed.", type: "success" });
      await load();
    } catch {
      setStatus({ msg: "Alert refresh failed.", type: "error" });
    }
  }

  async function toggleProductMovements(productId) {
    if (expandedProduct === productId) {
      setExpandedProduct(null);
      setProductMovements([]);
      return;
    }
    setExpandedProduct(productId);
    setMovementsLoading(true);
    try {
      const res = await getInventoryMovements({ productId, limit: 20 });
      setProductMovements(res.movements || []);
    } catch {
      setProductMovements([]);
    } finally {
      setMovementsLoading(false);
    }
  }

  function addPoItem(productId) {
    if (po.items.find((i) => i.productId === productId)) return;
    setPo((prev) => ({ ...prev, items: [...prev.items, { productId, quantity: "1", unitCost: "0" }] }));
  }

  function updatePoItem(productId, field, value) {
    setPo((prev) => ({
      ...prev,
      items: prev.items.map((i) => i.productId === productId ? { ...i, [field]: value } : i),
    }));
  }

  function removePoItem(productId) {
    setPo((prev) => ({ ...prev, items: prev.items.filter((i) => i.productId !== productId) }));
  }

  const openAlerts = alerts.filter((a) => a.status === "open");
  const lowStockCount = products.filter((p) => p.availableStock > 0 && p.availableStock <= p.reorderLevel).length;
  const outStockCount = products.filter((p) => p.availableStock <= 0).length;

  return (
    <main className="admin-page">
      <header className="admin-page-heading">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>Inventory Management</h1>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="admin-button" onClick={handleRefreshAlerts} title="Refresh alerts">
            <RefreshCw size={15} /> Refresh Alerts
          </button>
          <a
            className="admin-button admin-button-dark"
            href="/api/admin/inventory/export.csv"
            target="_blank"
            rel="noreferrer"
          >
            <Download size={15} /> Export CSV
          </a>
        </div>
      </header>

      {/* Stat cards */}
      <div className="inv-stats-row">
        <div className="inv-stat-card">
          <BarChart3 size={20} className="inv-stat-icon inv-stat-icon-blue" />
          <div>
            <span className="inv-stat-num">{products.length}</span>
            <span className="inv-stat-label">Total Products</span>
          </div>
        </div>
        <div className="inv-stat-card">
          <TrendingDown size={20} className="inv-stat-icon inv-stat-icon-yellow" />
          <div>
            <span className="inv-stat-num">{lowStockCount}</span>
            <span className="inv-stat-label">Low Stock</span>
          </div>
        </div>
        <div className="inv-stat-card">
          <XCircle size={20} className="inv-stat-icon inv-stat-icon-red" />
          <div>
            <span className="inv-stat-num">{outStockCount}</span>
            <span className="inv-stat-label">Out of Stock</span>
          </div>
        </div>
        <div className="inv-stat-card">
          <AlertTriangle size={20} className="inv-stat-icon inv-stat-icon-orange" />
          <div>
            <span className="inv-stat-num">{openAlerts.length}</span>
            <span className="inv-stat-label">Open Alerts</span>
          </div>
        </div>
      </div>

      {/* Open alerts banner */}
      {openAlerts.length > 0 && (
        <div className="inv-alerts-banner">
          <h3><AlertTriangle size={16} /> Stock Alerts</h3>
          <div className="inv-alerts-list">
            {openAlerts.map((alert) => (
              <div key={alert.id} className={`inv-alert-row inv-alert-${alert.alert_type}`}>
                <div>
                  <strong>{alert.alert_type === "out_of_stock" ? "Out of Stock" : "Low Stock"}</strong>
                  <span>{alert.message}</span>
                </div>
                <button
                  className="inv-alert-ack-btn"
                  onClick={() => handleAcknowledge(alert.id)}
                >
                  <CheckCircle size={14} /> Acknowledge
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <div className="inv-tabs">
        {[
          { id: "stock", label: "Stock Levels", icon: Package },
          { id: "movements", label: "Movements", icon: ClipboardList },
          { id: "suppliers", label: "Suppliers", icon: ClipboardList },
          { id: "po", label: "Purchase Orders", icon: ClipboardList },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`inv-tab ${tab === id ? "active" : ""}`}
            onClick={() => { setTab(id); if (id === "movements") loadMovements(); }}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {status.msg && (
        <p className={`inline-alert ${status.type === "success" ? "inline-alert-success" : "inline-alert-error"}`}>
          {status.msg}
        </p>
      )}

      {/* ── STOCK TAB ── */}
      {tab === "stock" && (
        <>
          <div className="inv-toolbar">
            <div className="inv-search-wrap">
              <Search size={15} />
              <input
                value={search}
                onChange={handleSearchChange}
                placeholder="Search name, SKU, or barcode…"
              />
              {search && (
                <button
                  type="button"
                  className="inv-search-clear"
                  onClick={() => {
                    setSearch("");
                    clearTimeout(searchTimer.current);
                    load("");
                  }}
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <div className="inv-filter-group">
              {[
                { id: "all", label: "All" },
                { id: "low", label: "Low Stock" },
                { id: "out", label: "Out of Stock" },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  className={`inv-filter-btn ${filter === id ? "active" : ""}`}
                  onClick={() => setFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              className="admin-button"
              onClick={() => setAdjOpen((v) => !v)}
            >
              <Plus size={14} /> Adjust Stock
            </button>
          </div>

          {/* Adjustment form */}
          {adjOpen && (
            <form className="inv-adj-form" onSubmit={handleAdjust}>
              <h3>Manual Stock Adjustment</h3>
              <div className="inv-adj-grid">
                <label>
                  Product
                  <select value={adj.productId} onChange={(e) => setAdj((p) => ({ ...p, productId: e.target.value }))} required>
                    <option value="">Select product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}{p.sku ? ` — ${p.sku}` : ""}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Quantity (+/−)
                  <input type="number" value={adj.quantity} onChange={(e) => setAdj((p) => ({ ...p, quantity: e.target.value }))} placeholder="e.g. 10 or -2" required />
                </label>
                <label>
                  Type
                  <select value={adj.movementType} onChange={(e) => setAdj((p) => ({ ...p, movementType: e.target.value }))}>
                    <option value="manual_adjustment">Manual Adjustment</option>
                    <option value="opening_stock">Opening Stock</option>
                    <option value="damage">Damaged</option>
                    <option value="return">Customer Return</option>
                    <option value="refund_restock">Refund Restock</option>
                    <option value="write_off">Write-off</option>
                  </select>
                </label>
                <label>
                  Reason
                  <input value={adj.reason} onChange={(e) => setAdj((p) => ({ ...p, reason: e.target.value }))} required placeholder="Brief reason for adjustment" />
                </label>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button type="submit" className="admin-button admin-button-dark">Save Adjustment</button>
                <button type="button" className="admin-button" onClick={() => setAdjOpen(false)}>Cancel</button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="admin-loading"><Loader2 size={24} className="spin" /> Loading inventory…</div>
          ) : (
            <div className="inv-table-wrap">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>On Hand</th>
                    <th>Reserved</th>
                    <th>Damaged</th>
                    <th>Available</th>
                    <th>Reorder At</th>
                    <th>History</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: "center", padding: "32px", opacity: 0.5 }}>No products found</td></tr>
                  )}
                  {products.map((product) => (
                    <>
                      <tr key={product.id}>
                        <td>
                          <div className="inv-product-name">{product.name}</div>
                          {product.warehouseLocation && <small className="inv-location">{product.warehouseLocation}</small>}
                        </td>
                        <td className="inv-mono">{product.sku || "—"}</td>
                        <td className="inv-mono">{product.stockQuantity}</td>
                        <td className="inv-mono">{product.reservedStock}</td>
                        <td className="inv-mono">{product.damagedStock > 0 ? <span className="inv-damaged">{product.damagedStock}</span> : "0"}</td>
                        <td>
                          <StockBadge value={product.availableStock} reorderLevel={product.reorderLevel} />
                        </td>
                        <td className="inv-mono">{product.reorderLevel}</td>
                        <td>
                          <button
                            className="inv-history-btn"
                            onClick={() => toggleProductMovements(product.id)}
                          >
                            {expandedProduct === product.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                      </tr>
                      {expandedProduct === product.id && (
                        <tr key={`${product.id}-movements`}>
                          <td colSpan={8} className="inv-movements-cell">
                            {movementsLoading ? (
                              <p style={{ padding: "12px", opacity: 0.6 }}>Loading movements…</p>
                            ) : productMovements.length === 0 ? (
                              <p style={{ padding: "12px", opacity: 0.5 }}>No movements recorded yet.</p>
                            ) : (
                              <table className="inv-movements-table">
                                <thead>
                                  <tr>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Qty</th>
                                    <th>Stock Before</th>
                                    <th>Stock After</th>
                                    <th>Reason</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {productMovements.map((m) => (
                                    <tr key={m.id}>
                                      <td>{new Date(m.created_at).toLocaleDateString()}</td>
                                      <td>{MOVEMENT_LABELS[m.movement_type] || m.movement_type}</td>
                                      <td className={m.quantity > 0 ? "inv-pos" : m.quantity < 0 ? "inv-neg" : ""}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                                      <td>{m.stock_before}</td>
                                      <td>{m.stock_after}</td>
                                      <td>{m.reason || "—"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── MOVEMENTS TAB ── */}
      {tab === "movements" && (
        <div className="inv-table-wrap">
          <table className="inv-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Before</th>
                <th>After</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "32px", opacity: 0.5 }}>No movements yet</td></tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id}>
                    <td>{new Date(m.created_at).toLocaleDateString()}</td>
                    <td className="inv-mono" style={{ fontSize: 11 }}>{m.product_id?.slice(0, 8)}…</td>
                    <td><span className="inv-type-badge">{MOVEMENT_LABELS[m.movement_type] || m.movement_type}</span></td>
                    <td className={m.quantity > 0 ? "inv-pos" : m.quantity < 0 ? "inv-neg" : ""}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                    <td>{m.stock_before}</td>
                    <td>{m.stock_after}</td>
                    <td>{m.reason || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── SUPPLIERS TAB ── */}
      {tab === "suppliers" && (
        <>
          <div style={{ marginBottom: 16 }}>
            <button className="admin-button" onClick={() => setSupplierOpen((v) => !v)}>
              <Plus size={14} /> Add Supplier
            </button>
          </div>

          {supplierOpen && (
            <form className="inv-adj-form" onSubmit={handleCreateSupplier}>
              <h3>New Supplier</h3>
              <div className="inv-adj-grid">
                {[
                  { key: "name", label: "Name*", required: true },
                  { key: "code", label: "Code" },
                  { key: "contactName", label: "Contact Name" },
                  { key: "email", label: "Email" },
                  { key: "phone", label: "Phone" },
                  { key: "city", label: "City" },
                  { key: "country", label: "Country" },
                  { key: "paymentTerms", label: "Payment Terms" },
                ].map(({ key, label, required }) => (
                  <label key={key}>
                    {label}
                    <input
                      value={newSupplier[key]}
                      onChange={(e) => setNewSupplier((p) => ({ ...p, [key]: e.target.value }))}
                      required={required}
                    />
                  </label>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button type="submit" className="admin-button admin-button-dark">Save Supplier</button>
                <button type="button" className="admin-button" onClick={() => setSupplierOpen(false)}>Cancel</button>
              </div>
            </form>
          )}

          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Payment Terms</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: "32px", opacity: 0.5 }}>No suppliers yet</td></tr>
                ) : suppliers.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.name}</strong></td>
                    <td className="inv-mono">{s.code || "—"}</td>
                    <td>{s.contact_name || "—"}</td>
                    <td>{s.email || "—"}</td>
                    <td>{s.phone || "—"}</td>
                    <td>{s.payment_terms || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── PURCHASE ORDERS TAB ── */}
      {tab === "po" && (
        <>
          <div style={{ marginBottom: 16 }}>
            <button className="admin-button" onClick={() => setPoOpen((v) => !v)} disabled={suppliers.length === 0}>
              <Plus size={14} /> New Purchase Order
            </button>
            {suppliers.length === 0 && <small style={{ marginLeft: 10, opacity: 0.6 }}>Add a supplier first</small>}
          </div>

          {poOpen && (
            <form className="inv-adj-form" onSubmit={handleCreatePO}>
              <h3>New Purchase Order</h3>
              <div className="inv-adj-grid">
                <label>
                  Supplier*
                  <select value={po.supplierId} onChange={(e) => setPo((p) => ({ ...p, supplierId: e.target.value }))} required>
                    <option value="">Select supplier</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
                <label>
                  Expected Delivery
                  <input type="date" value={po.expectedDeliveryDate} onChange={(e) => setPo((p) => ({ ...p, expectedDeliveryDate: e.target.value }))} />
                </label>
                <label>
                  Tax (₹)
                  <input type="number" min="0" value={po.tax} onChange={(e) => setPo((p) => ({ ...p, tax: e.target.value }))} />
                </label>
                <label>
                  Shipping (₹)
                  <input type="number" min="0" value={po.shipping} onChange={(e) => setPo((p) => ({ ...p, shipping: e.target.value }))} />
                </label>
              </div>

              <div style={{ marginTop: 16 }}>
                <h4 style={{ marginBottom: 10 }}>Line Items</h4>
                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <select onChange={(e) => addPoItem(e.target.value)} value="">
                    <option value="">Add product…</option>
                    {products.filter((p) => !po.items.find((i) => i.productId === p.id)).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                {po.items.map((item) => {
                  const product = products.find((p) => p.id === item.productId);
                  return (
                    <div key={item.productId} className="inv-po-item-row">
                      <span>{product?.name}</span>
                      <label>Qty <input type="number" min="1" value={item.quantity} onChange={(e) => updatePoItem(item.productId, "quantity", e.target.value)} style={{ width: 70 }} /></label>
                      <label>Unit Cost <input type="number" min="0" step="0.01" value={item.unitCost} onChange={(e) => updatePoItem(item.productId, "unitCost", e.target.value)} style={{ width: 90 }} /></label>
                      <button type="button" onClick={() => removePoItem(item.productId)}><XCircle size={14} /></button>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button type="submit" className="admin-button admin-button-dark" disabled={po.items.length === 0 || !po.supplierId}>Create PO</button>
                <button type="button" className="admin-button" onClick={() => setPoOpen(false)}>Cancel</button>
              </div>
            </form>
          )}

          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Supplier</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Expected</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: "32px", opacity: 0.5 }}>No purchase orders yet</td></tr>
                ) : purchaseOrders.map((po) => (
                  <tr key={po.id}>
                    <td className="inv-mono"><strong>{po.purchase_order_number}</strong></td>
                    <td>{po.supplier?.name || "—"}</td>
                    <td><span className={`inv-po-status inv-po-${po.status}`}>{po.status.replace("_", " ")}</span></td>
                    <td>₹{Number(po.total).toLocaleString()}</td>
                    <td>{po.expected_delivery_date || "—"}</td>
                    <td>{new Date(po.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
