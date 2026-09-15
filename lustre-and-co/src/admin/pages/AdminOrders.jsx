import { Download, Eye, Search, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import AdminTable from "../components/AdminTable";
import AdminModal from "../components/AdminModal";
import { ErrorState, FormError, LoadingState, StatusBadge, Tabs } from "../components/AdminUi";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  downloadCsv,
  formatAdminPrice,
  formatDate,
  formatDateTime,
  orderStatusTone,
  paymentMethodLabel,
  paymentTone
} from "../utils";
import { useStore } from "../../context/StoreContext";
import api, { getErrorMessage } from "../../services/api";

const PAGE_SIZE = 25;

function OrderDetail({ orderId, onClose, onChanged }) {
  const { showToast } = useStore();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ status: "", carrier: "", trackingNumber: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    try {
      const { data: response } = await api.get(`/admin/orders/${orderId}`);
      setData(response);
      setForm({
        status: response.order.status,
        carrier: response.order.carrier || "",
        trackingNumber: response.order.trackingNumber || "",
        note: ""
      });
    } catch (err) {
      setError(getErrorMessage(err, "Order could not be loaded."));
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveFulfilment(event) {
    event.preventDefault();
    if (form.status === "Cancelled" && data.order.status !== "Cancelled") {
      if (!window.confirm("Cancel this order? Items are returned to stock. Refunds for paid orders must be issued in your payment gateway.")) return;
    }
    setSaving(true);
    setFormError("");
    try {
      const { data: response } = await api.patch(`/admin/orders/${orderId}/status`, {
        status: form.status,
        carrier: form.carrier.trim() || undefined,
        trackingNumber: form.trackingNumber.trim(),
        note: form.note.trim() || undefined
      });
      showToast(response.message, "success");
      await load();
      onChanged();
    } catch (err) {
      setFormError(getErrorMessage(err, "The order could not be updated."));
    } finally {
      setSaving(false);
    }
  }

  async function changePayment(status) {
    try {
      const { data: response } = await api.patch(`/admin/orders/${orderId}/payment`, { status });
      showToast(response.message, "success");
      await load();
      onChanged();
    } catch (err) {
      showToast(getErrorMessage(err, "Payment status could not be changed."), "error");
    }
  }

  const order = data?.order;

  return (
    <AdminModal open onClose={onClose} title={`Order ${orderId}`} description={order ? `Placed ${formatDateTime(order.createdAt)}` : undefined} wide>
      {error && <ErrorState message={error} onRetry={load} />}
      {!order && !error && <LoadingState label="Loading order…" />}

      {order && (
        <>
          <div className="admin-detail-grid">
            <div className="admin-detail-card">
              <h3>Customer</h3>
              <strong>{order.customer.fullName}</strong>
              <div>
                <a href={`mailto:${order.customer.email}`}>{order.customer.email}</a>
              </div>
              <div>{order.customer.phone}</div>
              <div className="admin-muted">{order.user ? "Registered customer" : "Guest checkout"}</div>
            </div>

            <div className="admin-detail-card">
              <h3>Ship to</h3>
              <div>{order.shippingAddress.address}</div>
              <div>
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
              </div>
              <div>{order.shippingAddress.country}</div>
              <div className="admin-muted">
                {order.deliveryOption === "express" ? "Express delivery" : "Standard delivery"} · Est. {order.estimatedDeliveryDate}
              </div>
              {order.notes && <div>Note: {order.notes}</div>}
            </div>

            <div className="admin-detail-card full">
              <h3>Items</h3>
              <div className="admin-line-items">
                {order.items.map((item, index) => (
                  <div className="admin-line-item" key={index}>
                    <img src={item.image} alt={item.name} />
                    <div>
                      <strong>{item.name}</strong>
                      <small>
                        {item.color}
                        {item.size ? ` · ${item.size}` : ""} · {item.quantity} × {formatAdminPrice(item.price)}
                      </small>
                    </div>
                    <strong>{formatAdminPrice(item.price * item.quantity)}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-detail-card">
              <h3>Totals</h3>
              <dl className="admin-kv">
                <dt>Subtotal</dt>
                <dd>{formatAdminPrice(order.subtotal)}</dd>
                {order.discount > 0 && (
                  <>
                    <dt>Discount {order.promoCode ? `(${order.promoCode})` : ""}</dt>
                    <dd>-{formatAdminPrice(order.discount)}</dd>
                  </>
                )}
                <dt>Shipping</dt>
                <dd>{formatAdminPrice(order.shippingFee)}</dd>
                {order.deliverySurcharge > 0 && (
                  <>
                    <dt>Express</dt>
                    <dd>{formatAdminPrice(order.deliverySurcharge)}</dd>
                  </>
                )}
                <dt>Tax</dt>
                <dd>{formatAdminPrice(order.tax)}</dd>
                <dt>
                  <strong>Total</strong>
                </dt>
                <dd>
                  <strong>{formatAdminPrice(order.total)}</strong>
                </dd>
              </dl>
            </div>

            <div className="admin-detail-card">
              <h3>Payment</h3>
              <dl className="admin-kv">
                <dt>Method</dt>
                <dd>{paymentMethodLabel(order.payment?.method)}</dd>
                <dt>Status</dt>
                <dd>
                  <StatusBadge tone={paymentTone(order.payment?.status)}>{order.payment?.status}</StatusBadge>
                </dd>
                <dt>Transaction</dt>
                <dd>{order.payment?.transactionId || "—"}</dd>
                <dt>Paid at</dt>
                <dd>{formatDateTime(order.payment?.paidAt)}</dd>
              </dl>
              <div className="admin-toolbar-group" style={{ marginTop: 12 }}>
                <select className="admin-select" value={order.payment?.status} onChange={(e) => changePayment(e.target.value)} aria-label="Change payment status">
                  {PAYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      Mark as {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="admin-detail-card full">
              <h3>Fulfilment</h3>
              <form className="admin-form-grid" onSubmit={saveFulfilment}>
                <label>
                  Status
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} disabled={order.status === "Cancelled"}>
                    {ORDER_STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Carrier
                  <input value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} />
                </label>
                <label>
                  Tracking number
                  <input value={form.trackingNumber} onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })} />
                </label>
                <label>
                  Note (shown in the customer’s tracking history)
                  <input value={form.note} maxLength={300} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                </label>
                <FormError message={formError} />
                <div className="admin-modal-actions">
                  <button type="submit" className="admin-button admin-button-dark" disabled={saving || order.status === "Cancelled"}>
                    {saving ? "Saving…" : "Update order"}
                  </button>
                </div>
              </form>
              {order.status === "Cancelled" && <p className="admin-muted">Cancelled orders cannot be reopened. Stock has been returned.</p>}
            </div>

            {order.statusHistory?.length > 0 && (
              <div className="admin-detail-card full">
                <h3>History</h3>
                <ol className="admin-history">
                  {[...order.statusHistory].reverse().map((entry, index) => (
                    <li key={index}>
                      <strong>{entry.status}</strong>
                      {entry.note ? ` — ${entry.note}` : ""}
                      <time>{formatDateTime(entry.at)}</time>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </>
      )}
    </AdminModal>
  );
}

export default function AdminOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { refreshAttention } = useOutletContext();

  const [data, setData] = useState({ orders: [], total: 0, totalPages: 1, statusCounts: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");
  const [openOrderId, setOpenOrderId] = useState(null);

  const status = searchParams.get("status") || "all";
  const paymentStatus = searchParams.get("payment") || "all";
  const search = searchParams.get("search") || "";
  const page = Number(searchParams.get("page") || 1);

  const updateParams = (patch) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (!value || value === "all" || (key === "page" && value === 1)) next.delete(key);
      else next.set(key, value);
    });
    setSearchParams(next);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: response } = await api.get("/admin/orders", {
        params: { status, paymentStatus, search: search || undefined, page, limit: PAGE_SIZE }
      });
      setData(response);
    } catch (err) {
      setError(getErrorMessage(err, "Orders could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [status, paymentStatus, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  function exportCsv() {
    downloadCsv(`orders-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Order ID", "Date", "Customer", "Email", "Phone", "Items", "Total", "Payment method", "Payment status", "Status", "Tracking"],
      ...data.orders.map((o) => [
        o.orderId,
        formatDate(o.createdAt),
        o.customer?.fullName,
        o.customer?.email,
        o.customer?.phone,
        o.items.reduce((sum, i) => sum + i.quantity, 0),
        o.total,
        o.payment?.method,
        o.payment?.status,
        o.status,
        o.trackingNumber
      ])
    ]);
  }

  const counts = data.statusCounts || {};
  const totalAll = Object.values(counts).reduce((sum, n) => sum + n, 0);

  const columns = [
    {
      key: "orderId",
      label: "Order",
      render: (row) => (
        <div>
          <button type="button" className="admin-link-button" onClick={() => setOpenOrderId(row.orderId)}>
            #{row.orderId}
          </button>
          <small className="admin-table-subtext">{formatDateTime(row.createdAt)}</small>
        </div>
      )
    },
    {
      key: "customer",
      label: "Customer",
      render: (row) => (
        <div className="admin-customer-cell">
          <span className="customer-initial">{(row.customer?.fullName || "G").slice(0, 1)}</span>
          <div>
            <strong>{row.customer?.fullName}</strong>
            <small>{row.customer?.email}</small>
          </div>
        </div>
      )
    },
    { key: "items", label: "Items", render: (row) => row.items.reduce((sum, i) => sum + i.quantity, 0) },
    { key: "total", label: "Total", render: (row) => <strong>{formatAdminPrice(row.total)}</strong> },
    {
      key: "payment",
      label: "Payment",
      render: (row) => (
        <div>
          <StatusBadge tone={paymentTone(row.payment?.status)}>{row.payment?.status}</StatusBadge>
          <small className="admin-table-subtext">{paymentMethodLabel(row.payment?.method)}</small>
        </div>
      )
    },
    { key: "status", label: "Status", render: (row) => <StatusBadge tone={orderStatusTone(row.status)}>{row.status}</StatusBadge> },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <button className="admin-action-button" onClick={() => setOpenOrderId(row.orderId)} title="View & update">
          <Eye size={15} />
        </button>
      )
    }
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Sales</span>
          <h1>Orders</h1>
          <p>Review orders, update fulfilment and payment status, and track deliveries.</p>
        </div>
        <div className="admin-heading-actions">
          <button type="button" className="admin-button admin-button-light" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? "spin-icon" : ""} /> Refresh
          </button>
          <button className="admin-button admin-button-light" onClick={exportCsv} disabled={!data.orders.length}>
            <Download size={16} /> Export page (CSV)
          </button>
        </div>
      </div>

      <Tabs
        value={status}
        onChange={(value) => updateParams({ status: value, page: 1 })}
        tabs={[{ value: "all", label: "All", count: totalAll }, ...ORDER_STATUSES.map((s) => ({ value: s, label: s, count: counts[s] || 0 }))]}
      />

      <section className="admin-panel">
        <div className="admin-toolbar">
          <form
            className="admin-table-search"
            onSubmit={(e) => {
              e.preventDefault();
              updateParams({ search: searchInput.trim(), page: 1 });
            }}
          >
            <Search size={16} />
            <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Order ID, name, email, or phone — press Enter" />
          </form>

          <select className="admin-select" value={paymentStatus} onChange={(e) => updateParams({ payment: e.target.value, page: 1 })}>
            <option value="all">All payments</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                Payment {s}
              </option>
            ))}
          </select>
        </div>

        {error && <ErrorState message={error} onRetry={load} />}
        {loading && !data.orders.length ? (
          <LoadingState label="Loading orders…" />
        ) : (
          <AdminTable columns={columns} rows={data.orders.map((o) => ({ ...o, id: o._id }))} emptyMessage="No orders match these filters." />
        )}

        {data.totalPages > 1 && (
          <div className="admin-pagination">
            <span>
              Page {page} of {data.totalPages} · {data.total} orders
            </span>
            <button className="admin-button admin-button-light" disabled={page <= 1} onClick={() => updateParams({ page: page - 1 })}>
              Previous
            </button>
            <button className="admin-button admin-button-light" disabled={page >= data.totalPages} onClick={() => updateParams({ page: page + 1 })}>
              Next
            </button>
          </div>
        )}
      </section>

      {openOrderId && (
        <OrderDetail
          orderId={openOrderId}
          onClose={() => setOpenOrderId(null)}
          onChanged={() => {
            load();
            refreshAttention();
          }}
        />
      )}
    </div>
  );
}
