import { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Printer,
  Search,
  ExternalLink,
  ShieldCheck,
  Building,
  CreditCard,
  Package,
} from "lucide-react";
import {
  getCompanyDetails,
  getInvoiceHtmlUrl,
  getPackingSlipHtmlUrl,
  getCreditNoteHtmlUrl,
  getRefundReceiptHtmlUrl,
  getShippingLabelHtmlUrl,
  getOrderSummaryHtmlUrl,
  openDocumentInNewTab,
} from "../../services/documents";
import api from "../../services/api";
import { formatAdminPrice, formatDateTime } from "../utils";
import AdminTable from "../components/AdminTable";

export default function AdminInvoices() {
  const [company, setCompany] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [comp, ordersRes] = await Promise.all([
          getCompanyDetails().catch(() => null),
          api.get("/admin/orders?limit=30").catch(() => ({ data: { orders: [] } })),
        ]);
        setCompany(comp);
        setOrders(ordersRes.data?.orders || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredOrders = orders.filter((o) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      o.orderId?.toLowerCase().includes(term) ||
      o.customer?.fullName?.toLowerCase().includes(term) ||
      o.customer?.email?.toLowerCase().includes(term)
    );
  });

  const columns = [
    {
      header: "Order / Invoice ID",
      cell: (o) => (
        <div>
          <strong style={{ fontFamily: "monospace" }}>#{o.orderId}</strong>
          <div style={{ fontSize: "11px", color: "#777" }}>
            {o.invoice_number ? (
              <span style={{ color: "#16a34a", fontWeight: 600 }}>{o.invoice_number}</span>
            ) : (
              "Tax Invoice Available"
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Customer",
      cell: (o) => (
        <div>
          <strong>{o.customer?.fullName}</strong>
          <div style={{ fontSize: "11px", color: "#666" }}>
            {o.shippingAddress?.city}, {o.shippingAddress?.state}
          </div>
        </div>
      ),
    },
    {
      header: "Taxable Value",
      cell: (o) => (
        <div>
          <span>{formatAdminPrice(o.subtotal - (o.discount || 0))}</span>
          <div style={{ fontSize: "11px", color: "#777" }}>
            Tax (3% GST): {formatAdminPrice(o.tax)}
          </div>
        </div>
      ),
    },
    {
      header: "Total Amount",
      cell: (o) => <strong>{formatAdminPrice(o.total)}</strong>,
    },
    {
      header: "Date Placed",
      cell: (o) => (
        <span style={{ fontSize: "12px", color: "#666" }}>
          {formatDateTime(o.createdAt)}
        </span>
      ),
    },
    {
      header: "Legal & Logistics Documents",
      cell: (o) => (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="admin-button admin-button-secondary"
            onClick={() => openDocumentInNewTab(getInvoiceHtmlUrl(o.orderId || o.id))}
            title="Download GST Compliant Tax Invoice"
            style={{ padding: "4px 8px", fontSize: "11px" }}
          >
            <FileText size={12} style={{ marginRight: "3px" }} /> Tax Invoice
          </button>
          <button
            type="button"
            className="admin-button admin-button-secondary"
            onClick={() => openDocumentInNewTab(getPackingSlipHtmlUrl(o.orderId || o.id))}
            title="Download Warehouse Packing Slip"
            style={{ padding: "4px 8px", fontSize: "11px" }}
          >
            <Package size={12} style={{ marginRight: "3px" }} /> Packing Slip
          </button>
          <button
            type="button"
            className="admin-button admin-button-secondary"
            onClick={() => openDocumentInNewTab(getShippingLabelHtmlUrl(o.orderId || o.id))}
            title="Download Printable Shipping Label with Barcode"
            style={{ padding: "4px 8px", fontSize: "11px" }}
          >
            <Printer size={12} style={{ marginRight: "3px" }} /> Shipping Label
          </button>
          <button
            type="button"
            className="admin-button admin-button-secondary"
            onClick={() => openDocumentInNewTab(getOrderSummaryHtmlUrl(o.orderId || o.id))}
            title="Download Customer Order Summary"
            style={{ padding: "4px 8px", fontSize: "11px" }}
          >
            <Download size={12} style={{ marginRight: "3px" }} /> Summary
          </button>
          {o.return_id && (
            <>
              <button
                type="button"
                className="admin-button admin-button-secondary"
                onClick={() => openDocumentInNewTab(getCreditNoteHtmlUrl(o.return_id))}
                title="Download Credit Note"
                style={{ padding: "4px 8px", fontSize: "11px", color: "#d97706" }}
              >
                Credit Note
              </button>
              <button
                type="button"
                className="admin-button admin-button-secondary"
                onClick={() => openDocumentInNewTab(getRefundReceiptHtmlUrl(o.return_id))}
                title="Download Refund Receipt"
                style={{ padding: "4px 8px", fontSize: "11px", color: "#16a34a" }}
              >
                Refund Receipt
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Financial Operations</p>
          <h1 className="admin-title">Invoices &amp; Legal Documents</h1>
        </div>
      </div>

      {/* Company Legal Information Banner */}
      {company && (
        <div
          style={{
            background: "#faf8f5",
            border: "1px solid #e2dcd2",
            borderRadius: "10px",
            padding: "20px",
            marginBottom: "24px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            fontSize: "13px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#8a6d3b", marginBottom: "4px" }}>
              <Building size={16} />
              <strong style={{ fontSize: "12px", textTransform: "uppercase" }}>Registered Entity</strong>
            </div>
            <strong>{company.companyName}</strong>
            <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>
              CIN: <strong>{company.cin}</strong>
            </div>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#8a6d3b", marginBottom: "4px" }}>
              <ShieldCheck size={16} />
              <strong style={{ fontSize: "12px", textTransform: "uppercase" }}>Tax Identifiers</strong>
            </div>
            <div>
              GSTIN: <strong>{company.gstin}</strong>
            </div>
            <div style={{ fontSize: "11px", color: "#666" }}>
              PAN: <strong>{company.pan}</strong> | State Code: <strong>{company.stateCode} ({company.state})</strong>
            </div>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#8a6d3b", marginBottom: "4px" }}>
              <CreditCard size={16} />
              <strong style={{ fontSize: "12px", textTransform: "uppercase" }}>Settlement Wire</strong>
            </div>
            <div>{company.bankDetails?.bankName}</div>
            <div style={{ fontSize: "11px", color: "#666" }}>
              A/C: {company.bankDetails?.accountNumber} | IFSC: {company.bankDetails?.ifsc}
            </div>
          </div>
        </div>
      )}

      {/* Search Toolbar */}
      <div className="admin-toolbar" style={{ marginBottom: "16px" }}>
        <div className="admin-search-wrap">
          <Search size={15} />
          <input
            type="search"
            placeholder="Search orders to generate invoices or packing slips…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <AdminTable
        columns={columns}
        data={filteredOrders}
        loading={loading}
        emptyMessage="No orders found."
      />
    </div>
  );
}
