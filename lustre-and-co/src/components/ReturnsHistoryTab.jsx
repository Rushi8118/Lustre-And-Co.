import { useEffect, useState } from "react";
import {
  Package,
  RotateCcw,
  Truck,
  CheckCircle2,
  Clock,
  FileText,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { getMyReturns, cancelReturnRequest } from "../services/returns";
import {
  getCreditNoteHtmlUrl,
  getRefundReceiptHtmlUrl,
  openDocumentInNewTab,
} from "../services/documents";
import { formatPrice } from "../data/products";

const STATUS_STEPS = [
  "Requested",
  "Approved",
  "Pickup scheduled",
  "Received",
  "Inspected",
  "Completed",
];

function statusColor(status) {
  switch (status) {
    case "Requested":
      return { bg: "#fef3c7", text: "#92400e" };
    case "Approved":
      return { bg: "#e0f2fe", text: "#0369a1" };
    case "Pickup scheduled":
      return { bg: "#ede9fe", text: "#6d28d9" };
    case "Received":
    case "Inspected":
      return { bg: "#fef9c3", text: "#854d0e" };
    case "Refund initiated":
    case "Completed":
      return { bg: "#dcfce7", text: "#15803d" };
    case "Rejected":
    case "Cancelled":
      return { bg: "#fee2e2", text: "#991b1b" };
    default:
      return { bg: "#f3f4f6", text: "#374151" };
  }
}

export default function ReturnsHistoryTab({ onOpenReturnModal }) {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");

  async function loadReturns() {
    setLoading(true);
    try {
      const data = await getMyReturns();
      setReturns(data || []);
    } catch {
      setReturns([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReturns();
  }, []);

  async function handleCancel(returnId) {
    if (!window.confirm("Are you sure you want to cancel this return request?")) return;
    try {
      await cancelReturnRequest(returnId);
      await loadReturns();
    } catch (err) {
      setActionError(err.response?.data?.message || "Could not cancel return request.");
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <p style={{ color: "#666", fontSize: "14px" }}>Loading your returns &amp; exchanges…</p>
      </div>
    );
  }

  return (
    <div className="account-returns-view">
      <div className="account-tab-header">
        <div>
          <h2>Returns &amp; Exchanges ({returns.length})</h2>
          <p>Track return pickups, inspection results, exchanges, and refund documents.</p>
        </div>
      </div>

      {actionError && (
        <div style={{ background: "#fef2f2", color: "#991b1b", padding: "10px 14px", borderRadius: "6px", marginBottom: "16px", fontSize: "13px" }}>
          {actionError}
        </div>
      )}

      {returns.length === 0 ? (
        <div
          style={{
            background: "#fff",
            border: "1px dashed #dcd4c6",
            borderRadius: "10px",
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <RotateCcw size={36} style={{ color: "#bfa373", margin: "0 auto 12px auto" }} />
          <h3 style={{ margin: "0 0 6px 0", fontSize: "16px" }}>No Return Requests</h3>
          <p style={{ margin: "0 0 16px 0", color: "#666", fontSize: "13px" }}>
            You haven’t requested any returns or exchanges. Eligible delivered orders can be returned within 7 days.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {returns.map((ret) => {
            const sc = statusColor(ret.status);
            const isCompleted = ret.status === "Completed";
            const isRejected = ret.status === "Rejected" || ret.status === "Cancelled";

            // Determine active step index
            const stepIndex = STATUS_STEPS.indexOf(ret.status);

            return (
              <div
                key={ret.id}
                style={{
                  background: "#fff",
                  border: "1px solid #e8e3d9",
                  borderRadius: "10px",
                  padding: "24px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "12px",
                    borderBottom: "1px solid #f0ece1",
                    paddingBottom: "16px",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <strong style={{ fontSize: "16px", fontFamily: "monospace", color: "#1a1714" }}>
                        {ret.returnNumber}
                      </strong>
                      <span
                        style={{
                          background: ret.requestType === "exchange" ? "#fbf6ee" : "#f4f4f5",
                          color: ret.requestType === "exchange" ? "#8a6d3b" : "#555",
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          textTransform: "uppercase",
                        }}
                      >
                        {ret.requestType === "exchange" ? "Exchange" : "Return for Refund"}
                      </span>
                    </div>
                    <span style={{ fontSize: "12px", color: "#666" }}>
                      Associated with Order: <strong>#{ret.orderNumber}</strong> • Requested on{" "}
                      {new Date(ret.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <span
                    style={{
                      background: sc.bg,
                      color: sc.text,
                      fontSize: "12px",
                      fontWeight: 700,
                      padding: "4px 12px",
                      borderRadius: "100px",
                    }}
                  >
                    {ret.status}
                  </span>
                </div>

                {/* Progress Steps (if not rejected/cancelled) */}
                {!isRejected && (
                  <div style={{ margin: "20px 0 24px 0" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        position: "relative",
                      }}
                    >
                      {STATUS_STEPS.map((step, idx) => {
                        const isDone = stepIndex >= idx;
                        const isCurrent = stepIndex === idx;

                        return (
                          <div
                            key={step}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              textAlign: "center",
                              flex: 1,
                              position: "relative",
                              zIndex: 2,
                            }}
                          >
                            <div
                              style={{
                                width: "24px",
                                height: "24px",
                                borderRadius: "50%",
                                background: isDone ? "#1a1714" : "#eee",
                                color: isDone ? "#fff" : "#999",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "11px",
                                fontWeight: 700,
                                marginBottom: "6px",
                                border: isCurrent ? "2px solid #8a6d3b" : "none",
                              }}
                            >
                              {isDone ? "✓" : idx + 1}
                            </div>
                            <span
                              style={{
                                fontSize: "11px",
                                color: isDone ? "#1a1714" : "#888",
                                fontWeight: isDone ? 600 : 400,
                                maxWidth: "80px",
                              }}
                            >
                              {step}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Pickup & Courier Details if scheduled */}
                {ret.pickupCourier && (
                  <div
                    style={{
                      background: "#faf8f5",
                      border: "1px solid #ede4d3",
                      borderRadius: "8px",
                      padding: "12px 16px",
                      fontSize: "12px",
                      marginBottom: "16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Truck size={16} style={{ color: "#8a6d3b" }} />
                      <span>
                        Courier Partner: <strong>{ret.pickupCourier}</strong>
                        {ret.pickupTrackingNumber ? ` • Waybill: ${ret.pickupTrackingNumber}` : ""}
                      </span>
                    </div>
                    {ret.pickupScheduledDate && (
                      <span style={{ color: "#666" }}>
                        Pickup: <strong>{new Date(ret.pickupScheduledDate).toLocaleDateString("en-IN")}</strong>
                      </span>
                    )}
                  </div>
                )}

                {/* Items List */}
                <div style={{ marginBottom: "16px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#888" }}>
                    Pieces in this request:
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                    {ret.items?.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "13px",
                          padding: "8px 12px",
                          background: "#fafafa",
                          borderRadius: "6px",
                        }}
                      >
                        <div>
                          <strong>{item.name}</strong> × {item.quantity}
                          {item.color || item.size ? (
                            <span style={{ color: "#666", fontSize: "12px", marginLeft: "6px" }}>
                              ({[item.color, item.size].filter(Boolean).join(" / ")})
                            </span>
                          ) : null}
                          {ret.requestType === "exchange" && (item.exchangeColor || item.exchangeSize) && (
                            <div style={{ fontSize: "11px", color: "#8a6d3b", marginTop: "2px" }}>
                              &rarr; Requested exchange: {item.exchangeColor} {item.exchangeSize}
                            </div>
                          )}
                        </div>
                        <strong style={{ color: "#1a1714" }}>{formatPrice(item.subtotal)}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Refund & Settlement Summary */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                    borderTop: "1px solid #f0ece1",
                    paddingTop: "14px",
                    fontSize: "13px",
                  }}
                >
                  <div>
                    <span style={{ color: "#666" }}>Refund Mode: </span>
                    <strong>
                      {ret.refundPreference === "store_credit"
                        ? "Instant Store Credit (+5% bonus)"
                        : ret.refundMethod || "Original Payment Method"}
                    </strong>
                    {ret.actualRefundAmount > 0 && (
                      <span style={{ marginLeft: "8px", color: "#15803d", fontWeight: 700 }}>
                        ({formatPrice(ret.actualRefundAmount)})
                      </span>
                    )}
                  </div>

                  {/* Actions / Documents */}
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    {isCompleted && (
                      <>
                        <button
                          type="button"
                          onClick={() => openDocumentInNewTab(getCreditNoteHtmlUrl(ret.id))}
                          style={{
                            background: "#faf8f5",
                            border: "1px solid #d4af37",
                            color: "#8a6d3b",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <FileText size={14} /> Credit Note
                        </button>

                        <button
                          type="button"
                          onClick={() => openDocumentInNewTab(getRefundReceiptHtmlUrl(ret.id))}
                          style={{
                            background: "#1a1714",
                            border: "none",
                            color: "#fff",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <ExternalLink size={14} /> Refund Receipt
                        </button>
                      </>
                    )}

                    {ret.status === "Requested" && (
                      <button
                        type="button"
                        onClick={() => handleCancel(ret.id)}
                        style={{
                          background: "#fff",
                          border: "1px solid #ddd",
                          color: "#666",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        Cancel Request
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
