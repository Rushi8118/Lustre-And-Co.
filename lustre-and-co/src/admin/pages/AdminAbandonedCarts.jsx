import {
  Clock,
  Mail,
  RefreshCw,
  Search,
  Send,
  ShoppingBag,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState, StatusBadge, Tabs } from "../components/AdminUi";
import { formatDate } from "../utils";
import { useStore } from "../../context/StoreContext";
import {
  getAbandonedCarts,
  processAbandonedCarts,
  sendRecoveryEmail,
} from "../../services/abandonedCarts";
import { formatPrice } from "../../data/products";
import SafeImage from "../../components/SafeImage";

const STATUS_TONES = {
  abandoned: "warning",
  recovery_sent: "info",
  recovered: "success",
  expired: "neutral",
};

export default function AdminAbandonedCarts() {
  const { showToast } = useStore();
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ carts: [], total: 0, totalPages: 1, stats: {} });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getAbandonedCarts({
        status: status === "all" ? undefined : status,
        search: search || undefined,
        page,
        limit: 20,
      });
      setData(response);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load abandoned carts.");
    } finally {
      setLoading(false);
    }
  }, [status, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSendReminder(cart, reminderNumber = 1) {
    if (!cart.customer?.email) {
      showToast("Cannot send reminder: no customer email recorded.", "error");
      return;
    }
    setSendingId(cart.id);
    try {
      await sendRecoveryEmail(cart.cartId || cart.id, reminderNumber);
      showToast(`Recovery email sent to ${cart.customer.email}`, "success");
      load();
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || "Failed to send email.", "error");
    } finally {
      setSendingId(null);
    }
  }

  async function handleProcessNow() {
    setProcessing(true);
    try {
      const result = await processAbandonedCarts();
      showToast(
        result.sent > 0
          ? `Processed: ${result.sent} recovery reminder(s) sent.`
          : "Automated scan complete: no pending carts due for reminders.",
        "success"
      );
      load();
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || "Process failed.", "error");
    } finally {
      setProcessing(false);
    }
  }

  const { stats = {} } = data;
  const totalAll = stats.totalAll ?? ((stats.activePending !== undefined ? stats.activePending : stats.totalAbandoned) !== undefined ? (Number(stats.activePending ?? stats.totalAbandoned) + Number(stats.recoveredCount || 0)) : (data.total || 0));
  const abandonedCount = stats.totalAbandoned ?? 0;
  const reminderSentCount = stats.recoveryEmailsSent ?? 0;
  const recoveredCount = stats.recoveredCount ?? 0;

  const statusTabs = [
    { id: "all", label: `All (${totalAll})` },
    { id: "abandoned", label: `Abandoned (${abandonedCount})` },
    { id: "recovery_sent", label: `Reminder Sent (${reminderSentCount})` },
    { id: "recovered", label: `Recovered (${recoveredCount})` },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Sales Recovery</span>
          <h1>Abandoned Carts</h1>
          <p>Recover lost revenue by sending automated and manual reminders to shoppers.</p>
        </div>
        <div className="admin-actions">
          <Link to="/admin/settings#abandoned-carts" className="admin-button admin-button-light">
            Recovery Settings
          </Link>
          <button
            type="button"
            className="admin-button admin-button-dark"
            onClick={handleProcessNow}
            disabled={processing}
          >
            <RefreshCw size={14} className={processing ? "spin" : ""} />
            {processing ? "Scanning…" : "Process Now"}
          </button>
        </div>
      </div>

      {/* KPI metric cards */}
      <div className="admin-metrics-grid" style={{ marginBottom: 24 }}>
        <div className="admin-metric-card">
          <div className="admin-metric-header">
            <span className="admin-metric-title">Active Abandoned</span>
            <ShoppingBag size={18} className="admin-metric-icon" />
          </div>
          <p className="admin-metric-value">{stats.activePending ?? stats.totalAbandoned ?? 0}</p>
          <span className="admin-metric-sub">Pending customer recovery</span>
        </div>

        <div className="admin-metric-card">
          <div className="admin-metric-header">
            <span className="admin-metric-title">Potential Lost Value</span>
            <AlertCircle size={18} className="admin-metric-icon" />
          </div>
          <p className="admin-metric-value">{formatPrice(stats.totalAbandonedValue || 0)}</p>
          <span className="admin-metric-sub">Value left in pending bags</span>
        </div>

        <div className="admin-metric-card">
          <div className="admin-metric-header">
            <span className="admin-metric-title">Recovered Revenue</span>
            <TrendingUp size={18} className="admin-metric-icon" />
          </div>
          <p className="admin-metric-value">{formatPrice(stats.recoveredValue || 0)}</p>
          <span className="admin-metric-sub">{stats.recoveredCount ?? 0} converted orders</span>
        </div>

        <div className="admin-metric-card">
          <div className="admin-metric-header">
            <span className="admin-metric-title">Recovery Rate</span>
            <CheckCircle size={18} className="admin-metric-icon" />
          </div>
          <p className="admin-metric-value">
            {Number(stats.activePending ?? stats.totalAbandoned ?? 0) + Number(stats.recoveredCount ?? 0) > 0
              ? `${Math.round(
                  (Number(stats.recoveredCount ?? 0) /
                    (Number(stats.activePending ?? stats.totalAbandoned ?? 0) + Number(stats.recoveredCount ?? 0))) *
                    100
                )}%`
              : "0%"}
          </p>
          <span className="admin-metric-sub">{stats.emailsSentTotal ?? stats.recoveryEmailsSent ?? 0} reminder emails sent</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-toolbar" style={{ margin: "20px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <Tabs tabs={statusTabs} active={status} onChange={(tab) => { setStatus(tab); setPage(1); }} />

        <form
          className="admin-search-box"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchInput);
            setPage(1);
          }}
        >
          <Search size={16} className="admin-search-box-icon" />
          <input
            type="text"
            placeholder="Search customer, email, item…"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              if (!e.target.value && search) {
                setSearch("");
                setPage(1);
              }
            }}
          />
          {searchInput && (
            <button
              type="button"
              className="admin-search-clear-btn"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setPage(1);
              }}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </form>
      </div>

      {/* Main Table Content */}
      {loading ? (
        <LoadingState label="Loading abandoned carts…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : data.carts.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No abandoned carts found"
          description={
            search || status !== "all"
              ? "Try adjusting your filters or search term."
              : "No customers have left items in their cart past the inactivity threshold."
          }
        />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Cart Items</th>
                <th>Subtotal</th>
                <th>Abandoned</th>
                <th>Status</th>
                <th>Reminders</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.carts.map((cart) => (
                <tr key={cart.id}>
                  <td>
                    <strong>{cart.customer?.name || "Shopper"}</strong>
                    <div className="admin-table-sub">
                      {cart.customer?.email ? (
                        <a href={`mailto:${cart.customer.email}`}>{cart.customer.email}</a>
                      ) : (
                        <span className="admin-muted">No email identified</span>
                      )}
                    </div>
                    {cart.customer?.phone && (
                      <span className="admin-table-sub">{cart.customer.phone}</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {(cart.items || []).slice(0, 3).map((item, idx) => (
                        <div key={idx} style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                          {item.image && (
                            <SafeImage
                              src={item.image}
                              alt=""
                              style={{ width: 24, height: 24, borderRadius: 4, objectFit: "cover" }}
                            />
                          )}
                          <span>
                            {item.name} × {item.quantity}
                          </span>
                        </div>
                      ))}
                      {cart.items?.length > 3 && (
                        <span className="admin-muted" style={{ fontSize: 12 }}>
                          +{cart.items.length - 3} more items
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <strong>{formatPrice(cart.subtotal)}</strong>
                    <div className="admin-table-sub">{cart.itemCount} items</div>
                  </td>
                  <td>
                    <span>{cart.hoursAgo ? `${cart.hoursAgo}h ago` : "Recently"}</span>
                    <div className="admin-table-sub">{formatDate(cart.abandonedAt)}</div>
                  </td>
                  <td>
                    <StatusBadge
                      status={cart.status}
                      tone={STATUS_TONES[cart.status] || "neutral"}
                    />
                  </td>
                  <td>
                    <span style={{ fontSize: 13 }}>
                      {cart.recoveryEmailCount > 0 ? (
                        <>
                          <Mail size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                          {cart.recoveryEmailCount} sent
                        </>
                      ) : (
                        <span className="admin-muted">None</span>
                      )}
                    </span>
                    {cart.firstReminderSentAt && (
                      <div className="admin-table-sub">
                        1st: {formatDate(cart.firstReminderSentAt)}
                      </div>
                    )}
                    {cart.secondReminderSentAt && (
                      <div className="admin-table-sub">
                        2nd: {formatDate(cart.secondReminderSentAt)}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {cart.status !== "recovered" && (
                      <button
                        type="button"
                        className="admin-button admin-button-sm admin-button-light"
                        onClick={() =>
                          handleSendReminder(
                            cart,
                            cart.recoveryEmailCount >= 1 ? 2 : 1
                          )
                        }
                        disabled={sendingId === cart.id || !cart.customer?.email}
                        title={
                          cart.customer?.email
                            ? "Send recovery reminder email"
                            : "No email address found for this cart"
                        }
                      >
                        <Send size={12} />
                        {sendingId === cart.id ? "Sending…" : "Send Email"}
                      </button>
                    )}
                    {cart.status === "recovered" && cart.recoveredOrderId && (
                      <span className="admin-table-sub" style={{ color: "#22c55e", fontWeight: 600 }}>
                        Order {cart.recoveredOrderId}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
