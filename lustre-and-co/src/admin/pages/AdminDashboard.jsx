import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, CircleDollarSign, Package, ShoppingBag, Users, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import StatCard from "../components/StatCard";
import SalesChart from "../components/SalesChart";
import AdminTable from "../components/AdminTable";
import { ErrorState, LoadingState, StatusBadge } from "../components/AdminUi";
import { formatAdminPrice, formatDate, orderStatusTone, paymentTone } from "../utils";
import { useStore } from "../../context/StoreContext";
import api, { getErrorMessage } from "../../services/api";

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default function AdminDashboard() {
  const { user } = useStore();
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: response } = await api.get("/admin/dashboard", { params: { days } });
      setData(response);
    } catch (err) {
      setError(getErrorMessage(err, "Dashboard metrics could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const orderColumns = [
    {
      key: "id",
      label: "Order",
      render: (row) => (
        <Link className="admin-table-link" to={`/admin/orders?search=${row.id}`}>
          #{row.id}
        </Link>
      )
    },
    {
      key: "customer",
      label: "Customer",
      render: (row) => (
        <div className="admin-customer-cell">
          <span className="customer-initial">{row.customer.slice(0, 1)}</span>
          <div>
            <strong>{row.customer}</strong>
            <small>{row.email}</small>
          </div>
        </div>
      )
    },
    { key: "createdAt", label: "Date", render: (row) => formatDate(row.createdAt) },
    { key: "amount", label: "Amount", render: (row) => <strong>{formatAdminPrice(row.amount)}</strong> },
    {
      key: "payment",
      label: "Payment",
      render: (row) => <StatusBadge tone={paymentTone(row.payment)}>{row.payment}</StatusBadge>
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge tone={orderStatusTone(row.status)}>{row.status}</StatusBadge>
    }
  ];

  const metrics = data?.metrics;
  const attention = data?.attention;

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </span>
          <h1>
            {greeting()}, {user?.name?.split(" ")[0]}.
          </h1>
          <p>Here’s what is happening across your store.</p>
        </div>

        <div className="admin-heading-actions">
          <select
            className="admin-select"
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            aria-label="Reporting period"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button type="button" className="admin-button admin-button-light" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? "spin-icon" : ""} />
            Refresh
          </button>
          <Link to="/admin/products?new=1" className="admin-button admin-button-dark">
            Add product
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {!data && loading && <LoadingState label="Loading dashboard…" />}

      {data && (
        <>
          <div className="admin-stats-grid">
            <StatCard label={`Revenue (${days}d)`} value={formatAdminPrice(metrics.revenue)} change={metrics.revenueChange} icon={CircleDollarSign} tone="gold" />
            <StatCard label={`Orders (${days}d)`} value={metrics.orders.toLocaleString()} change={metrics.ordersChange} icon={ShoppingBag} tone="rose" />
            <StatCard
              label="Customers"
              value={metrics.totalCustomers.toLocaleString()}
              change={metrics.newCustomersChange}
              note={`${metrics.newCustomers} new in this period`}
              icon={Users}
              tone="beige"
            />
            <StatCard
              label="Products"
              value={metrics.totalProducts.toLocaleString()}
              note={`${attention.lowStock} low on stock`}
              icon={Package}
              tone="dark"
            />
          </div>

          <div className="admin-attention-grid">
            <Link to="/admin/orders?status=Confirmed" className="admin-attention-card">
              <span>Orders to fulfil</span>
              <strong>{attention.openOrders}</strong>
            </Link>
            <Link to="/admin/reviews" className="admin-attention-card">
              <span>Reviews to moderate</span>
              <strong>{attention.pendingReviews}</strong>
            </Link>
            <Link to="/admin/messages" className="admin-attention-card">
              <span>New messages</span>
              <strong>{attention.newMessages}</strong>
            </Link>
            <Link to="/admin/products?stock=low" className="admin-attention-card">
              <span>Low stock items</span>
              <strong>{attention.lowStock}</strong>
            </Link>
          </div>

          <div className="admin-dashboard-grid">
            <section className="admin-panel admin-sales-panel">
              <div className="admin-panel-heading">
                <div>
                  <span className="admin-eyebrow">Performance</span>
                  <h2>Revenue overview</h2>
                </div>
              </div>

              <div className="revenue-highlight">
                <strong>{formatAdminPrice(metrics.revenue)}</strong>
                <span>
                  Average order value: {formatAdminPrice(metrics.averageOrderValue)} · Lifetime revenue:{" "}
                  {formatAdminPrice(metrics.lifetimeRevenue)}
                </span>
              </div>

              <SalesChart data={data.salesTrend} />
            </section>

            <section className="admin-panel">
              <div className="admin-panel-heading">
                <div>
                  <span className="admin-eyebrow">Inventory attention</span>
                  <h2>Low stock</h2>
                </div>
                <Link to="/admin/products?stock=low" className="admin-inline-link">
                  View all →
                </Link>
              </div>

              <div className="low-stock-list">
                {data.lowStockAlerts.length === 0 ? (
                  <p className="admin-muted">All products are well stocked.</p>
                ) : (
                  data.lowStockAlerts.map((product) => (
                    <div className="low-stock-item" key={product.id}>
                      <img src={product.image} alt={product.name} />
                      <div>
                        <strong>{product.name}</strong>
                        <span>{product.stock} units remaining</span>
                      </div>
                      <span className={`stock-level ${product.stock === 0 ? "out" : ""}`}>
                        {product.stock === 0 ? "Out" : "Low"}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <Link to="/admin/products" className="admin-panel-bottom-link">
                Manage inventory <ArrowUpRight size={15} />
              </Link>
            </section>
          </div>

          <section className="admin-panel admin-orders-panel">
            <div className="admin-panel-heading">
              <div>
                <span className="admin-eyebrow">Store activity</span>
                <h2>Recent orders</h2>
              </div>
              <Link to="/admin/orders" className="admin-inline-link">
                View all orders →
              </Link>
            </div>

            <AdminTable columns={orderColumns} rows={data.recentOrders} emptyMessage="No orders have been placed yet." />
          </section>
        </>
      )}
    </div>
  );
}
