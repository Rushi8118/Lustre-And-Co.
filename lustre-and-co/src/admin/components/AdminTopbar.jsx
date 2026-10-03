import { Bell, Menu, Search, ExternalLink, LogOut, Sun, Moon, Eye, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useStore } from "../../context/StoreContext";
import { useAdminTheme } from "../context/AdminThemeContext";
import { initials } from "../utils";

export default function AdminTopbar({ onMenuClick, attention }) {
  const navigate = useNavigate();
  const { user, logout } = useStore();
  const { theme, toggleTheme, isDark } = useAdminTheme();
  const [search, setSearch] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const notifications = [
    attention.openOrders > 0 && {
      to: "/admin/orders?status=Confirmed",
      tone: "notification-rose",
      text: `${attention.openOrders} order${attention.openOrders === 1 ? "" : "s"} waiting to be fulfilled`
    },
    attention.lowStock > 0 && {
      to: "/admin/products?stock=low",
      tone: "notification-gold",
      text: `${attention.lowStock} product${attention.lowStock === 1 ? " is" : "s are"} low on stock`
    },
    attention.pendingReviews > 0 && {
      to: "/admin/reviews",
      tone: "notification-green",
      text: `${attention.pendingReviews} review${attention.pendingReviews === 1 ? "" : "s"} awaiting moderation`
    },
    attention.newMessages > 0 && {
      to: "/admin/messages",
      tone: "notification-rose",
      text: `${attention.newMessages} new customer message${attention.newMessages === 1 ? "" : "s"}`
    }
  ].filter(Boolean);

  function submitSearch(event) {
    event.preventDefault();
    if (!search.trim()) return;
    navigate(`/admin/orders?search=${encodeURIComponent(search.trim())}`);
    setSearch("");
  }

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-left">
        <button className="admin-menu-toggle" onClick={onMenuClick} aria-label="Open menu">
          <Menu size={20} />
        </button>

        <form className="admin-search" onSubmit={submitSearch}>
          <Search size={16} className="admin-search-icon" />
          <input
            ref={searchInputRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search orders by ID, name, email, phone…"
            aria-label="Search orders"
          />
          {search && (
            <button
              type="button"
              className="admin-search-clear"
              onClick={() => {
                setSearch("");
                searchInputRef.current?.focus();
              }}
              title="Clear search"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
          <kbd className="admin-search-kbd">⌘K</kbd>
        </form>
      </div>

      <div className="admin-topbar-actions">
        <Link to="/" className="admin-view-store">
          <ExternalLink size={15} />
          <span>View store</span>
        </Link>

        <button
          type="button"
          className={`admin-theme-toggle-btn ${isDark ? "is-dark" : "is-light"}`}
          onClick={toggleTheme}
          title={isDark ? "Eye Comfort (Dark Theme) active — Click to switch to Light Theme" : "Switch to Dark Theme (Eye Comfort)"}
          aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          <span className="theme-toggle-track">
            <span className="theme-toggle-thumb">
              {isDark ? <Moon size={12} /> : <Sun size={12} />}
            </span>
          </span>
          <span className="theme-toggle-text">
            {isDark ? "Dark" : "Light"}
          </span>
        </button>

        <div className="admin-notification-wrap">
          <button
            className="admin-topbar-icon"
            onClick={() => setNotificationsOpen((isOpen) => !isOpen)}
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
          >
            <Bell size={18} />
            {notifications.length > 0 && <span className="admin-notification-dot" />}
          </button>

          {notificationsOpen && (
            <div className="admin-notification-panel">
              <div>
                <strong>Needs attention</strong>
                <span>{notifications.length ? `${notifications.length} item(s)` : "All caught up"}</span>
              </div>

              {notifications.length === 0 && <p className="admin-muted">Nothing needs your attention right now.</p>}

              {notifications.map((item) => (
                <Link key={item.to} to={item.to} onClick={() => setNotificationsOpen(false)}>
                  <span className={`notification-dot ${item.tone}`} />
                  {item.text}
                </Link>
              ))}
            </div>
          )}
        </div>

        <Link to="/admin/settings" className="admin-profile">
          <span className="admin-avatar">{initials(user?.name)}</span>
          <span className="admin-profile-copy">
            <strong>{user?.name}</strong>
            <small>Admin</small>
          </span>
        </Link>

        <button
          type="button"
          className="admin-topbar-logout"
          onClick={() => {
            logout();
            navigate("/account/login");
          }}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
