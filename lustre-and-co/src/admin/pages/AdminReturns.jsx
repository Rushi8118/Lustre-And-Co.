import { useEffect, useState, useCallback } from "react";
import {
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Truck,
  Eye,
  FileText,
  ExternalLink,
  ShieldCheck,
  Package,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import AdminTable from "../components/AdminTable";
import AdminModal from "../components/AdminModal";
import { StatusBadge, Tabs, ErrorState, LoadingState } from "../components/AdminUi";
import { formatAdminPrice, formatDateTime } from "../utils";
import {
  adminGetReturns,
  adminGetReturn,
  adminApproveReturn,
  adminSchedulePickup,
  adminMarkReceived,
  adminInspectReturn,
  adminProcessRefund,
  adminCompleteExchange,
  adminRejectReturn,
} from "../../services/returns";
import {
  getCreditNoteHtmlUrl,
  getRefundReceiptHtmlUrl,
  getInvoiceHtmlUrl,
  openDocumentInNewTab,
} from "../../services/documents";
import { useStore } from "../../context/StoreContext";

const RETURN_STATUS_TABS = [
  { id: "", label: "All Returns" },
  { id: "Requested", label: "Requested" },
  { id: "Approved", label: "Approved" },
  { id: "Pickup scheduled", label: "Pickup Scheduled" },
  { id: "Received", label: "Received" },
  { id: "Inspected", label: "Inspected" },
  { id: "Completed", label: "Completed" },
  { id: "Rejected", label: "Rejected" },
];

function returnTone(status) {
  switch (status) {
    case "Requested":
      return "warning";
    case "Approved":
    case "Pickup scheduled":
      return "info";
    case "Received":
    case "Inspected":
      return "neutral";
    case "Completed":
      return "success";
    case "Rejected":
    case "Cancelled":
      return "danger";
    default:
      return "neutral";
  }
}

export default function AdminReturns() {
  const { showToast } = useStore();
  const [returns, setReturns] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedReturnId, setSelectedReturnId] = useState(null);
  const [activeReturn, setActiveReturn] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Action form state
  const [actionNotes, setActionNotes] = useState("");
  const [courierName, setCourierName] = useState("Delhivery Return Express");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [inspectionStatus, setInspectionStatus] = useState("Passed");
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [restockingFee, setRestockingFee] = useState(0);
  const [refundMethod, setRefundMethod] = useState("Original Payment Gateway");
  const [transactionId, setTransactionId] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [exchangeOrderNumber, setExchangeOrderNumber] = useState("");
  const [actionProcessing, setActionProcessing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGetReturns({
        status: statusFilter || undefined,
        search: searchTerm || undefined,
        limit: 50,
      });
      setReturns(res.returns || []);
      setTotalCount(res.total || 0);
    } catch {
      setReturns([]);
      showToast("Could not load returns list.", "error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function openDetailModal(id) {
    setSelectedReturnId(id);
    setModalLoading(true);
    try {
      const data = await adminGetReturn(id);
      setActiveReturn(data);
      setActionNotes("");
      setCourierName(data.pickupCourier || "Delhivery Return Express");
      setTrackingNumber(data.pickupTrackingNumber || "");
      setInspectionStatus(data.inspectionStatus || "Passed");
      setInspectionNotes(data.inspectionNotes || "");
      setRestockingFee(data.restockingFee || 0);
      setRejectionReason("");
      setExchangeOrderNumber(data.exchangeOrderNumber || "");
    } catch {
      showToast("Could not load return request details.", "error");
      setSelectedReturnId(null);
    } finally {
      setModalLoading(false);
    }
  }

  async function executeAction(actionType) {
    if (!selectedReturnId) return;
    setActionProcessing(true);

    try {
      let updated;
      switch (actionType) {
        case "approve":
          updated = await adminApproveReturn(selectedReturnId, {
            adminNotes: actionNotes,
            pickupCourier: courierName,
          });
          showToast("Return request approved.", "success");
          break;

        case "schedule_pickup":
          updated = await adminSchedulePickup(selectedReturnId, {
            courier: courierName,
            trackingNumber: trackingNumber || undefined,
            scheduledDate: scheduledDate || undefined,
            notes: actionNotes,
          });
          showToast("Return pickup scheduled with courier.", "success");
          break;

        case "mark_received":
          updated = await adminMarkReceived(selectedReturnId);
          showToast("Package marked as received at warehouse.", "success");
          break;

        case "inspect":
          updated = await adminInspectReturn(selectedReturnId, {
            inspectionStatus,
            inspectionNotes,
            restockingFee: Number(restockingFee || 0),
          });
          showToast(`Inspection submitted: ${inspectionStatus}.`, "success");
          break;

        case "process_refund":
          updated = await adminProcessRefund(selectedReturnId, {
            refundMethod,
            transactionId: transactionId || undefined,
            adminNotes: actionNotes,
          });
          showToast("Refund completed and Credit Note generated.", "success");
          break;

        case "complete_exchange":
          updated = await adminCompleteExchange(selectedReturnId, {
            exchangeOrderNumber: exchangeOrderNumber || undefined,
            adminNotes: actionNotes,
          });
          showToast("Exchange completed successfully.", "success");
          break;

        case "reject":
          if (!rejectionReason.trim()) {
            showToast("Please provide a reason for rejection.", "error");
            setActionProcessing(false);
            return;
          }
          updated = await adminRejectReturn(selectedReturnId, {
            rejectionReason: rejectionReason.trim(),
            adminNotes: actionNotes,
          });
          showToast("Return request rejected.", "success");
          break;

        default:
          break;
      }

      if (updated) {
        setActiveReturn(updated);
      }
      await loadData();
    } catch (err) {
      showToast(err.response?.data?.message || "Action failed.", "error");
    } finally {
      setActionProcessing(false);
    }
  }

  const columns = [
    {
      header: "Case ID",
      cell: (r) => (
        <div>
          <strong style={{ fontFamily: "monospace", color: "#1a1714" }}>
            {r.returnNumber}
          </strong>
          <div style={{ fontSize: "11px", color: "#777" }}>
            {r.requestType === "exchange" ? "Exchange" : "Return"}
          </div>
        </div>
      ),
    },
    {
      header: "Order",
      cell: (r) => (
        <span style={{ fontFamily: "monospace" }}>#{r.orderNumber}</span>
      ),
    },
    {
      header: "Customer",
      cell: (r) => (
        <div>
          <strong>{r.customer?.name}</strong>
          <div style={{ fontSize: "11px", color: "#777" }}>
            {r.customer?.email}
          </div>
        </div>
      ),
    },
    {
      header: "Items & Value",
      cell: (r) => (
        <div>
          <span>{r.totalItemsCount} piece(s)</span>
          <div style={{ fontWeight: 600, color: "#1a1714" }}>
            {formatAdminPrice(r.actualRefundAmount || r.calculatedRefundAmount)}
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (r) => (
        <StatusBadge tone={returnTone(r.status)}>{r.status}</StatusBadge>
      ),
    },
    {
      header: "Requested",
      cell: (r) => (
        <span style={{ fontSize: "12px", color: "#666" }}>
          {formatDateTime(r.createdAt)}
        </span>
      ),
    },
    {
      header: "Actions",
      cell: (r) => (
        <button
          type="button"
          className="admin-button admin-button-secondary"
          onClick={() => openDetailModal(r.id)}
          style={{ padding: "4px 10px", fontSize: "12px" }}
        >
          <Eye size={13} style={{ marginRight: "4px" }} /> Manage
        </button>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Customer Care &amp; Logistics</p>
          <h1 className="admin-title">Returns, Refunds &amp; Exchanges</h1>
        </div>
        <button
          type="button"
          className="admin-button admin-button-secondary"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={RETURN_STATUS_TABS}
        active={statusFilter}
        onChange={(val) => setStatusFilter(val)}
      />

      {/* Filter / Search Bar */}
      <div className="admin-toolbar" style={{ margin: "16px 0" }}>
        <div className="admin-search-wrap">
          <Search size={15} />
          <input
            type="search"
            placeholder="Search by Return ID, Order ID, customer name, email…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <AdminTable
        columns={columns}
        data={returns}
        loading={loading}
        emptyMessage="No return or exchange requests found."
      />

      {/* Detail / Action Modal */}
      {selectedReturnId && (
        <AdminModal
          open
          onClose={() => {
            setSelectedReturnId(null);
            setActiveReturn(null);
          }}
          title={
            activeReturn
              ? `${activeReturn.returnNumber} (${activeReturn.requestType?.toUpperCase()})`
              : "Return Request Details"
          }
          description={
            activeReturn ? `Order #${activeReturn.orderNumber}` : undefined
          }
          wide
        >
          {modalLoading && <LoadingState label="Loading return request details…" />}

          {activeReturn && !modalLoading && (
            <div className="admin-detail-grid">
              {/* Summary Header Card */}
              <div className="admin-detail-card">
                <h3>Customer &amp; Case Summary</h3>
                <dl className="admin-kv">
                  <dt>Customer</dt>
                  <dd>
                    <strong>{activeReturn.customer?.name}</strong>
                  </dd>
                  <dt>Email</dt>
                  <dd>
                    <a href={`mailto:${activeReturn.customer?.email}`}>
                      {activeReturn.customer?.email}
                    </a>
                  </dd>
                  <dt>Phone</dt>
                  <dd>{activeReturn.customer?.phone}</dd>
                  <dt>Current Status</dt>
                  <dd>
                    <StatusBadge tone={returnTone(activeReturn.status)}>
                      {activeReturn.status}
                    </StatusBadge>
                  </dd>
                  <dt>Requested Mode</dt>
                  <dd>
                    {activeReturn.refundPreference === "store_credit"
                      ? "Store Credit (Wallet +5% bonus)"
                      : "Original Payment Gateway"}
                  </dd>
                  <dt>Primary Reason</dt>
                  <dd>
                    <strong>{activeReturn.reason}</strong>
                  </dd>
                  {activeReturn.customerNotes && (
                    <>
                      <dt>Customer Notes</dt>
                      <dd style={{ fontStyle: "italic" }}>
                        &ldquo;{activeReturn.customerNotes}&rdquo;
                      </dd>
                    </>
                  )}
                </dl>
              </div>

              {/* Pickup Address & Logistics Card */}
              <div className="admin-detail-card">
                <h3>Pickup &amp; Logistics Address</h3>
                <div style={{ fontSize: "13px", lineHeight: "1.6" }}>
                  <strong>{activeReturn.pickupAddress?.fullName}</strong>
                  <br />
                  {activeReturn.pickupAddress?.addressLine1}
                  <br />
                  {activeReturn.pickupAddress?.city},{" "}
                  {activeReturn.pickupAddress?.state} -{" "}
                  {activeReturn.pickupAddress?.postalCode}
                  <br />
                  Phone: {activeReturn.pickupAddress?.phone}
                </div>

                <div
                  style={{
                    marginTop: "16px",
                    paddingTop: "12px",
                    borderTop: "1px dashed #e5e5e5",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    Assigned Courier:{" "}
                    <strong>{activeReturn.pickupCourier || "Not Assigned"}</strong>
                  </div>
                  {activeReturn.pickupTrackingNumber && (
                    <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                      Waybill / Tracking:{" "}
                      <strong style={{ fontFamily: "monospace" }}>
                        {activeReturn.pickupTrackingNumber}
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table Card */}
              <div className="admin-detail-card full">
                <h3>Returned Items</h3>
                <div className="admin-line-items">
                  {activeReturn.items?.map((item, idx) => (
                    <div className="admin-line-item" key={idx}>
                      <div>
                        <strong>{item.name}</strong>
                        <small>
                          {item.color} {item.size ? `· ${item.size}` : ""} · Qty:{" "}
                          <strong>{item.quantity}</strong> × {formatAdminPrice(item.unitPrice)}
                        </small>
                        {activeReturn.requestType === "exchange" &&
                          (item.exchangeColor || item.exchangeSize) && (
                            <div
                              style={{
                                color: "#8a6d3b",
                                fontSize: "11px",
                                marginTop: "3px",
                              }}
                            >
                              &rarr; Requested Exchange: {item.exchangeColor} {item.exchangeSize}
                            </div>
                          )}
                      </div>
                      <strong>{formatAdminPrice(item.subtotal)}</strong>
                    </div>
                  ))}
                </div>

                {/* Uploaded Customer Photos */}
                {activeReturn.photos?.length > 0 && (
                  <div style={{ marginTop: "16px" }}>
                    <h4 style={{ fontSize: "12px", textTransform: "uppercase", color: "#666", margin: "0 0 8px 0" }}>
                      Photo Evidence Uploaded by Customer ({activeReturn.photos.length})
                    </h4>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      {activeReturn.photos.map((src, i) => (
                        <a
                          key={i}
                          href={src}
                          target="_blank"
                          rel="noreferrer"
                          title="Click to view full photo"
                        >
                          <img
                            src={src}
                            alt="Proof"
                            style={{
                              width: "72px",
                              height: "72px",
                              objectFit: "cover",
                              borderRadius: "6px",
                              border: "1px solid #ddd",
                            }}
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Settlement Totals & Documents Card */}
              <div className="admin-detail-card">
                <h3>Financial Settlement</h3>
                <dl className="admin-kv">
                  <dt>Items Value</dt>
                  <dd>{formatAdminPrice(activeReturn.calculatedRefundAmount)}</dd>
                  {activeReturn.restockingFee > 0 && (
                    <>
                      <dt>Restocking Fee</dt>
                      <dd style={{ color: "#dc2626" }}>
                        -{formatAdminPrice(activeReturn.restockingFee)}
                      </dd>
                    </>
                  )}
                  <dt>Final Credit Amount</dt>
                  <dd>
                    <strong style={{ fontSize: "15px", color: "#16a34a" }}>
                      {formatAdminPrice(activeReturn.actualRefundAmount)}
                    </strong>
                  </dd>
                  <dt>Settlement Status</dt>
                  <dd>
                    <StatusBadge
                      tone={activeReturn.refundStatus === "Completed" ? "success" : "neutral"}
                    >
                      {activeReturn.refundStatus}
                    </StatusBadge>
                  </dd>
                  {activeReturn.creditNoteNumber && (
                    <>
                      <dt>GST Credit Note</dt>
                      <dd>
                        <strong style={{ fontFamily: "monospace" }}>
                          {activeReturn.creditNoteNumber}
                        </strong>
                      </dd>
                    </>
                  )}
                </dl>

                {/* Document Downloads */}
                <div
                  style={{
                    marginTop: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <button
                    type="button"
                    className="admin-button admin-button-secondary"
                    onClick={() =>
                      openDocumentInNewTab(
                        getInvoiceHtmlUrl(activeReturn.orderNumber),
                      )
                    }
                  >
                    <FileText size={14} /> View Original Tax Invoice
                  </button>

                  {activeReturn.creditNoteNumber && (
                    <button
                      type="button"
                      className="admin-button admin-button-secondary"
                      onClick={() =>
                        openDocumentInNewTab(
                          getCreditNoteHtmlUrl(activeReturn.id),
                        )
                      }
                    >
                      <FileText size={14} /> Download GST Credit Note
                    </button>
                  )}

                  {activeReturn.status === "Completed" && (
                    <button
                      type="button"
                      className="admin-button admin-button-secondary"
                      onClick={() =>
                        openDocumentInNewTab(
                          getRefundReceiptHtmlUrl(activeReturn.id),
                        )
                      }
                    >
                      <ExternalLink size={14} /> Download Refund Receipt
                    </button>
                  )}
                </div>
              </div>

              {/* Action Operations Workflow Card */}
              <div className="admin-detail-card">
                <h3>Workflow Actions</h3>

                {activeReturn.status === "Requested" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>
                      Review items and photo proof above. Approve to authorize courier pickup or reject if ineligible.
                    </p>
                    <label style={{ fontSize: "12px", display: "block" }}>
                      Pickup Courier:
                      <input
                        type="text"
                        value={courierName}
                        onChange={(e) => setCourierName(e.target.value)}
                        style={{ width: "100%", marginTop: "4px" }}
                      />
                    </label>
                    <label style={{ fontSize: "12px", display: "block" }}>
                      Admin Notes:
                      <input
                        type="text"
                        placeholder="Internal notes..."
                        value={actionNotes}
                        onChange={(e) => setActionNotes(e.target.value)}
                        style={{ width: "100%", marginTop: "4px" }}
                      />
                    </label>

                    <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                      <button
                        type="button"
                        className="admin-button admin-button-dark"
                        onClick={() => executeAction("approve")}
                        disabled={actionProcessing}
                      >
                        <CheckCircle2 size={14} /> Approve Request
                      </button>
                    </div>

                    <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed #ddd" }}>
                      <input
                        type="text"
                        placeholder="Reason for rejection..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        style={{ width: "100%", marginBottom: "6px" }}
                      />
                      <button
                        type="button"
                        className="admin-button admin-button-secondary"
                        onClick={() => executeAction("reject")}
                        disabled={actionProcessing}
                        style={{ color: "#dc2626" }}
                      >
                        <XCircle size={14} /> Reject Request
                      </button>
                    </div>
                  </div>
                )}

                {activeReturn.status === "Approved" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>
                      Assign return pickup courier details to generate waybill.
                    </p>
                    <label style={{ fontSize: "12px" }}>
                      Courier Partner:
                      <input
                        type="text"
                        value={courierName}
                        onChange={(e) => setCourierName(e.target.value)}
                        style={{ width: "100%", marginTop: "4px" }}
                      />
                    </label>
                    <label style={{ fontSize: "12px" }}>
                      Tracking Waybill #:
                      <input
                        type="text"
                        placeholder="Leave blank for auto-generated AWB"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        style={{ width: "100%", marginTop: "4px" }}
                      />
                    </label>
                    <label style={{ fontSize: "12px" }}>
                      Scheduled Date:
                      <input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        style={{ width: "100%", marginTop: "4px" }}
                      />
                    </label>

                    <button
                      type="button"
                      className="admin-button admin-button-dark"
                      onClick={() => executeAction("schedule_pickup")}
                      disabled={actionProcessing}
                    >
                      <Truck size={14} /> Schedule Pickup
                    </button>
                  </div>
                )}

                {activeReturn.status === "Pickup scheduled" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>
                      The parcel is with the courier. When received at the warehouse, mark as received to begin inspection.
                    </p>
                    <button
                      type="button"
                      className="admin-button admin-button-dark"
                      onClick={() => executeAction("mark_received")}
                      disabled={actionProcessing}
                    >
                      <Package size={14} /> Mark Received at Warehouse
                    </button>
                  </div>
                )}

                {activeReturn.status === "Received" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>
                      Inspect returned jewelry piece for authenticity, condition, and packaging.
                    </p>
                    <label style={{ fontSize: "12px" }}>
                      Inspection Result:
                      <select
                        value={inspectionStatus}
                        onChange={(e) => setInspectionStatus(e.target.value)}
                        style={{ width: "100%", marginTop: "4px" }}
                      >
                        <option value="Passed">Passed (Full Condition)</option>
                        <option value="Partially Approved">Partially Approved (Minor wear)</option>
                        <option value="Failed">Failed (Damaged by customer / missing)</option>
                      </select>
                    </label>
                    <label style={{ fontSize: "12px" }}>
                      Restocking / Cleaning Fee (₹):
                      <input
                        type="number"
                        min="0"
                        value={restockingFee}
                        onChange={(e) => setRestockingFee(Number(e.target.value))}
                        style={{ width: "100%", marginTop: "4px" }}
                      />
                    </label>
                    <label style={{ fontSize: "12px" }}>
                      Inspection Notes:
                      <input
                        type="text"
                        placeholder="Notes on jewelry condition..."
                        value={inspectionNotes}
                        onChange={(e) => setInspectionNotes(e.target.value)}
                        style={{ width: "100%", marginTop: "4px" }}
                      />
                    </label>
                    <button
                      type="button"
                      className="admin-button admin-button-dark"
                      onClick={() => executeAction("inspect")}
                      disabled={actionProcessing}
                    >
                      <ShieldCheck size={14} /> Submit Inspection
                    </button>
                  </div>
                )}

                {activeReturn.status === "Inspected" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>
                      Inspection completed ({activeReturn.inspectionStatus}). Ready to issue refund or complete exchange.
                    </p>

                    {activeReturn.requestType === "exchange" ? (
                      <div>
                        <label style={{ fontSize: "12px", display: "block" }}>
                          Exchange Replacement Order #:
                          <input
                            type="text"
                            placeholder="e.g. EXC-ORD-894210"
                            value={exchangeOrderNumber}
                            onChange={(e) => setExchangeOrderNumber(e.target.value)}
                            style={{ width: "100%", marginTop: "4px" }}
                          />
                        </label>
                        <button
                          type="button"
                          className="admin-button admin-button-dark"
                          onClick={() => executeAction("complete_exchange")}
                          disabled={actionProcessing}
                          style={{ marginTop: "8px" }}
                        >
                          <CheckCircle2 size={14} /> Fulfill Exchange
                        </button>
                      </div>
                    ) : (
                      <div>
                        <label style={{ fontSize: "12px", display: "block" }}>
                          Refund Settlement Channel:
                          <select
                            value={refundMethod}
                            onChange={(e) => setRefundMethod(e.target.value)}
                            style={{ width: "100%", marginTop: "4px" }}
                          >
                            <option value="Store Credit / Wallet (+5% Bonus)">
                              Instant Store Credit Wallet
                            </option>
                            <option value="Razorpay Online Refund">
                              Razorpay Payment Gateway Refund
                            </option>
                            <option value="Direct Bank Wire / NEFT">
                              Bank Wire Transfer
                            </option>
                          </select>
                        </label>
                        <label style={{ fontSize: "12px", display: "block", marginTop: "6px" }}>
                          Transaction / Gateway Ref:
                          <input
                            type="text"
                            placeholder="Leave blank for auto-generated ref"
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            style={{ width: "100%", marginTop: "4px" }}
                          />
                        </label>

                        <button
                          type="button"
                          className="admin-button admin-button-dark"
                          onClick={() => executeAction("process_refund")}
                          disabled={actionProcessing}
                          style={{ marginTop: "10px" }}
                        >
                          <CheckCircle2 size={14} /> Issue Refund &amp; Credit Note
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeReturn.status === "Completed" && (
                  <div style={{ textAlign: "center", padding: "16px 0", color: "#16a34a" }}>
                    <CheckCircle2 size={32} style={{ margin: "0 auto 8px auto" }} />
                    <strong>This return request is fully completed and settled.</strong>
                    <p style={{ fontSize: "12px", color: "#666", margin: "4px 0 0 0" }}>
                      Inventory has been restocked and tax credit notes have been registered.
                    </p>
                  </div>
                )}

                {activeReturn.status === "Rejected" && (
                  <div style={{ color: "#dc2626", fontSize: "13px" }}>
                    <AlertTriangle size={18} style={{ marginBottom: "6px" }} />
                    <p style={{ margin: 0 }}>
                      <strong>Rejection Reason:</strong> {activeReturn.rejectionReason}
                    </p>
                  </div>
                )}
              </div>

              {/* History Timeline */}
              {activeReturn.statusHistory?.length > 0 && (
                <div className="admin-detail-card full">
                  <h3>Activity &amp; Audit Timeline</h3>
                  <ol className="admin-history">
                    {[...activeReturn.statusHistory].reverse().map((entry, index) => (
                      <li key={index}>
                        <strong>{entry.status}</strong>
                        {entry.note ? ` — ${entry.note}` : ""}
                        <time>
                          {formatDateTime(entry.at)} {entry.by ? `(by ${entry.by})` : ""}
                        </time>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </AdminModal>
      )}
    </div>
  );
}
