import {
  BarChart3,
  ChevronRight,
  CreditCard,
  Crown,
  FileText,
  FolderTree,
  HelpCircle,
  Layers,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Mail,
  Megaphone,
  MessageSquareText,
  Package,
  Percent,
  RotateCcw,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Star,
  Truck,
  Users,
  Warehouse,
  X,
  Eye,
  Sun,
  Moon
} from "lucide-react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useStore } from "../../context/StoreContext";
import { useSettings } from "../../context/SettingsContext";
import { useAdminTheme } from "../context/AdminThemeContext";
import { initials } from "../utils";

export default function AdminSidebar({ sidebarOpen, setSidebarOpen, attention }) {
  const { user, logout } = useStore();
  const { settings } = useSettings();
  const { theme, setTheme, isDark } = useAdminTheme();
  const navigate = useNavigate();

  const navigation = [
    {
      label: "Overview",
      items: [{ label: "Dashboard", path: "/admin", icon: LayoutDashboard }]
    },
    {
      label: "Catalog",
      items: [
        { label: "Products", path: "/admin/products", icon: Package },
        { label: "Bundles & Sets", path: "/admin/bundles", icon: Layers },
        { label: "Categories", path: "/admin/categories", icon: FolderTree },
        { label: "Reviews", path: "/admin/reviews", icon: Star, badge: attention.pendingReviews }
      ]
    },
    {
      label: "Sales",
      items: [
        { label: "Orders", path: "/admin/orders", icon: ShoppingBag, badge: attention.openOrders },
        { label: "Payments", path: "/admin/payments", icon: CreditCard },
        { label: "Discounts", path: "/admin/discounts", icon: Percent },
        { label: "Abandoned Carts", path: "/admin/abandoned-carts", icon: ShoppingCart }
      ]
    },
    {
      label: "Operations",
      items: [
        { label: "Inventory", path: "/admin/inventory", icon: Warehouse, badge: attention.lowStock },
        { label: "Shipments & Logistics", path: "/admin/shipments", icon: Truck },
        { label: "Shipping Settings", path: "/admin/shipping", icon: Settings },
        { label: "Returns & Exchanges", path: "/admin/returns", icon: RotateCcw },
        { label: "Invoices & Documents", path: "/admin/invoices", icon: FileText },
      ]
    },
    {
      label: "Customers",
      items: [
        { label: "Customers", path: "/admin/customers", icon: Users },
        { label: "Messages", path: "/admin/messages", icon: MessageSquareText, badge: attention.newMessages },
        { label: "Subscribers", path: "/admin/subscribers", icon: Mail },
        { label: "Loyalty & Referrals", path: "/admin/loyalty", icon: Crown }
      ]
    },
    {
      label: "Growth & Intelligence",
      items: [
        { label: "Analytics & BI", path: "/admin/analytics", icon: BarChart3 },
        { label: "Marketing Campaigns", path: "/admin/marketing", icon: Megaphone }
      ]
    },
    {
      label: "Storefront",
      items: [
        { label: "Homepage & Banners", path: "/admin/content", icon: LayoutTemplate },
        { label: "Pages", path: "/admin/pages", icon: FileText },
        { label: "FAQs", path: "/admin/faqs", icon: HelpCircle }
      ]
    },
    {
      label: "Configuration & Security",
      items: [
        { label: "Security & Audit", path: "/admin/audit-logs", icon: ShieldCheck },
        { label: "Settings", path: "/admin/settings", icon: Settings }
      ]
    }
  ];

  const [brandLeft, brandRight] = settings.store.name.split("&").map((part) => part.trim());

  function handleLogout() {
    logout();
    navigate("/account/login");
  }

  return (
    <>
      <aside className={`admin-sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="admin-sidebar-brand">
          <Link to="/admin" onClick={() => setSidebarOpen(false)}>
            <span>{brandLeft}</span>
            {brandRight && (
              <>
                <b>&amp;</b>
                <span>{brandRight}</span>
              </>
            )}
            <small>ADMIN STUDIO</small>
          </Link>

          <button className="admin-close-sidebar" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
            <X size={19} />
          </button>
        </div>

        <div className="admin-sidebar-scroll">
          {navigation.map((group) => (
            <div className="admin-nav-group" key={group.label}>
              <span className="admin-nav-label">{group.label}</span>

              {group.items.map(({ label, path, icon: Icon, badge }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === "/admin"}
                  className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                  {badge > 0 && <span className="admin-nav-badge">{badge}</span>}
                  <ChevronRight className="admin-nav-arrow" size={15} />
                </NavLink>
              ))}
            </div>
          ))}
        </div>

        <div className="admin-sidebar-footer">
          <div className="admin-user-mini">
            <div className="admin-avatar">{initials(user?.name)}</div>
            <div>
              <strong>{user?.name}</strong>
              <span>Administrator</span>
            </div>
          </div>

          <div className="admin-sidebar-theme-card">
            <div className="admin-sidebar-theme-head">
              <span className="admin-sidebar-theme-title">
                <Eye size={13} />
                <span>Eye Comfort</span>
              </span>
              <span className="admin-sidebar-theme-badge">
                {isDark ? "Dark" : "Light"}
              </span>
            </div>

            <div className="admin-sidebar-theme-segments">
              <button
                type="button"
                className={`theme-segment-btn ${!isDark ? "is-active" : ""}`}
                onClick={() => setTheme("light")}
                title="Switch to Light Theme"
                aria-label="Light mode"
              >
                <Sun size={12} />
                <span>Light</span>
              </button>
              <button
                type="button"
                className={`theme-segment-btn ${isDark ? "is-active" : ""}`}
                onClick={() => setTheme("dark")}
                title="Switch to Dark (Eye Comfort) Theme"
                aria-label="Dark mode"
              >
                <Moon size={12} />
                <span>Dark</span>
              </button>
            </div>
          </div>

          <Link to="/" className="view-store-link">
            View storefront →
          </Link>
          <button type="button" className="view-store-link admin-link-button" onClick={handleLogout}>
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <button className="admin-sidebar-backdrop" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} />
      )}
    </>
  );
}
