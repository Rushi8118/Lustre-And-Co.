import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useStore } from "../context/StoreContext";
import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import AdminProducts from "./pages/AdminProducts";
import AdminBundles from "./pages/AdminBundles";
import AdminCategories from "./pages/AdminCategories";
import AdminReviews from "./pages/AdminReviews";
import AdminOrders from "./pages/AdminOrders";
import AdminPayments from "./pages/AdminPayments";
import AdminDiscounts from "./pages/AdminDiscounts";
import AdminCustomers from "./pages/AdminCustomers";
import AdminMessages from "./pages/AdminMessages";
import AdminSubscribers from "./pages/AdminSubscribers";
import AdminContent from "./pages/AdminContent";
import AdminPages from "./pages/AdminPages";
import AdminFaqs from "./pages/AdminFaqs";
import AdminSettings from "./pages/AdminSettings";
import AdminAbandonedCarts from "./pages/AdminAbandonedCarts";
import AdminLoyalty from "./pages/AdminLoyalty";
import AdminInventory from "./pages/AdminInventory";
import AdminShipments from "./pages/AdminShipments";
import AdminShipping from "./pages/AdminShipping";
import AdminReturns from "./pages/AdminReturns";
import AdminInvoices from "./pages/AdminInvoices";
import AdminMarketing from "./pages/AdminMarketing";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminAuditLogs from "./pages/AdminAuditLogs";
import "./admin.css";
import "./admin-extras.css";

const ADMIN_ROLES = [
  "owner",
  "manager",
  "catalog-manager",
  "order-manager",
  "support-agent",
  "marketing-manager",
  "accountant",
  "admin",
];

export default function AdminApp() {
  const { user, authReady } = useStore();
  const location = useLocation();

  if (!authReady) {
    return (
      <div className="app-boot" role="status">
        <span className="app-boot-mark">✦</span>
        <p>Checking admin access…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/account/login" replace state={{ from: location.pathname }} />;
  }

  if (!ADMIN_ROLES.includes(user.role)) {
    return (
      <div className="admin-access-denied">
        <ShieldAlert size={36} />
        <h1>Admins only</h1>
        <p>Your account ({user.email}) does not have access to the admin panel.</p>
        <Link to="/" className="admin-button admin-button-dark">
          Back to the store
        </Link>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="bundles" element={<AdminBundles />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="reviews" element={<AdminReviews />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="discounts" element={<AdminDiscounts />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="messages" element={<AdminMessages />} />
        <Route path="subscribers" element={<AdminSubscribers />} />
        <Route path="content" element={<AdminContent />} />
        <Route path="pages" element={<AdminPages />} />
        <Route path="faqs" element={<AdminFaqs />} />
        <Route path="abandoned-carts" element={<AdminAbandonedCarts />} />
        <Route path="loyalty" element={<AdminLoyalty />} />
        <Route path="inventory" element={<AdminInventory />} />
        <Route path="shipments" element={<AdminShipments />} />
        <Route path="shipping" element={<AdminShipping />} />
        <Route path="returns" element={<AdminReturns />} />
        <Route path="invoices" element={<AdminInvoices />} />
        <Route path="marketing" element={<AdminMarketing />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="audit-logs" element={<AdminAuditLogs />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}
