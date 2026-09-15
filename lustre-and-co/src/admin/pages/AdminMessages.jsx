import { Mail, RefreshCw, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState, StatusBadge, Tabs } from "../components/AdminUi";
import { formatDateTime } from "../utils";
import { useStore } from "../../context/StoreContext";
import api, { getErrorMessage } from "../../services/api";

const TONES = { new: "danger", read: "warning", replied: "success", archived: "info" };

function MessageCard({ message, onUpdate, onDelete }) {
  const [note, setNote] = useState(message.adminNote || "");
  const [expanded, setExpanded] = useState(false);

  function toggle() {
    setExpanded((value) => !value);
    if (!expanded && message.status === "new") onUpdate(message, { status: "read" }, true);
  }

  return (
    <article className={`admin-message-card ${message.status === "new" ? "is-new" : ""}`}>
      <div className="admin-card-row">
        <div>
          <h4>
            <button type="button" className="admin-link-button" onClick={toggle}>
              {message.reason} — {message.name}
            </button>
          </h4>
          <small className="admin-muted">
            {message.email}
            {message.phone ? ` · ${message.phone}` : ""}
            {message.orderId ? ` · Order ${message.orderId}` : ""} · {formatDateTime(message.createdAt)}
          </small>
        </div>
        <StatusBadge tone={TONES[message.status]}>{message.status}</StatusBadge>
      </div>

      <p className="admin-card-body">{expanded ? message.message : `${message.message.slice(0, 180)}${message.message.length > 180 ? "…" : ""}`}</p>

      {expanded && (
        <div className="admin-form-grid">
          <label className="admin-form-full">
            Internal note
            <textarea value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} />
          </label>
          <div className="admin-modal-actions">
            <a
              className="admin-button admin-button-light"
              href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.reason}`)}`}
              onClick={() => onUpdate(message, { status: "replied" })}
            >
              <Mail size={14} /> Reply by email
            </a>
            <select className="admin-select" value={message.status} onChange={(e) => onUpdate(message, { status: e.target.value })}>
              <option value="new">New</option>
              <option value="read">Read</option>
              <option value="replied">Replied</option>
              <option value="archived">Archived</option>
            </select>
            <button type="button" className="admin-button admin-button-dark" onClick={() => onUpdate(message, { adminNote: note })}>
              Save note
            </button>
            <button type="button" className="admin-action-button danger" onClick={() => onDelete(message)} title="Delete">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export default function AdminMessages() {
  const { showToast } = useStore();
  const { refreshAttention } = useOutletContext();
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [data, setData] = useState({ messages: [], counts: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: response } = await api.get("/admin/messages", { params: { status, search: search || undefined } });
      setData(response);
    } catch (err) {
      setError(getErrorMessage(err, "Messages could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    load();
  }, [load]);

  async function update(message, patch, silent = false) {
    try {
      await api.patch(`/admin/messages/${message._id}`, patch);
      if (!silent) showToast("Message updated.", "success");
      load();
      refreshAttention();
    } catch (err) {
      showToast(getErrorMessage(err, "The message could not be updated."), "error");
    }
  }

  async function remove(message) {
    if (!window.confirm("Delete this message?")) return;
    try {
      await api.delete(`/admin/messages/${message._id}`);
      showToast("Message deleted.", "success");
      load();
      refreshAttention();
    } catch (err) {
      showToast(getErrorMessage(err, "The message could not be deleted."), "error");
    }
  }

  const counts = data.counts || {};

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Customers</span>
          <h1>Messages</h1>
          <p>Enquiries sent through the contact form and return requests.</p>
        </div>
        <button type="button" className="admin-button admin-button-light" onClick={load} disabled={loading}>
          <RefreshCw size={15} className={loading ? "spin-icon" : ""} /> Refresh
        </button>
      </div>

      <Tabs
        value={status}
        onChange={setStatus}
        tabs={[
          { value: "all", label: "All", count: Object.values(counts).reduce((a, b) => a + b, 0) },
          { value: "new", label: "New", count: counts.new || 0 },
          { value: "read", label: "Read", count: counts.read || 0 },
          { value: "replied", label: "Replied", count: counts.replied || 0 },
          { value: "archived", label: "Archived", count: counts.archived || 0 }
        ]}
      />

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
            <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Name, email, order, or text — press Enter" />
          </form>
        </div>

        {error && <ErrorState message={error} onRetry={load} />}
        {loading && !data.messages.length && <LoadingState />}
        {!loading && !error && data.messages.length === 0 && <EmptyState title="Inbox is clear">No messages match this filter.</EmptyState>}

        <div className="admin-message-list">
          {data.messages.map((message) => (
            <MessageCard key={message._id} message={message} onUpdate={update} onDelete={remove} />
          ))}
        </div>
      </section>
    </div>
  );
}
