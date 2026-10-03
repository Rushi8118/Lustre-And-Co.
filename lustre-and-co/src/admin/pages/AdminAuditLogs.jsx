import React, { useCallback, useEffect, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RotateCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Globe,
  Terminal,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
} from "lucide-react";
import api, { getErrorMessage } from "../../services/api";

const ACTION_OPTIONS = [
  { value: "", label: "All Actions" },
  { value: "auth.login", label: "Login (auth.login)" },
  { value: "auth.2fa_verify", label: "2FA Verification (auth.2fa_verify)" },
  { value: "auth.2fa_failed", label: "2FA Failure (auth.2fa_failed)" },
  { value: "auth.2fa_enabled", label: "2FA Enabled (auth.2fa_enabled)" },
  { value: "auth.2fa_disabled", label: "2FA Disabled (auth.2fa_disabled)" },
  { value: "auth.refresh", label: "Token Rotation (auth.refresh)" },
  { value: "auth.replay_attack_detected", label: "Replay Attack Detected (CRITICAL)" },
  { value: "auth.logout", label: "Logout (auth.logout)" },
  { value: "order.create", label: "Order Created (order.create)" },
  { value: "order.update", label: "Order Updated (order.update)" },
];

const STATUS_TONES = {
  success: { tone: "success", icon: CheckCircle2, label: "Success" },
  denied: { tone: "danger", icon: ShieldAlert, label: "Denied" },
  failed: { tone: "danger", icon: XCircle, label: "Failed" },
};

function formatDateTime(isoString) {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    return d.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return isoString;
  }
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterAction, setFilterAction] = useState("");
  const [filterResource, setFilterResource] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit };
      if (filterAction) params.action = filterAction;
      if (filterResource) params.resource = filterResource;

      const { data } = await api.get("/admin/audit-logs", { params });
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load audit logs."));
    } finally {
      setLoading(false);
    }
  }, [page, limit, filterAction, filterResource]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit) || 1;

  // Stats
  const deniedCount = logs.filter((l) => l.status === "denied").length;
  const replayAttackCount = logs.filter(
    (l) => l.action === "auth.replay_attack_detected"
  ).length;

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Enterprise Security</span>
          <h1>Security &amp; Audit Logs</h1>
          <p>
            Immutable event ledger tracking administrative operations, authentication sessions, and security anomaly detection.
          </p>
        </div>
        <button
          type="button"
          className="admin-button admin-button-secondary"
          onClick={fetchLogs}
          disabled={loading}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <RotateCw size={15} className={loading ? "admin-spin" : ""} />
          Refresh Ledger
        </button>
      </div>

      {/* Security Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            background: "var(--admin-surface, #ffffff)",
            border: "1px solid var(--admin-border, #e7e5e4)",
            borderRadius: "10px",
            padding: "16px 20px",
          }}
        >
          <span style={{ fontSize: "11px", color: "var(--admin-muted, #78716c)", textTransform: "uppercase", letterSpacing: "1px" }}>
            Total Audit Records
          </span>
          <div style={{ fontSize: "28px", fontWeight: "600", marginTop: "4px" }}>
            {total.toLocaleString()}
          </div>
          <span style={{ fontSize: "12px", color: "#16a34a", display: "flex", alignItems: "center", gap: 4, marginTop: "4px" }}>
            <ShieldCheck size={14} /> Cryptographically logged
          </span>
        </div>

        <div
          style={{
            background: "var(--admin-surface, #ffffff)",
            border: "1px solid var(--admin-border, #e7e5e4)",
            borderRadius: "10px",
            padding: "16px 20px",
          }}
        >
          <span style={{ fontSize: "11px", color: "var(--admin-muted, #78716c)", textTransform: "uppercase", letterSpacing: "1px" }}>
            Denied Attempts (Page)
          </span>
          <div style={{ fontSize: "28px", fontWeight: "600", color: deniedCount > 0 ? "#dc2626" : "inherit", marginTop: "4px" }}>
            {deniedCount}
          </div>
          <span style={{ fontSize: "12px", color: deniedCount > 0 ? "#dc2626" : "var(--admin-muted, #78716c)", display: "flex", alignItems: "center", gap: 4, marginTop: "4px" }}>
            <AlertTriangle size={14} /> {deniedCount > 0 ? "Requires review" : "No recent violations"}
          </span>
        </div>

        <div
          style={{
            background: "var(--admin-surface, #ffffff)",
            border: "1px solid var(--admin-border, #e7e5e4)",
            borderRadius: "10px",
            padding: "16px 20px",
          }}
        >
          <span style={{ fontSize: "11px", color: "var(--admin-muted, #78716c)", textTransform: "uppercase", letterSpacing: "1px" }}>
            Token Replay Breaches
          </span>
          <div style={{ fontSize: "28px", fontWeight: "600", color: replayAttackCount > 0 ? "#dc2626" : "inherit", marginTop: "4px" }}>
            {replayAttackCount}
          </div>
          <span style={{ fontSize: "12px", color: replayAttackCount > 0 ? "#dc2626" : "#16a34a", display: "flex", alignItems: "center", gap: 4, marginTop: "4px" }}>
            {replayAttackCount > 0 ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
            {replayAttackCount > 0 ? "Sessions revoked" : "Zero replay detections"}
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value);
              setPage(1);
            }}
            className="admin-input"
            style={{ padding: "8px 12px", borderRadius: "6px", fontSize: "13px", minWidth: "180px" }}
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <div className="admin-search-wrap" style={{ minWidth: "240px", maxWidth: "340px" }}>
            <Search size={15} />
            <input
              type="text"
              placeholder="Filter by resource (e.g. orders, users)"
              value={filterResource}
              onChange={(e) => {
                setFilterResource(e.target.value);
                setPage(1);
              }}
            />
            {filterResource && (
              <button
                type="button"
                className="admin-search-clear-btn"
                onClick={() => {
                  setFilterResource("");
                  setPage(1);
                }}
                title="Clear filter"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {(filterAction || filterResource) && (
            <button
              type="button"
              className="admin-button admin-button-secondary"
              style={{ fontSize: "12px", padding: "7px 12px" }}
              onClick={() => {
                setFilterAction("");
                setFilterResource("");
                setPage(1);
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        <span style={{ fontSize: "12px", color: "var(--admin-muted, #78716c)" }}>
          Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} events
        </span>
      </div>

      {error && (
        <div
          style={{
            padding: "14px 18px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            color: "#991b1b",
            fontSize: "13px",
            marginBottom: "16px",
          }}
        >
          {error}
        </div>
      )}

      {/* Logs Table */}
      <div
        style={{
          background: "var(--admin-surface, #ffffff)",
          border: "1px solid var(--admin-border, #e7e5e4)",
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--admin-table-head, #f5f5f4)", borderBottom: "1px solid var(--admin-border, #e7e5e4)" }}>
                <th style={{ padding: "12px 16px", fontWeight: "600", color: "#44403c" }}>Timestamp</th>
                <th style={{ padding: "12px 16px", fontWeight: "600", color: "#44403c" }}>Action</th>
                <th style={{ padding: "12px 16px", fontWeight: "600", color: "#44403c" }}>Status</th>
                <th style={{ padding: "12px 16px", fontWeight: "600", color: "#44403c" }}>User &amp; Role</th>
                <th style={{ padding: "12px 16px", fontWeight: "600", color: "#44403c" }}>Target Resource</th>
                <th style={{ padding: "12px 16px", fontWeight: "600", color: "#44403c" }}>IP &amp; Origin</th>
                <th style={{ padding: "12px 16px", fontWeight: "600", color: "#44403c", textAlign: "right" }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: "36px", textAlign: "center", color: "var(--admin-muted, #78716c)" }}>
                    Loading security ledger…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "36px", textAlign: "center", color: "var(--admin-muted, #78716c)" }}>
                    No audit records match the current filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isCritical =
                    log.action === "auth.replay_attack_detected" ||
                    log.status === "denied";

                  return (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: "1px solid var(--admin-border, #e7e5e4)",
                        background: isCritical ? "#fef2f2" : "transparent",
                      }}
                    >
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap", color: "var(--admin-muted, #78716c)", fontSize: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Clock size={13} />
                          {formatDateTime(log.created_at)}
                        </div>
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <code
                          style={{
                            fontFamily: "monospace",
                            fontSize: "12px",
                            padding: "3px 6px",
                            background: isCritical ? "#fee2e2" : "var(--admin-bg, #f5f5f4)",
                            color: isCritical ? "#b91c1c" : "inherit",
                            borderRadius: "4px",
                            fontWeight: isCritical ? "700" : "500",
                          }}
                        >
                          {log.action}
                        </code>
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: "600",
                            textTransform: "uppercase",
                            background:
                              log.status === "success"
                                ? "#dcfce7"
                                : log.status === "denied"
                                ? "#fee2e2"
                                : "#fef3c7",
                            color:
                              log.status === "success"
                                ? "#15803d"
                                : log.status === "denied"
                                ? "#b91c1c"
                                : "#b45309",
                          }}
                        >
                          {log.status || "success"}
                        </span>
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: "500", color: "#1c1917" }}>
                          {log.user_email || "System / Anonymous"}
                        </div>
                        {log.user_role && (
                          <span
                            style={{
                              fontSize: "10px",
                              color: "var(--admin-muted, #78716c)",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Role: {log.user_role}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        {log.resource ? (
                          <span>
                            <strong>{log.resource}</strong>
                            {log.resource_id && (
                              <span style={{ fontSize: "11px", color: "var(--admin-muted, #78716c)", marginLeft: 4 }}>
                                ({log.resource_id.slice(0, 8)}…)
                              </span>
                            )}
                          </span>
                        ) : (
                          <span style={{ color: "var(--admin-muted, #78716c)" }}>—</span>
                        )}
                      </td>

                      <td style={{ padding: "12px 16px", fontSize: "12px", color: "var(--admin-muted, #78716c)" }}>
                        <div>{log.ip_address || "127.0.0.1"}</div>
                        {log.user_agent && (
                          <div
                            style={{
                              fontSize: "10px",
                              maxWidth: "160px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            title={log.user_agent}
                          >
                            {log.user_agent}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="admin-button admin-button-secondary"
                          style={{ padding: "4px 8px", fontSize: "11px" }}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            borderTop: "1px solid var(--admin-border, #e7e5e4)",
            background: "var(--admin-table-head, #f5f5f4)",
          }}
        >
          <span style={{ fontSize: "12px", color: "var(--admin-muted, #78716c)" }}>
            Page {page} of {totalPages}
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="admin-button admin-button-secondary"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ padding: "5px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              type="button"
              className="admin-button admin-button-secondary"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              style={{ padding: "5px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
          onClick={() => setSelectedLog(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", color: "#d6b56d", fontWeight: "700" }}>
                  Audit Event Details
                </span>
                <h3 style={{ margin: "4px 0 0 0", fontSize: "18px" }}>{selectedLog.action}</h3>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setSelectedLog(null)}
                aria-label="Close dialog"
                title="Close (Esc)"
              >
                <X size={18} strokeWidth={2.2} />
              </button>
            </div>

            <div style={{ display: "grid", gap: "10px", fontSize: "13px" }}>
              <div>
                <strong>Event ID:</strong> <code>{selectedLog.id}</code>
              </div>
              <div>
                <strong>Timestamp:</strong> {formatDateTime(selectedLog.created_at)}
              </div>
              <div>
                <strong>Status:</strong> {selectedLog.status}
              </div>
              <div>
                <strong>Actor Email:</strong> {selectedLog.user_email || "Anonymous"}
              </div>
              <div>
                <strong>Role:</strong> {selectedLog.user_role || "—"}
              </div>
              <div>
                <strong>Target Resource:</strong> {selectedLog.resource || "—"} {selectedLog.resource_id ? `(${selectedLog.resource_id})` : ""}
              </div>
              <div>
                <strong>IP Address:</strong> {selectedLog.ip_address || "—"}
              </div>
              <div>
                <strong>User Agent:</strong>
                <p style={{ margin: "4px 0 0 0", fontSize: "11px", wordBreak: "break-all", color: "#78716c" }}>
                  {selectedLog.user_agent || "—"}
                </p>
              </div>

              <div>
                <strong>Payload &amp; Metadata:</strong>
                <pre
                  style={{
                    background: "#f5f5f4",
                    padding: "12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    overflowX: "auto",
                    marginTop: "6px",
                  }}
                >
                  {JSON.stringify(selectedLog.details || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div style={{ marginTop: "20px", textAlign: "right" }}>
              <button
                type="button"
                className="admin-button admin-button-dark"
                onClick={() => setSelectedLog(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
