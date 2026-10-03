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
  X,
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
          <strong style={{ fontFamily: "monospace", fontSize: "13.5px", color: "var(--admin-text)" }}>#{o.orderId}</strong>
          <div style={{ fontSize: "12px", color: "var(--admin-muted)", marginTop: "2px" }}>
            {o.invoice_number ? (
              <span style={{ color: "var(--admin-green)", fontWeight: 600 }}>{o.invoice_number}</span>
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
          <strong style={{ fontSize: "13.5px", color: "var(--admin-text)" }}>{o.customer?.fullName}</strong>
          <div style={{ fontSize: "12px", color: "var(--admin-muted)", marginTop: "2px" }}>
            {o.shippingAddress?.city ? `${o.shippingAddress.city}, ${o.shippingAddress.state}` : (o.customer?.email || "—")}
          </div>
        </div>
      ),
    },
    {
      header: "Taxable Value",
      cell: (o) => (
        <div>
          <span style={{ fontSize: "13.5px", color: "var(--admin-text)", fontWeight: 500 }}>{formatAdminPrice(o.subtotal - (o.discount || 0))}</span>
          <div style={{ fontSize: "12px", color: "var(--admin-muted)", marginTop: "2px" }}>
            Tax (3% GST): {formatAdminPrice(o.tax)}
          </div>
        </div>
      ),
    },
    {
      header: "Total Amount",
      cell: (o) => <strong style={{ fontSize: "14px", color: "var(--admin-text)" }}>{formatAdminPrice(o.total)}</strong>,
    },
    {
      header: "Date Placed",
      cell: (o) => (
        <span style={{ fontSize: "12.5px", color: "var(--admin-muted)" }}>
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
            className="admin-button admin-button-light"
            onClick={() => openDocumentInNewTab(getInvoiceHtmlUrl(o.orderId || o.id))}
            title="Download GST Compliant Tax Invoice"
            style={{ padding: "6px 10px", fontSize: "12px" }}
          >
            <FileText size={13} style={{ marginRight: "4px" }} /> Tax Invoice
          </button>
          <button
            type="button"
            className="admin-button admin-button-light"
            onClick={() => openDocumentInNewTab(getPackingSlipHtmlUrl(o.orderId || o.id))}
            title="Download Warehouse Packing Slip"
            style={{ padding: "6px 10px", fontSize: "12px" }}
          >
            <Package size={13} style={{ marginRight: "4px" }} /> Packing Slip
          </button>
          <button
            type="button"
            className="admin-button admin-button-light"
            onClick={() => openDocumentInNewTab(getShippingLabelHtmlUrl(o.orderId || o.id))}
            title="Download Printable Shipping Label with Barcode"
            style={{ padding: "6px 10px", fontSize: "12px" }}
          >
            <Printer size={13} style={{ marginRight: "4px" }} /> Shipping Label
          </button>
          <button
            type="button"
            className="admin-button admin-button-light"
            onClick={() => openDocumentInNewTab(getOrderSummaryHtmlUrl(o.orderId || o.id))}
            title="Download Customer Order Summary"
            style={{ padding: "6px 10px", fontSize: "12px" }}
          >
            <Download size={13} style={{ marginRight: "4px" }} /> Summary
          </button>
          {o.return_id && (
            <>
              <button
                type="button"
                className="admin-button admin-button-light"
                onClick={() => openDocumentInNewTab(getCreditNoteHtmlUrl(o.return_id))}
                title="Download Credit Note"
                style={{ padding: "6px 10px", fontSize: "12px", color: "var(--admin-gold)" }}
              >
                Credit Note
              </button>
              <button
                type="button"
                className="admin-button admin-button-light"
                onClick={() => openDocumentInNewTab(getRefundReceiptHtmlUrl(o.return_id))}
                title="Download Refund Receipt"
                style={{ padding: "6px 10px", fontSize: "12px", color: "var(--admin-green)" }}
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
            background: "var(--admin-surface)",
            border: "1px solid var(--admin-border)",
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "24px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            fontSize: "13.5px",
            color: "var(--admin-text)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--admin-gold)", marginBottom: "6px" }}>
              <Building size={16} />
              <strong style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Registered Entity</strong>
            </div>
            <strong style={{ fontSize: "14px" }}>{company.companyName}</strong>
            <div style={{ fontSize: "12px", color: "var(--admin-muted)", marginTop: "4px" }}>
              CIN: <strong>{company.cin}</strong>
            </div>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--admin-gold)", marginBottom: "6px" }}>
              <ShieldCheck size={16} />
              <strong style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Tax Identifiers</strong>
            </div>
            <div>
              GSTIN: <strong>{company.gstin}</strong>
            </div>
            <div style={{ fontSize: "12px", color: "var(--admin-muted)", marginTop: "4px" }}>
              PAN: <strong>{company.pan}</strong> | State Code: <strong>{company.stateCode} ({company.state})</strong>
            </div>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--admin-gold)", marginBottom: "6px" }}>
              <CreditCard size={16} />
              <strong style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Settlement Wire</strong>
            </div>
            <div>{company.bankDetails?.bankName}</div>
            <div style={{ fontSize: "12px", color: "var(--admin-muted)", marginTop: "4px" }}>
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
          {searchTerm && (
            <button
              type="button"
              className="admin-search-clear-btn"
              onClick={() => setSearchTerm("")}
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
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
