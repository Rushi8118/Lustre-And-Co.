import {
  ChevronRight,
  CreditCard,
  FileText,
  FolderTree,
  HelpCircle,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Mail,
  MessageSquareText,
  Package,
  Percent,
  Settings,
  ShoppingBag,
  Star,
  Users,
  X
} from "lucide-react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useStore } from "../../context/StoreContext";
import { useSettings } from "../../context/SettingsContext";
import { initials } from "../utils";

export default function AdminSidebar({ sidebarOpen, setSidebarOpen, attention }) {
  const { user, logout } = useStore();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const navigation = [
    {
      label: "Overview",
      items: [{ label: "Dashboard", path: "/admin", icon: LayoutDashboard }]
    },
    {
      label: "Catalog",
      items: [
        { label: "Products", path: "/admin/products", icon: Package, badge: attention.lowStock },
        { label: "Categories", path: "/admin/categories", icon: FolderTree },
        { label: "Reviews", path: "/admin/reviews", icon: Star, badge: attention.pendingReviews }
      ]
    },
    {
      label: "Sales",
      items: [
        { label: "Orders", path: "/admin/orders", icon: ShoppingBag, badge: attention.openOrders },
        { label: "Payments", path: "/admin/payments", icon: CreditCard },
        { label: "Discounts", path: "/admin/discounts", icon: Percent }
      ]
    },
    {
      label: "Customers",
      items: [
        { label: "Customers", path: "/admin/customers", icon: Users },
        { label: "Messages", path: "/admin/messages", icon: MessageSquareText, badge: attention.newMessages },
        { label: "Subscribers", path: "/admin/subscribers", icon: Mail }
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
      label: "Configuration",
      items: [{ label: "Settings", path: "/admin/settings", icon: Settings }]
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
