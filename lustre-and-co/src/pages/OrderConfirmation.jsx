import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, ShoppingBag, Truck, MapPin, Gift, ShieldCheck, Clock, CreditCard } from "lucide-react";
import { formatPrice } from "../data/products";
import { useStore } from "../context/StoreContext";
import { useSettings } from "../context/SettingsContext";
import api, { getErrorMessage } from "../services/api";
import { payOrderOnline } from "../services/payments";

export default function OrderConfirmation() {
  const { orderId } = useParams();
  const { lastOrder, setLastOrder, authReady, showToast } = useStore();
  const { settings } = useSettings();

  const hasFullOrder = lastOrder?.orderId === orderId && Array.isArray(lastOrder.items);
  const [order, setOrder] = useState(hasFullOrder ? lastOrder : null);
  const [status, setStatus] = useState(hasFullOrder ? "ready" : "loading");
  const [isPaying, setIsPaying] = useState(false);

  const fetchOrder = useCallback(async () => {
    const email = lastOrder?.orderId === orderId ? lastOrder.email || lastOrder.customer?.email : undefined;
    try {
      const { data } = await api.get(`/orders/${encodeURIComponent(orderId)}`, { params: email ? { email } : {} });
      setOrder(data);
      setStatus("ready");
      return data;
    } catch {
      setStatus("not-found");
      return null;
    }
  }, [orderId, lastOrder]);

  useEffect(() => {
    if (!authReady || order?.orderId === orderId) return;
    fetchOrder();
  }, [authReady, orderId, order, fetchOrder]);

  async function handlePayNow() {
    setIsPaying(true);
    try {
      const result = await payOrderOnline(order, settings.store.name);
      if (result === "paid") {
        showToast("Payment received. Thank you!", "success");
        const fresh = await fetchOrder();
        if (fresh) setLastOrder(fresh);
      }
    } catch (err) {
      showToast(getErrorMessage(err, "Payment could not be completed."), "error");
    } finally {
      setIsPaying(false);
    }
  }

  if (status === "loading") {
    return (
      <section className="section">
        <div className="container">
          <p className="catalog-loading">Loading your order…</p>
        </div>
      </section>
    );
  }

  if (status === "not-found" || !order) {
    return (
      <section className="section">
        <div className="container empty-state">
          <span className="empty-icon">✦</span>
          <h1>We couldn’t open this order</h1>
          <p>
            For your privacy, order details are only shown to the account that placed them. You can look up order{" "}
            <strong>{orderId}</strong> with the email used at checkout.
          </p>
          <Link to={`/track-order?order=${encodeURIComponent(orderId)}`} className="button button-dark">
            Track this order
          </Link>
        </div>
      </section>
    );
  }

  const payment = order.payment || {};
  const isPaid = payment.status === "paid";
  const awaitingOnlinePayment = payment.method === "razorpay" && !isPaid && order.status !== "Cancelled";
  const address = order.shippingAddress || {};
  const customer = order.customer || {};
  const placedOn = new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="order-confirmation-page">
      <section className="section order-confirmation-section">
        <div className="container">
          <div className="confirmation-main-card">
            <div className="confirmation-badge-container">
              <div className="confirmation-aura" />
              <div className="confirmation-circle">
                <svg className="confirmation-checkmark-svg" viewBox="0 0 52 52" aria-hidden="true">
                  <circle className="checkmark-circle" cx="26" cy="26" r="23" fill="none" />
                  <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                </svg>
              </div>
            </div>

            <span className="confirmation-eyebrow">
              {isPaid ? "Payment Received" : payment.method === "cod" ? "Order Placed · Cash on Delivery" : "Order Placed"}
            </span>
            <h1 className="confirmation-title">Thank You for Your Order!</h1>
            <p className="confirmation-friendly-message">Your jewelry is being prepared with care.</p>
            <p className="confirmation-email-notice">
              Keep your order number handy — you can track it anytime with <strong>{customer.email}</strong>.
            </p>

            {awaitingOnlinePayment && (
              <div className="inline-alert inline-alert-warning">
                <span>Payment for this order is still pending.</span>
                {settings.payments.onlineEnabled && (
                  <button type="button" className="button button-dark button-sm" onClick={handlePayNow} disabled={isPaying}>
                    <CreditCard size={14} /> {isPaying ? "Opening…" : `Pay ${formatPrice(order.total)} now`}
                  </button>
                )}
              </div>
            )}

            <div className="confirmation-meta-strip">
              <div className="meta-strip-cell">
                <span className="meta-label">Order Number</span>
                <strong className="meta-value order-id" id="confirmation-order-id">
                  {order.orderId}
                </strong>
              </div>
              <div className="meta-strip-divider" />
              <div className="meta-strip-cell">
                <span className="meta-label">Order Date</span>
                <strong className="meta-value">{placedOn}</strong>
              </div>
              <div className="meta-strip-divider" />
              <div className="meta-strip-cell">
                <span className="meta-label">Estimated Delivery</span>
                <strong className="meta-value estimated-date">
                  <Clock size={14} className="inline-clock" />
                  {order.estimatedDeliveryDate}
                </strong>
              </div>
              <div className="meta-strip-divider" />
              <div className="meta-strip-cell">
                <span className="meta-label">Status</span>
                <strong className="meta-value status-confirmed">
                  <span className="status-dot" /> {order.status}
                </strong>
              </div>
            </div>

            <div className="confirmation-grid">
              <div className="confirmation-card-panel">
                <div className="panel-header">
                  <div className="panel-header-title">
                    <ShoppingBag size={18} />
                    <h3>Your Pieces</h3>
                  </div>
                  <span className="panel-count-pill">
                    {order.items.length} {order.items.length === 1 ? "Piece" : "Pieces"}
                  </span>
                </div>

                <div className="confirmation-items-list">
                  {order.items.map((item, idx) => (
                    <div className="confirmation-item-row" key={`${item.productId}-${idx}`}>
                      <div className="item-image-frame">
                        <img src={item.image} alt={item.name} />
                        <span className="item-quantity-pill">×{item.quantity}</span>
                      </div>
                      <div className="item-details-box">
                        <h4 className="item-title">
                          {item.slug ? <Link to={`/product/${item.slug}`}>{item.name}</Link> : item.name}
                        </h4>
                        <span className="item-metadata">
                          Color: <strong>{item.color}</strong>
                          {item.size ? ` • Size: ${item.size}` : ""}
                        </span>
                        <span className="item-unit-price">{formatPrice(item.price)} each</span>
                      </div>
                      <div className="item-total-col">
                        <strong>{formatPrice(item.price * item.quantity)}</strong>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="confirmation-pricing-breakdown">
                  <div className="price-line-row">
                    <span>Subtotal</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="price-line-row discount">
                      <span>Discount{order.promoCode ? ` (${order.promoCode})` : ""}</span>
                      <span>-{formatPrice(order.discount)}</span>
                    </div>
                  )}
                  <div className="price-line-row">
                    <span>Shipping</span>
                    <span>{order.shippingFee ? formatPrice(order.shippingFee) : "FREE"}</span>
                  </div>
                  {order.deliverySurcharge > 0 && (
                    <div className="price-line-row">
                      <span>Express Delivery</span>
                      <span>{formatPrice(order.deliverySurcharge)}</span>
                    </div>
                  )}
                  <div className="price-line-row">
                    <span>GST</span>
                    <span>{formatPrice(order.tax)}</span>
                  </div>
                  <div className="price-breakdown-divider" />
                  <div className="price-line-row total">
                    <div>
                      <strong className="total-label">Total Amount</strong>
                      <span className="total-sub">
                        {payment.method === "cod"
                          ? isPaid
                            ? "Paid on delivery"
                            : "To be paid on delivery"
                          : isPaid
                            ? "Paid online"
                            : "Online payment pending"}
                      </span>
                    </div>
                    <strong className="total-val" id="confirmation-total-amount">
                      {formatPrice(order.total)}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="confirmation-right-column">
                <div className="confirmation-card-panel">
                  <div className="panel-header">
                    <div className="panel-header-title">
                      <MapPin size={18} />
                      <h3>Shipping Address</h3>
                    </div>
                  </div>
                  <div className="shipping-address-body">
                    <strong className="recipient-name">{customer.fullName}</strong>
                    <p className="address-line">{address.address}</p>
                    <p className="address-line">
                      {address.city}, {address.state} - {address.postalCode}
                    </p>
                    <p className="address-line country-line">{address.country}</p>
                    <div className="address-contact-details">
                      <div>
                        <span>Phone:</span>
                        <strong>{customer.phone}</strong>
                      </div>
                      <div>
                        <span>Email:</span>
                        <strong>{customer.email}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="confirmation-perks-card">
                  <div className="perk-row">
                    <Gift size={20} className="perk-icon" />
                    <div>
                      <strong>Gift-ready packaging</strong>
                      <span>Every piece is packed with care.</span>
                    </div>
                  </div>
                  <div className="perk-row">
                    <Truck size={20} className="perk-icon" />
                    <div>
                      <strong>Order tracking</strong>
                      <span>Follow each step on the tracking page with your order number and email.</span>
                    </div>
                  </div>
                  <div className="perk-row">
                    <ShieldCheck size={20} className="perk-icon" />
                    <div>
                      <strong>{settings.commerce.returnWindowDays}-day returns</strong>
                      <span>See our shipping &amp; returns policy for details.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="confirmation-actions-row">
              <Link to={`/track-order?order=${order.orderId}`} className="button button-dark confirmation-track-btn" id="confirmation-track-order-btn">
                <span>Track Order</span>
                <ArrowRight size={16} />
              </Link>
              <Link to="/shop" className="button button-gold confirmation-continue-btn" id="confirmation-continue-shopping-btn">
                <span>Continue Shopping</span>
                <ShoppingBag size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
