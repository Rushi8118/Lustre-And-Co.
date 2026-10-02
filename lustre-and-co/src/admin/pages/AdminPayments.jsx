import { RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminTable from "../components/AdminTable";
import { ErrorState, LoadingState, StatusBadge } from "../components/AdminUi";
import { PAYMENT_STATUSES, formatAdminPrice, formatDateTime, paymentMethodLabel, paymentTone } from "../utils";
import { useSettings } from "../../context/SettingsContext";
import api, { getErrorMessage } from "../../services/api";

export default function AdminPayments() {
  const { settings } = useSettings();
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [data, setData] = useState({ payments: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: response } = await api.get("/admin/payments", { params: { status, search: search || undefined } });
      setData(response);
    } catch (err) {
      setError(getErrorMessage(err, "Payments could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = data.summary || {};

  const columns = [
    {
      key: "orderId",
      label: "Order",
      render: (row) => (
        <Link className="admin-table-link" to={`/admin/orders?search=${row.orderId}`}>
          #{row.orderId}
        </Link>
      )
    },
    { key: "method", label: "Method", render: (row) => paymentMethodLabel(row.method) },
    { key: "amount", label: "Amount", render: (row) => <strong>{formatAdminPrice(row.amount)}</strong> },
    { key: "status", label: "Status", render: (row) => <StatusBadge tone={paymentTone(row.status)}>{row.status}</StatusBadge> },
    { key: "transactionId", label: "Transaction", render: (row) => <code>{row.transactionId || "—"}</code> },
    { key: "createdAt", label: "Created", render: (row) => formatDateTime(row.createdAt) },
    { key: "paidAt", label: "Paid", render: (row) => formatDateTime(row.paidAt) }
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Sales</span>
          <h1>Payments</h1>
          <p>
            Payment ledger for every order. Online payments are{" "}
            <strong>{settings.payments.onlineEnabled ? "enabled" : "not configured"}</strong>; cash on delivery is{" "}
            <strong>{settings.payments.codEnabled ? "enabled" : "disabled"}</strong>.
          </p>
        </div>
        <button type="button" className="admin-button admin-button-light" onClick={load} disabled={loading}>
          <RefreshCw size={15} className={loading ? "spin-icon" : ""} /> Refresh
        </button>
      </div>

      <div className="admin-mini-stats">
        {["paid", "pending", "refunded"].map((key) => (
          <div key={key}>
            <span>{key[0].toUpperCase() + key.slice(1)}</span>
            <strong>{formatAdminPrice(summary[key]?.amount || 0)}</strong>
            <small>{summary[key]?.count || 0} payments</small>
          </div>
        ))}
      </div>

      <section className="admin-panel">
        <div className="admin-toolbar">
          <form
            className="admin-table-search"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(searchInput.trim());
            }}
          >
            <Search size={16} />
            <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Order or transaction ID — press Enter" />
          </form>
          <select className="admin-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {error && <ErrorState message={error} onRetry={load} />}
        {loading && !data.payments.length ? (
          <LoadingState />
        ) : (
          <AdminTable columns={columns} rows={data.payments.map((p) => ({ ...p, id: p._id }))} emptyMessage="No payments recorded." />
        )}
      </section>
    </div>
  );
}
