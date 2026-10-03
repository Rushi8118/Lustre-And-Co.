import { useEffect, useState, useCallback } from "react";
import {
  TrendingUp,
  Download,
  Calendar,
  CreditCard,
  Users,
  ShoppingCart,
  DollarSign,
  Package,
  Layers,
  MapPin,
  Smartphone,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
} from "lucide-react";
import {
  getAnalyticsDashboard,
  downloadAnalyticsExport,
} from "../../services/analytics";
import { formatAdminPrice } from "../utils";
import { LoadingState, ErrorState } from "../components/AdminUi";

const PRESETS = [
  { id: "today", label: "Today" },
  { id: "last_7_days", label: "Last 7 Days" },
  { id: "last_30_days", label: "Last 30 Days" },
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "custom", label: "Custom Range" },
];

function formatPercent(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

export default function AdminAnalytics() {
  const [preset, setPreset] = useState("last_30_days");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportingType, setExportingType] = useState(null);
  const [activeTableTab, setActiveTableTab] = useState("topProducts");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getAnalyticsDashboard({
        preset,
        from: preset === "custom" ? from : undefined,
        to: preset === "custom" ? to : undefined,
      });
      setDashboard(data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not retrieve analytics data. Please verify database connection.",
      );
    } finally {
      setLoading(false);
    }
  }, [preset, from, to]);

  useEffect(() => {
    if (preset !== "custom") {
      void loadData();
    }
  }, [preset, loadData]);

  async function handleExport(type, format) {
    const key = `${type}-${format}`;
    setExportingType(key);
    try {
      await downloadAnalyticsExport({
        type,
        format,
        preset,
        from: preset === "custom" ? from : undefined,
        to: preset === "custom" ? to : undefined,
      });
    } catch (err) {
      alert(
        err.response?.data?.message || `Failed to export ${type} data as ${format.toUpperCase()}.`,
      );
    } finally {
      setExportingType(null);
    }
  }

  const summary = dashboard?.summary || {};
  const conversion = dashboard?.conversion || {};

  return (
    <div className="admin-page">
      {/* Header */}
      <header className="admin-page-header">
        <div>
          <span className="admin-page-eyebrow">Enterprise Intelligence</span>
          <h1>Store Analytics &amp; Reports</h1>
        </div>

        <div className="admin-analytics-export-bar">
          <div className="admin-export-dropdown-group">
            <span className="admin-export-label">
              <Download size={15} /> Export Report:
            </span>
            <div className="admin-export-buttons">
              <button
                type="button"
                className="admin-button admin-button-secondary"
                disabled={Boolean(exportingType)}
                onClick={() => handleExport("orders", "csv")}
                title="Export complete orders ledger"
              >
                <FileText size={14} /> Orders CSV
              </button>
              <button
                type="button"
                className="admin-button admin-button-secondary"
                disabled={Boolean(exportingType)}
                onClick={() => handleExport("revenue", "xlsx")}
                title="Export revenue breakdown spreadsheet"
              >
                <FileSpreadsheet size={14} /> Revenue XLSX
              </button>
              <button
                type="button"
                className="admin-button admin-button-secondary"
                disabled={Boolean(exportingType)}
                onClick={() => handleExport("customers", "csv")}
                title="Export customer list & CLV"
              >
                <Users size={14} /> Customers CSV
              </button>
              <button
                type="button"
                className="admin-button admin-button-secondary"
                disabled={Boolean(exportingType)}
                onClick={() => handleExport("inventory", "xlsx")}
                title="Export live inventory stock report"
              >
                <Package size={14} /> Inventory XLSX
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Date Filters Control Bar */}
      <section className="admin-analytics-filter-card">
        <div className="admin-preset-pills">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`admin-preset-pill ${preset === p.id ? "is-active" : ""}`}
              onClick={() => setPreset(p.id)}
            >
              <Calendar size={13} />
              {p.label}
            </button>
          ))}
        </div>

        {preset === "custom" && (
          <form
            className="admin-custom-date-range"
            onSubmit={(e) => {
              e.preventDefault();
              void loadData();
            }}
          >
            <div className="admin-date-input-group">
              <label>From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                required
              />
            </div>
            <div className="admin-date-input-group">
              <label>To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="admin-button admin-button-gold">
              Apply Range
            </button>
          </form>
        )}
      </section>

      {error && <ErrorState message={error} onRetry={loadData} />}

      {loading && !dashboard ? (
        <LoadingState label="Computing analytics metrics…" />
      ) : (
        <>
          {/* Top 8 KPI Grid */}
          <section className="admin-analytics-kpi-grid">
            <article className="admin-kpi-card">
              <div className="admin-kpi-header">
                <span className="admin-kpi-label">Gross Revenue</span>
                <span className="admin-kpi-icon-wrap gold">
                  <DollarSign size={16} />
                </span>
              </div>
              <strong className="admin-kpi-value">
                {formatAdminPrice(summary.grossRevenue || 0)}
              </strong>
              <div className="admin-kpi-foot">
                <span>{summary.orderCount || 0} valid orders</span>
              </div>
            </article>

            <article className="admin-kpi-card">
              <div className="admin-kpi-header">
                <span className="admin-kpi-label">Net Revenue</span>
                <span className="admin-kpi-icon-wrap green">
                  <TrendingUp size={16} />
                </span>
              </div>
              <strong className="admin-kpi-value">
                {formatAdminPrice(summary.netRevenue || 0)}
              </strong>
              <div className="admin-kpi-foot">
                <span>Gross minus refunds</span>
              </div>
            </article>

            <article className="admin-kpi-card">
              <div className="admin-kpi-header">
                <span className="admin-kpi-label">Refund Total</span>
                <span className="admin-kpi-icon-wrap red">
                  <ArrowDownRight size={16} />
                </span>
              </div>
              <strong className="admin-kpi-value text-danger">
                {formatAdminPrice(summary.refundTotal || 0)}
              </strong>
              <div className="admin-kpi-foot">
                <span>Returned or refunded orders</span>
              </div>
            </article>

            <article className="admin-kpi-card">
              <div className="admin-kpi-header">
                <span className="admin-kpi-label">Average Order Value</span>
                <span className="admin-kpi-icon-wrap blue">
                  <ShoppingCart size={16} />
                </span>
              </div>
              <strong className="admin-kpi-value">
                {formatAdminPrice(summary.averageOrderValue || 0)}
              </strong>
              <div className="admin-kpi-foot">
                <span>Per completed checkout</span>
              </div>
            </article>

            <article className="admin-kpi-card">
              <div className="admin-kpi-header">
                <span className="admin-kpi-label">Conversion Rate</span>
                <span className="admin-kpi-icon-wrap teal">
                  <ArrowUpRight size={16} />
                </span>
              </div>
              <strong className="admin-kpi-value">
                {formatPercent(conversion.conversionRate)}
              </strong>
              <div className="admin-kpi-foot">
                <span>{conversion.checkoutCompleted || 0} purchases / {conversion.checkoutStarted || 0} starts</span>
              </div>
            </article>

            <article className="admin-kpi-card">
              <div className="admin-kpi-header">
                <span className="admin-kpi-label">Cart Abandonment</span>
                <span className="admin-kpi-icon-wrap orange">
                  <Percent size={16} />
                </span>
              </div>
              <strong className="admin-kpi-value">
                {formatPercent(conversion.cartAbandonmentRate)}
              </strong>
              <div className="admin-kpi-foot">
                <span>{conversion.abandonedCarts || 0} carts abandoned</span>
              </div>
            </article>

            <article className="admin-kpi-card">
              <div className="admin-kpi-header">
                <span className="admin-kpi-label">Returning Customer Rate</span>
                <span className="admin-kpi-icon-wrap purple">
                  <Users size={16} />
                </span>
              </div>
              <strong className="admin-kpi-value">
                {formatPercent(summary.returningCustomerRate)}
              </strong>
              <div className="admin-kpi-foot">
                <span>{summary.returningCustomers || 0} repeat / {summary.newCustomers || 0} new</span>
              </div>
            </article>

            <article className="admin-kpi-card">
              <div className="admin-kpi-header">
                <span className="admin-kpi-label">Customer Lifetime Value</span>
                <span className="admin-kpi-icon-wrap gold">
                  <CreditCard size={16} />
                </span>
              </div>
              <strong className="admin-kpi-value">
                {formatAdminPrice(summary.customerLifetimeValue || 0)}
              </strong>
              <div className="admin-kpi-foot">
                <span>Average historical spend</span>
              </div>
            </article>
          </section>

          {/* Operational Breakdown Cards */}
          <section className="admin-analytics-breakdown-row">
            {/* Payment Methods */}
            <article className="admin-card admin-breakdown-card">
              <div className="admin-card-head">
                <h3>
                  <CreditCard size={18} /> Payment Methods
                </h3>
              </div>
              <div className="admin-breakdown-content">
                <div className="admin-split-bar-wrap">
                  <div
                    className="admin-split-bar cod"
                    style={{
                      width: `${
                        summary.orderCount > 0
                          ? ((summary.codOrders || 0) / summary.orderCount) * 100
                          : 50
                      }%`,
                    }}
                    title={`COD: ${summary.codOrders || 0}`}
                  />
                  <div
                    className="admin-split-bar online"
                    style={{
                      width: `${
                        summary.orderCount > 0
                          ? ((summary.onlineOrders || 0) / summary.orderCount) * 100
                          : 50
                      }%`,
                    }}
                    title={`Online: ${summary.onlineOrders || 0}`}
                  />
                </div>
                <div className="admin-breakdown-legend">
                  <div className="admin-legend-item">
                    <span className="legend-indicator cod" />
                    <span>COD Orders</span>
                    <strong>{summary.codOrders || 0}</strong>
                  </div>
                  <div className="admin-legend-item">
                    <span className="legend-indicator online" />
                    <span>Prepaid / Online</span>
                    <strong>{summary.onlineOrders || 0}</strong>
                  </div>
                </div>
              </div>
            </article>

            {/* Customers Mix */}
            <article className="admin-card admin-breakdown-card">
              <div className="admin-card-head">
                <h3>
                  <Users size={18} /> Customer Acquisition
                </h3>
              </div>
              <div className="admin-breakdown-content">
                <div className="admin-split-bar-wrap">
                  <div
                    className="admin-split-bar new"
                    style={{
                      width: `${
                        summary.uniqueCustomers > 0
                          ? ((summary.newCustomers || 0) / summary.uniqueCustomers) * 100
                          : 50
                      }%`,
                    }}
                  />
                  <div
                    className="admin-split-bar returning"
                    style={{
                      width: `${
                        summary.uniqueCustomers > 0
                          ? ((summary.returningCustomers || 0) / summary.uniqueCustomers) * 100
                          : 50
                      }%`,
                    }}
                  />
                </div>
                <div className="admin-breakdown-legend">
                  <div className="admin-legend-item">
                    <span className="legend-indicator new" />
                    <span>New Buyers</span>
                    <strong>{summary.newCustomers || 0}</strong>
                  </div>
                  <div className="admin-legend-item">
                    <span className="legend-indicator returning" />
                    <span>Returning Patrons</span>
                    <strong>{summary.returningCustomers || 0}</strong>
                  </div>
                </div>
              </div>
            </article>

            {/* Device Mix */}
            <article className="admin-card admin-breakdown-card">
              <div className="admin-card-head">
                <h3>
                  <Smartphone size={18} /> Traffic by Device
                </h3>
              </div>
              <div className="admin-device-list">
                {(dashboard?.salesByDevice || []).length > 0 ? (
                  (dashboard?.salesByDevice || []).map((d) => (
                    <div key={d.device} className="admin-device-row">
                      <span className="admin-device-name">{d.device}</span>
                      <span className="admin-device-events">{d.events} visits</span>
                      <strong className="admin-device-rev">{formatAdminPrice(d.revenue)}</strong>
                    </div>
                  ))
                ) : (
                  <p className="admin-muted-hint">Awaiting device event tracking data.</p>
                )}
              </div>
            </article>
          </section>

          {/* Detailed Data Tables with Navigation */}
          <section className="admin-card admin-analytics-tables-card">
            <div className="admin-table-tabs">
              <button
                type="button"
                className={`admin-table-tab ${activeTableTab === "topProducts" ? "is-active" : ""}`}
                onClick={() => setActiveTableTab("topProducts")}
              >
                <Package size={15} /> Top Products ({dashboard?.topProducts?.length || 0})
              </button>
              <button
                type="button"
                className={`admin-table-tab ${activeTableTab === "lowProducts" ? "is-active" : ""}`}
                onClick={() => setActiveTableTab("lowProducts")}
              >
                <AlertTriangle size={15} /> Low Performing ({dashboard?.lowPerformingProducts?.length || 0})
              </button>
              <button
                type="button"
                className={`admin-table-tab ${activeTableTab === "categories" ? "is-active" : ""}`}
                onClick={() => setActiveTableTab("categories")}
              >
                <Layers size={15} /> Best Categories ({dashboard?.bestCategories?.length || 0})
              </button>
              <button
                type="button"
                className={`admin-table-tab ${activeTableTab === "salesByDate" ? "is-active" : ""}`}
                onClick={() => setActiveTableTab("salesByDate")}
              >
                <Calendar size={15} /> Sales by Date ({dashboard?.salesByDate?.length || 0})
              </button>
              <button
                type="button"
                className={`admin-table-tab ${activeTableTab === "location" ? "is-active" : ""}`}
                onClick={() => setActiveTableTab("location")}
              >
                <MapPin size={15} /> Geographic Sales ({dashboard?.salesByLocation?.length || 0})
              </button>
              <button
                type="button"
                className={`admin-table-tab ${activeTableTab === "coupons" ? "is-active" : ""}`}
                onClick={() => setActiveTableTab("coupons")}
              >
                <Percent size={15} /> Coupon Usage ({summary.couponUsage?.length || 0})
              </button>
            </div>

            <div className="admin-table-wrap">
              {activeTableTab === "topProducts" && (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Units Purchased</th>
                      <th>Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboard?.topProducts || []).length > 0 ? (
                      dashboard.topProducts.map((p) => (
                        <tr key={p.productId}>
                          <td>
                            <strong>{p.name}</strong>
                          </td>
                          <td>{p.purchaseCount}</td>
                          <td>
                            <strong>{formatAdminPrice(p.revenue)}</strong>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="admin-table-empty">
                          No product sales recorded in this date range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeTableTab === "lowProducts" && (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Units Sold</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboard?.lowPerformingProducts || []).length > 0 ? (
                      dashboard.lowPerformingProducts.map((p) => (
                        <tr key={p.productId}>
                          <td>{p.name}</td>
                          <td>{p.purchaseCount}</td>
                          <td>{formatAdminPrice(p.revenue)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="admin-table-empty">
                          No low-performing products detected.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeTableTab === "categories" && (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Quantity Sold</th>
                      <th>Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboard?.bestCategories || []).length > 0 ? (
                      dashboard.bestCategories.map((c) => (
                        <tr key={c.category}>
                          <td>
                            <strong>{c.category}</strong>
                          </td>
                          <td>{c.quantity}</td>
                          <td>
                            <strong>{formatAdminPrice(c.revenue)}</strong>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="admin-table-empty">
                          No category revenue recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeTableTab === "salesByDate" && (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Completed Orders</th>
                      <th>Daily Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboard?.salesByDate || []).length > 0 ? (
                      dashboard.salesByDate.map((d) => (
                        <tr key={d.date}>
                          <td>{d.date}</td>
                          <td>{d.orders}</td>
                          <td>
                            <strong>{formatAdminPrice(d.revenue)}</strong>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="admin-table-empty">
                          No daily sales in this window.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeTableTab === "location" && (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Delivery Location</th>
                      <th>Orders</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboard?.salesByLocation || []).length > 0 ? (
                      dashboard.salesByLocation.map((loc) => (
                        <tr key={loc.location}>
                          <td>{loc.location}</td>
                          <td>{loc.orders}</td>
                          <td>
                            <strong>{formatAdminPrice(loc.revenue)}</strong>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="admin-table-empty">
                          No location data for this date range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeTableTab === "coupons" && (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Coupon Code</th>
                      <th>Redemptions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(summary.couponUsage || []).length > 0 ? (
                      summary.couponUsage.map((c) => (
                        <tr key={c.code}>
                          <td>
                            <code className="admin-code-tag">{c.code}</code>
                          </td>
                          <td>{c.count} orders</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="admin-table-empty">
                          No discount coupons applied in this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
