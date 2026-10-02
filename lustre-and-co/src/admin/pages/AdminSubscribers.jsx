import { Download, RefreshCw, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import AdminTable from "../components/AdminTable";
import { ErrorState, LoadingState, StatusBadge } from "../components/AdminUi";
import { downloadCsv, formatDate } from "../utils";
import { useStore } from "../../context/StoreContext";
import api, { getErrorMessage } from "../../services/api";

export default function AdminSubscribers() {
  const { showToast } = useStore();
  const [subscribers, setSubscribers] = useState([]);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/admin/subscribers", { params: { search: search || undefined } });
      setSubscribers(data);
    } catch (err) {
      setError(getErrorMessage(err, "Subscribers could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(row) {
    try {
      await api.patch(`/admin/subscribers/${row._id}`, { isActive: !row.isActive });
      load();
    } catch (err) {
      showToast(getErrorMessage(err, "Could not update the subscriber."), "error");
    }
  }

  async function remove(row) {
    if (!window.confirm(`Remove ${row.email} from the list?`)) return;
    try {
      await api.delete(`/admin/subscribers/${row._id}`);
      showToast("Subscriber removed.", "success");
      load();
    } catch (err) {
      showToast(getErrorMessage(err, "Could not remove the subscriber."), "error");
    }
  }

  const active = subscribers.filter((s) => s.isActive);

  const columns = [
    { key: "email", label: "Email", render: (row) => <strong>{row.email}</strong> },
    { key: "source", label: "Source" },
    { key: "createdAt", label: "Subscribed", render: (row) => formatDate(row.createdAt) },
    {
      key: "isActive",
      label: "Status",
      render: (row) => <StatusBadge tone={row.isActive ? "success" : "info"}>{row.isActive ? "Subscribed" : "Unsubscribed"}</StatusBadge>
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="admin-row-actions">
          <button className="admin-action-button" onClick={() => toggle(row)}>
            {row.isActive ? "Unsubscribe" : "Resubscribe"}
          </button>
          <button className="admin-action-button danger" onClick={() => remove(row)} title="Delete">
            <Trash2 size={15} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Customers</span>
          <h1>Newsletter subscribers</h1>
          <p>
            {active.length} active of {subscribers.length} total.
          </p>
        </div>
        <div className="admin-heading-actions">
          <button type="button" className="admin-button admin-button-light" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? "spin-icon" : ""} /> Refresh
          </button>
          <button
            type="button"
            className="admin-button admin-button-dark"
            disabled={!active.length}
            onClick={() =>
              downloadCsv(`subscribers-${new Date().toISOString().slice(0, 10)}.csv`, [
                ["Email", "Source", "Subscribed"],
                ...active.map((s) => [s.email, s.source, formatDate(s.createdAt)])
              ])
            }
          >
            <Download size={15} /> Export active (CSV)
          </button>
        </div>
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
            <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search email — press Enter" />
          </form>
        </div>
        {error && <ErrorState message={error} onRetry={load} />}
        {loading && !subscribers.length ? (
          <LoadingState />
        ) : (
          <AdminTable columns={columns} rows={subscribers.map((s) => ({ ...s, id: s._id }))} emptyMessage="No subscribers yet." />
        )}
      </section>
    </div>
  );
}
