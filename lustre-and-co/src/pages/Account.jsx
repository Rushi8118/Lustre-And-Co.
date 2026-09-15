import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Compass,
  Copy,
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  Plus,
  RotateCcw,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  Truck,
  UserCog,
  X,
  XCircle
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import PageIntro from "../components/PageIntro";
import { useStore } from "../context/StoreContext";
import { useSettings } from "../context/SettingsContext";
import { formatPrice } from "../data/products";
import api, { getErrorMessage } from "../services/api";

const blankAddress = {
  fullName: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
  isDefault: false
};

const statusType = (status) =>
  status === "Delivered" ? "delivered" : status === "In Transit" ? "transit" : status === "Cancelled" ? "cancelled" : "processing";

const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function StatusBadge({ status }) {
  const type = statusType(status);
  return (
    <span className={`order-status-badge ${type}`}>
      {type === "transit" && <Truck size={13} />}
      {type === "delivered" && <CheckCircle2 size={13} />}
      {type === "processing" && <Clock size={13} />}
      {type === "cancelled" && <XCircle size={13} />}
      {status}
    </span>
  );
}

export default function Account() {
  const navigate = useNavigate();
  const { user, updateUser, wishlist, addToCart, logout, showToast } = useStore();
  const { settings } = useSettings();
  const { commerce } = settings;

  const [activeTab, setActiveTab] = useState("overview");
  const [profile, setProfile] = useState({ name: user?.name || "", phone: user?.phone || "", email: user?.email || "" });
  const [memberSince, setMemberSince] = useState("");
  const [addresses, setAddresses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadState, setLoadState] = useState("loading");

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState(blankAddress);
  const [addressError, setAddressError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([api.get("/users/profile"), api.get("/orders/my-orders")])
      .then(([profileRes, ordersRes]) => {
        if (!active) return;
        const data = profileRes.data;
        setProfile({ name: data.name || "", phone: data.phone || "", email: data.email });
        setMemberSince(data.createdAt ? new Date(data.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "");
        setAddresses(data.addresses || []);
        setOrders(ordersRes.data || []);
        setLoadState("ready");
      })
      .catch(() => active && setLoadState("error"));
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const active = orders.filter((o) => o.status !== "Cancelled");
    return {
      totalOrders: orders.length,
      inTransit: orders.filter((o) => o.status === "In Transit").length,
      openOrders: orders.filter((o) => ["Confirmed", "Processing"].includes(o.status)).length,
      spent: active.reduce((sum, o) => sum + o.total, 0)
    };
  }, [orders]);

  const returnableOrders = useMemo(() => {
    const windowMs = commerce.returnWindowDays * 86400000;
    return orders.filter((o) => {
      if (o.status !== "Delivered") return false;
      const deliveredAt = [...(o.statusHistory || [])].reverse().find((h) => h.status === "Delivered")?.at || o.updatedAt;
      return Date.now() - new Date(deliveredAt).getTime() <= windowMs;
    });
  }, [orders, commerce.returnWindowDays]);

  function handleLogout() {
    logout();
    navigate("/");
  }

  function copyTracking(trackingNumber) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(trackingNumber);
      showToast(`Tracking number ${trackingNumber} copied.`, "success");
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const { data } = await api.put("/users/profile", { name: profile.name.trim(), phone: profile.phone.trim() });
      setProfile((prev) => ({ ...prev, name: data.name, phone: data.phone || "" }));
      updateUser({ name: data.name, phone: data.phone });
      showToast("Profile saved.", "success");
    } catch (err) {
      showToast(getErrorMessage(err, "Your profile could not be saved."), "error");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordMessage(null);
    if (passwordForm.newPassword !== passwordForm.confirm) {
      setPasswordMessage({ success: false, text: "New passwords do not match." });
      return;
    }
    setIsSavingPassword(true);
    try {
      const { data } = await api.put("/users/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordMessage({ success: true, text: data.message });
      setPasswordForm({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      setPasswordMessage({ success: false, text: getErrorMessage(err, "Password could not be changed.") });
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function handleAddAddress(e) {
    e.preventDefault();
    setIsSavingAddress(true);
    setAddressError("");
    try {
      const { data } = await api.post("/users/addresses", {
        ...newAddress,
        fullName: newAddress.fullName.trim(),
        phone: newAddress.phone.trim(),
        address: newAddress.address.trim(),
        city: newAddress.city.trim(),
        state: newAddress.state.trim(),
        postalCode: newAddress.postalCode.trim()
      });
      setAddresses(data);
      showToast("Address saved.", "success");
      setShowAddAddressModal(false);
      setNewAddress(blankAddress);
    } catch (err) {
      setAddressError(getErrorMessage(err, "The address could not be saved."));
    } finally {
      setIsSavingAddress(false);
    }
  }

  async function handleSetDefault(addressId) {
    try {
      const { data } = await api.patch(`/users/addresses/${addressId}/default`);
      setAddresses(data);
      showToast("Default address updated.", "success");
    } catch (err) {
      showToast(getErrorMessage(err, "Could not update the default address."), "error");
    }
  }

  async function handleDeleteAddress(addressId) {
    if (!window.confirm("Remove this address?")) return;
    try {
      const { data } = await api.delete(`/users/addresses/${addressId}`);
      setAddresses(data);
      showToast("Address removed.", "success");
    } catch (err) {
      showToast(getErrorMessage(err, "Could not remove the address."), "error");
    }
  }

  const sidebarNav = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "orders", label: "My Orders", icon: Package, badge: orders.length },
    { key: "wishlist", label: "Wishlist", icon: Heart, badge: wishlist.length },
    { key: "addresses", label: "Saved Addresses", icon: MapPin, badge: addresses.length },
    { key: "profile", label: "Profile & Security", icon: UserCog },
    { key: "returns", label: "Returns", icon: RotateCcw }
  ];

  const initials = (profile.name || "?")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function renderOrderCard(order, compact = false) {
    return (
      <div key={order._id} className={compact ? "account-order-item" : "account-card account-order-full-item"}>
        <div className="order-meta-header">
          <div className="order-identity">
            <span className="order-id-label">ORDER #{order.orderId}</span>
            <span className="order-date-label">Placed on {formatDate(order.createdAt)}</span>
          </div>
          <div className="order-status-badge-wrap">
            <StatusBadge status={order.status} />
          </div>
        </div>

        {compact ? (
          <div className="order-items-row">
            <div className="order-thumbnails-group">
              {order.items.map((item, idx) => (
                <div key={idx} className="order-thumb-wrap" title={item.name}>
                  <img src={item.image} alt={item.name} />
                  {item.quantity > 1 && <span className="order-qty-pill">x{item.quantity}</span>}
                </div>
              ))}
            </div>
            <div className="order-summary-details">
              <p className="order-names-list">{order.items.map((i) => i.name).join(", ")}</p>
              <div className="order-price-and-carrier">
                <span className="order-total-amount">{formatPrice(order.total)}</span>
                <span className="order-carrier-note">Est. {order.estimatedDeliveryDate}</span>
              </div>
            </div>
            <div className="order-actions-group">
              <Link to={`/track-order?order=${order.orderId}`} className="button button-dark button-sm">
                Track
              </Link>
              <Link to={`/order-confirmation/${order.orderId}`} className="button button-outline-dark button-sm">
                Details
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="order-full-items-table">
              {order.items.map((item, idx) => (
                <div key={idx} className="order-item-row">
                  <img src={item.image} alt={item.name} className="order-item-thumb" />
                  <div className="order-item-info">
                    <h4>{item.name}</h4>
                    <span className="order-item-variant">
                      {item.color}
                      {item.size ? ` | ${item.size}` : ""} | Qty: {item.quantity}
                    </span>
                  </div>
                  <div className="order-item-price">{formatPrice(item.price * item.quantity)}</div>
                </div>
              ))}
            </div>

            <div className="order-full-footer">
              <div className="order-tracking-info">
                <span>
                  Total: <strong>{formatPrice(order.total)}</strong> · {order.payment?.method === "cod" ? "Cash on delivery" : "Online"} (
                  {order.payment?.status})
                </span>
                {order.trackingNumber && (
                  <span className="tracking-code-wrap">
                    {order.carrier}: <strong>{order.trackingNumber}</strong>
                    <button type="button" className="copy-btn" onClick={() => copyTracking(order.trackingNumber)} title="Copy tracking number">
                      <Copy size={13} />
                    </button>
                  </span>
                )}
              </div>

              <div className="order-actions-wrap">
                <Link to={`/track-order?order=${order.orderId}`} className="button button-dark button-sm">
                  Track Order
                </Link>
                <Link to={`/order-confirmation/${order.orderId}`} className="button button-outline-dark button-sm">
                  View Details
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <PageIntro
        eyebrow="My Account"
        title="Customer Dashboard"
        description="Manage your orders, saved pieces, addresses, and account details."
        breadcrumbs={[{ label: "Dashboard" }]}
      />

      <section className="account-dashboard-page">
        <div className="account-container">
          <div className="account-layout-grid">
            <aside className="account-sidebar">
              <div className="account-sidebar-profile">
                <div className="account-avatar-wrap">
                  <div className="account-avatar-initials">{initials}</div>
                  <span className="account-vip-badge-ring">
                    <Sparkles size={11} />
                  </span>
                </div>
                <div className="account-sidebar-info">
                  <h3 className="account-user-name">{profile.name}</h3>
                  <p className="account-user-email">{profile.email}</p>
                  {memberSince && <span className="account-tier-pill">Member since {memberSince}</span>}
                </div>
              </div>

              <nav className="account-sidebar-nav" aria-label="Account Navigation">
                {sidebarNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={`account-nav-button ${activeTab === item.key ? "active" : ""}`}
                      onClick={() => setActiveTab(item.key)}
                    >
                      <Icon size={18} className="account-nav-icon" />
                      <span className="account-nav-label">{item.label}</span>
                      {item.badge !== undefined && <span className="account-nav-badge">{item.badge}</span>}
                    </button>
                  );
                })}
                <Link to="/track-order" className="account-nav-button">
                  <Compass size={18} className="account-nav-icon" />
                  <span className="account-nav-label">Track an Order</span>
                </Link>
                <button type="button" className="account-nav-button account-logout-button" onClick={handleLogout}>
                  <LogOut size={18} className="account-nav-icon" />
                  <span className="account-nav-label">Logout</span>
                </button>
              </nav>

              <div className="account-sidebar-concierge">
                <div className="account-concierge-icon">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h4>Need help?</h4>
                  <p>Our support team can help with orders, returns, and product questions.</p>
                  <Link to="/contact" className="account-concierge-link">
                    Contact Support →
                  </Link>
                </div>
              </div>

              {user?.role === "admin" && (
                <div className="account-admin-portal-card">
                  <div className="account-admin-portal-title">
                    <Shield size={16} />
                    <strong>Store Administrator</strong>
                  </div>
                  <p>Manage products, orders, customers, content, and settings.</p>
                  <Link to="/admin" className="button button-gold button-sm">
                    Open Admin Panel →
                  </Link>
                </div>
              )}
            </aside>

            <main className="account-main-content">
              {loadState === "loading" && <p className="catalog-loading">Loading your account…</p>}
              {loadState === "error" && (
                <p className="inline-alert inline-alert-error">Your account details could not be loaded. Please refresh the page.</p>
              )}

              {loadState === "ready" && activeTab === "overview" && (
                <div className="account-tab-view account-overview-view">
                  <div className="account-welcome-banner">
                    <div className="account-welcome-text">
                      <span className="account-welcome-kicker">
                        <Sparkles size={13} />
                        Your space
                      </span>
                      <h2>
                        Welcome back, <em>{profile.name.split(" ")[0]}</em>.
                      </h2>
                      <p>Keep track of your orders and the pieces you love.</p>
                    </div>
                    <div className="account-welcome-actions">
                      <Link to="/new-arrivals" className="button button-gold">
                        <ShoppingBag size={15} />
                        Explore New Arrivals
                      </Link>
                      <button type="button" className="button button-outline-dark" onClick={() => setActiveTab("orders")}>
                        View All Orders
                      </button>
                    </div>
                  </div>

                  <div className="account-metrics-grid">
                    <div className="account-metric-card" onClick={() => setActiveTab("orders")}>
                      <div className="metric-header">
                        <span className="metric-label">IN TRANSIT</span>
                        <div className="metric-icon transit-icon">
                          <Truck size={18} />
                        </div>
                      </div>
                      <div className="metric-value">{stats.inTransit}</div>
                      <div className="metric-subtext">{stats.openOrders} being prepared</div>
                    </div>
                    <div className="account-metric-card" onClick={() => setActiveTab("orders")}>
                      <div className="metric-header">
                        <span className="metric-label">TOTAL ORDERS</span>
                        <div className="metric-icon orders-icon">
                          <Package size={18} />
                        </div>
                      </div>
                      <div className="metric-value">{stats.totalOrders}</div>
                      <div className="metric-subtext">All time</div>
                    </div>
                    <div className="account-metric-card" onClick={() => setActiveTab("wishlist")}>
                      <div className="metric-header">
                        <span className="metric-label">WISHLIST</span>
                        <div className="metric-icon wishlist-icon">
                          <Heart size={18} />
                        </div>
                      </div>
                      <div className="metric-value">{wishlist.length}</div>
                      <div className="metric-subtext">Saved pieces</div>
                    </div>
                    <div className="account-metric-card">
                      <div className="metric-header">
                        <span className="metric-label">TOTAL SPENT</span>
                        <div className="metric-icon vip-icon">
                          <ShoppingBag size={18} />
                        </div>
                      </div>
                      <div className="metric-value">{formatPrice(stats.spent)}</div>
                      <div className="metric-subtext">Excluding cancelled orders</div>
                    </div>
                  </div>

                  <div className="account-card account-recent-orders-card">
                    <div className="account-card-header">
                      <div>
                        <span className="account-card-eyebrow">ORDER HISTORY</span>
                        <h3 className="account-card-title">Recent Orders</h3>
                      </div>
                      {orders.length > 0 && (
                        <button type="button" className="account-card-action-link" onClick={() => setActiveTab("orders")}>
                          View all ({orders.length}) →
                        </button>
                      )}
                    </div>
                    <div className="account-orders-list">
                      {orders.length === 0 ? (
                        <p className="account-empty-note">
                          You haven’t placed any orders yet. <Link to="/shop">Start shopping</Link>
                        </p>
                      ) : (
                        orders.slice(0, 2).map((order) => renderOrderCard(order, true))
                      )}
                    </div>
                  </div>

                  <div className="account-split-cards-row">
                    <div className="account-card account-wishlist-preview-card">
                      <div className="account-card-header">
                        <div>
                          <span className="account-card-eyebrow">FAVORITES</span>
                          <h3 className="account-card-title">Wishlist Preview</h3>
                        </div>
                        <Link to="/wishlist" className="account-card-action-link">
                          See all →
                        </Link>
                      </div>
                      <div className="account-wishlist-grid">
                        {wishlist.length === 0 && <p className="account-empty-note">Nothing saved yet.</p>}
                        {wishlist.slice(0, 4).map((piece) => (
                          <div key={piece.slug} className="account-wishlist-item">
                            <div className="wishlist-thumb-box">
                              <img src={piece.image} alt={piece.name} />
                            </div>
                            <div className="wishlist-item-meta">
                              <h4 className="wishlist-piece-name">{piece.name}</h4>
                              <span className="wishlist-piece-price">{formatPrice(piece.price)}</span>
                            </div>
                            <button type="button" className="wishlist-add-bag-btn" onClick={() => addToCart(piece, 1)} title="Add to Bag">
                              <ShoppingBag size={14} />
                              Add
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="account-card account-address-preview-card">
                      <div className="account-card-header">
                        <div>
                          <span className="account-card-eyebrow">DELIVERY</span>
                          <h3 className="account-card-title">Saved Addresses</h3>
                        </div>
                        <button type="button" className="account-card-action-link" onClick={() => setActiveTab("addresses")}>
                          Manage →
                        </button>
                      </div>
                      <div className="account-address-preview-list">
                        {addresses.length === 0 && <p className="account-empty-note">No saved addresses yet.</p>}
                        {addresses.slice(0, 2).map((addr) => (
                          <div key={addr._id} className={`account-address-box ${addr.isDefault ? "is-default" : ""}`}>
                            <div className="address-box-head">
                              <span className="address-tag-badge">{addr.isDefault ? "DEFAULT SHIPPING" : "SAVED ADDRESS"}</span>
                            </div>
                            <h4 className="address-recipient-name">{addr.fullName}</h4>
                            <p className="address-street-line">{addr.address}</p>
                            <p className="address-city-line">
                              {addr.city}, {addr.state} {addr.postalCode}, {addr.country}
                            </p>
                            <p className="address-phone-line">Phone: {addr.phone}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {loadState === "ready" && activeTab === "orders" && (
                <div className="account-tab-view account-orders-view">
                  <div className="account-tab-header">
                    <h2>My Orders ({orders.length})</h2>
                    <p>Track shipments and review previous purchases.</p>
                  </div>
                  <div className="account-orders-list">
                    {orders.length === 0 ? (
                      <p className="account-empty-note">
                        No orders yet. <Link to="/shop">Browse the collection</Link>
                      </p>
                    ) : (
                      orders.map((order) => renderOrderCard(order))
                    )}
                  </div>
                </div>
              )}

              {loadState === "ready" && activeTab === "wishlist" && (
                <div className="account-tab-view account-wishlist-view">
                  <div className="account-tab-header">
                    <h2>My Wishlist ({wishlist.length})</h2>
                    <p>Pieces you’ve saved for later.</p>
                  </div>
                  <div className="account-full-wishlist-grid">
                    {wishlist.length === 0 && <p className="account-empty-note">Nothing saved yet.</p>}
                    {wishlist.map((piece) => (
                      <div key={piece.slug} className="account-card wishlist-full-card">
                        <Link to={`/product/${piece.slug}`}>
                          <img src={piece.image} alt={piece.name} className="wishlist-card-img" />
                        </Link>
                        <div className="wishlist-card-body">
                          <h4>{piece.name}</h4>
                          <span className="wishlist-card-price">{formatPrice(piece.price)}</span>
                          <button type="button" className="button button-dark button-sm" onClick={() => addToCart(piece, 1)}>
                            <ShoppingBag size={14} /> Add to Bag
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {loadState === "ready" && activeTab === "addresses" && (
                <div className="account-tab-view account-addresses-view">
                  <div className="account-tab-header account-tab-header-row">
                    <div>
                      <h2>Saved Addresses ({addresses.length})</h2>
                      <p>Manage delivery destinations for faster checkout.</p>
                    </div>
                    <button type="button" className="button button-gold button-sm" onClick={() => setShowAddAddressModal(true)}>
                      <Plus size={15} /> Add New Address
                    </button>
                  </div>

                  <div className="account-addresses-grid">
                    {addresses.length === 0 && <p className="account-empty-note">No saved addresses yet.</p>}
                    {addresses.map((addr) => (
                      <div key={addr._id} className="account-card address-full-card">
                        <div className="address-box-head">
                          <span className="address-tag-badge">{addr.isDefault ? "DEFAULT SHIPPING" : "SAVED ADDRESS"}</span>
                          {addr.isDefault && (
                            <span className="address-default-badge">
                              <CheckCircle2 size={12} /> Default
                            </span>
                          )}
                        </div>
                        <h3>{addr.fullName}</h3>
                        <p>{addr.address}</p>
                        <p>
                          {addr.city}, {addr.state} {addr.postalCode}
                        </p>
                        <p>{addr.country}</p>
                        <p className="addr-phone">Phone: {addr.phone}</p>

                        <div className="address-card-actions">
                          {!addr.isDefault && (
                            <button type="button" className="text-link" onClick={() => handleSetDefault(addr._id)}>
                              Set as Default
                            </button>
                          )}
                          <button type="button" className="text-link account-danger-link" onClick={() => handleDeleteAddress(addr._id)}>
                            <Trash2 size={13} /> Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {loadState === "ready" && activeTab === "profile" && (
                <div className="account-tab-view account-profile-view">
                  <div className="account-tab-header">
                    <h2>Profile &amp; Security</h2>
                    <p>Keep your contact information and password up to date.</p>
                  </div>

                  <div className="account-card profile-settings-form-card">
                    <form onSubmit={handleSaveProfile} className="profile-form">
                      <div className="form-row-2">
                        <label className="auth-field">
                          <span>Full Name</span>
                          <input type="text" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required />
                        </label>
                        <label className="auth-field">
                          <span>Email Address</span>
                          <input type="email" value={profile.email} disabled />
                        </label>
                      </div>
                      <div className="form-row-2">
                        <label className="auth-field">
                          <span>Phone Number</span>
                          <input type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                        </label>
                      </div>
                      <button type="submit" className="button button-gold" disabled={isSavingProfile}>
                        {isSavingProfile ? "Saving…" : "Save Profile"}
                      </button>
                    </form>
                  </div>

                  <div className="account-card profile-settings-form-card">
                    <form onSubmit={handleChangePassword} className="profile-form">
                      <h3 className="account-card-title">Change Password</h3>
                      <div className="form-row-2">
                        <label className="auth-field">
                          <span>Current Password</span>
                          <input
                            type="password"
                            autoComplete="current-password"
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                            required
                          />
                        </label>
                      </div>
                      <div className="form-row-2">
                        <label className="auth-field">
                          <span>New Password</span>
                          <input
                            type="password"
                            autoComplete="new-password"
                            minLength={8}
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                            required
                          />
                        </label>
                        <label className="auth-field">
                          <span>Confirm New Password</span>
                          <input
                            type="password"
                            autoComplete="new-password"
                            minLength={8}
                            value={passwordForm.confirm}
                            onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                            required
                          />
                        </label>
                      </div>
                      {passwordMessage && (
                        <p className={`inline-alert ${passwordMessage.success ? "inline-alert-success" : "inline-alert-error"}`}>
                          {passwordMessage.text}
                        </p>
                      )}
                      <button type="submit" className="button button-dark" disabled={isSavingPassword}>
                        {isSavingPassword ? "Updating…" : "Update Password"}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {loadState === "ready" && activeTab === "returns" && (
                <div className="account-tab-view account-returns-view">
                  <div className="account-tab-header">
                    <h2>Returns</h2>
                    <p>Eligible items can be returned within {commerce.returnWindowDays} days of delivery.</p>
                  </div>

                  <div className="account-card returns-policy-card">
                    <div className="returns-badge-row">
                      <div className="returns-perk">
                        <RotateCcw size={20} className="returns-perk-icon" />
                        <div>
                          <h4>{commerce.returnWindowDays}-Day Returns</h4>
                          <p>Unworn items in original packaging.</p>
                        </div>
                      </div>
                      <div className="returns-perk">
                        <ShieldCheck size={20} className="returns-perk-icon" />
                        <div>
                          <h4>Refunds</h4>
                          <p>Approved refunds go to the original payment method.</p>
                        </div>
                      </div>
                    </div>

                    <div className="eligible-orders-box">
                      <h3>Orders Eligible for Return</h3>
                      {returnableOrders.length === 0 ? (
                        <p className="account-empty-note">
                          No delivered orders are currently within the return window. See our{" "}
                          <Link to="/shipping-returns">returns policy</Link>.
                        </p>
                      ) : (
                        returnableOrders.map((order) => (
                          <div key={order._id} className="eligible-order-row">
                            <div>
                              <strong>{order.orderId}</strong>
                              <p>{order.items.map((i) => i.name).join(", ")}</p>
                            </div>
                            <Link
                              to={`/contact?reason=${encodeURIComponent("Returns and exchanges")}&order=${order.orderId}`}
                              className="button button-dark button-sm"
                            >
                              Request a Return
                            </Link>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </section>

      {showAddAddressModal && (
        <div className="account-modal-backdrop" onClick={() => setShowAddAddressModal(false)}>
          <div className="account-modal-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <button type="button" className="account-modal-close" onClick={() => setShowAddAddressModal(false)} aria-label="Close">
              <X size={20} />
            </button>

            <h3 className="account-modal-title">Add Shipping Address</h3>
            <p className="account-modal-sub">Save a delivery address for faster checkout.</p>

            <form onSubmit={handleAddAddress} className="account-modal-form">
              <div className="form-row-2">
                <label className="auth-field">
                  <span>Recipient Name *</span>
                  <input type="text" required value={newAddress.fullName} onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })} />
                </label>
                <label className="auth-field">
                  <span>Contact Phone *</span>
                  <input type="tel" required value={newAddress.phone} onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })} />
                </label>
              </div>
              <label className="auth-field">
                <span>Street Address *</span>
                <input type="text" required value={newAddress.address} onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })} />
              </label>
              <div className="form-row-2">
                <label className="auth-field">
                  <span>City *</span>
                  <input type="text" required value={newAddress.city} onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })} />
                </label>
                <label className="auth-field">
                  <span>State *</span>
                  <input type="text" required value={newAddress.state} onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })} />
                </label>
              </div>
              <div className="form-row-2">
                <label className="auth-field">
                  <span>Postal Code *</span>
                  <input type="text" required value={newAddress.postalCode} onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })} />
                </label>
                <label className="auth-field">
                  <span>Country</span>
                  <input type="text" value={newAddress.country} onChange={(e) => setNewAddress({ ...newAddress, country: e.target.value })} />
                </label>
              </div>
              <label className="account-modal-checkbox">
                <input type="checkbox" checked={newAddress.isDefault} onChange={(e) => setNewAddress({ ...newAddress, isDefault: e.target.checked })} />
                <span>Set as default shipping address</span>
              </label>

              {addressError && <p className="inline-alert inline-alert-error">{addressError}</p>}

              <div className="account-modal-actions">
                <button type="button" className="button button-outline-dark button-sm" onClick={() => setShowAddAddressModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="button button-gold button-sm" disabled={isSavingAddress}>
                  {isSavingAddress ? "Saving…" : "Save Address"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
