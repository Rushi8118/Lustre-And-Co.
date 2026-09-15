import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Trash2,
  Heart,
  ArrowLeft,
  Truck,
  ShieldCheck,
  Tag,
  Sparkles,
  ShoppingBag,
  Plus,
  Minus,
  X,
  Gift
} from "lucide-react";
import { COLOR_SWATCHES, formatPrice } from "../data/products";
import { useStore } from "../context/StoreContext";
import { useSettings } from "../context/SettingsContext";
import ProductCard from "../components/ProductCard";

export default function Cart() {
  const navigate = useNavigate();
  const {
    cart,
    cartCount,
    cartSubtotal,
    appliedPromo,
    discountAmount,
    shipping,
    estimatedTax,
    cartTotal,
    updateQuantity,
    removeFromCart,
    moveToWishlist,
    applyPromoCode,
    removePromoCode,
    products,
    authReady,
    productsStatus
  } = useStore();
  const { settings } = useSettings();
  const { commerce, payments } = settings;

  const [promoInput, setPromoInput] = useState("");
  const [promoMessage, setPromoMessage] = useState(null);
  const [isApplying, setIsApplying] = useState(false);

  const threshold = commerce.freeShippingThreshold;
  const isFreeShippingUnlocked = cartSubtotal >= threshold || appliedPromo?.freeShipping;
  const remainingForFreeShipping = Math.max(0, threshold - cartSubtotal);
  const freeShippingProgress = threshold > 0 ? Math.min(100, Math.round((cartSubtotal / threshold) * 100)) : 100;

  const recommendedProducts = useMemo(() => {
    const inBag = new Set(cart.map((item) => item.product.slug));
    return products
      .filter((product) => !inBag.has(product.slug))
      .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
      .slice(0, 4);
  }, [cart, products]);

  async function handleApplyPromo(e) {
    e.preventDefault();
    if (!promoInput.trim()) return;
    setIsApplying(true);
    const res = await applyPromoCode(promoInput);
    setIsApplying(false);
    setPromoMessage(res);
    if (res.success) setPromoInput("");
  }

  const isLoading = !authReady || productsStatus === "loading";

  return (
    <div className="cart-page">
      <nav className="pdp-breadcrumbs-bar" aria-label="Breadcrumb">
        <div className="container">
          <ol className="pdp-breadcrumbs-list">
            <li>
              <Link to="/">Home</Link>
            </li>
            <span className="pdp-breadcrumb-sep">/</span>
            <li>
              <Link to="/shop">Shop</Link>
            </li>
            <span className="pdp-breadcrumb-sep">/</span>
            <li className="active" aria-current="page">
              Shopping Bag ({cartCount})
            </li>
          </ol>
        </div>
      </nav>

      <section className="section cart-section">
        <div className="container">
          <div className="cart-header-row">
            <div>
              <span className="eyebrow">Your Selections</span>
              <h1 className="cart-page-title">Shopping Bag</h1>
            </div>
            {cart.length > 0 && (
              <span className="cart-header-count">
                {cartCount} {cartCount === 1 ? "item" : "items"}
              </span>
            )}
          </div>

          {isLoading ? (
            <p className="catalog-loading">Loading your bag…</p>
          ) : cart.length === 0 ? (
            <div className="cart-empty-container">
              <div className="cart-empty-icon-wrap">
                <ShoppingBag size={42} strokeWidth={1.2} />
              </div>
              <h2>Your shopping bag is empty</h2>
              <p>Explore our jewelry collection and add the pieces you love.</p>
              <div className="cart-empty-actions">
                <Link to="/shop" className="button button-dark">
                  Explore Catalog
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="free-shipping-card" id="free-shipping-progress-banner">
                <div className="free-shipping-header">
                  <div className="free-shipping-msg-wrap">
                    <Truck size={18} className="free-shipping-truck-icon" />
                    <span className="free-shipping-message">
                      {isFreeShippingUnlocked ? (
                        <>
                          <strong>Congratulations!</strong> You have unlocked{" "}
                          <span className="free-shipping-highlight">free shipping</span>.
                        </>
                      ) : (
                        <>
                          You are <strong>{formatPrice(remainingForFreeShipping)} away from free shipping.</strong>
                        </>
                      )}
                    </span>
                  </div>
                  <span className="free-shipping-pct-tag">{isFreeShippingUnlocked ? 100 : freeShippingProgress}%</span>
                </div>

                <div
                  className="free-shipping-track"
                  role="progressbar"
                  aria-valuenow={freeShippingProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className={`free-shipping-fill ${isFreeShippingUnlocked ? "is-unlocked" : ""}`}
                    style={{ width: `${isFreeShippingUnlocked ? 100 : freeShippingProgress}%` }}
                  />
                </div>
              </div>

              <div className="cart-layout">
                <div className="cart-items-column">
                  <div className="cart-items-table-header">
                    <span>Product &amp; Details</span>
                    <span className="cart-header-align-right">Total Price</span>
                  </div>

                  <div className="cart-items-list">
                    {cart.map((item) => {
                      const prod = item.product;
                      const maxQuantity = Math.max(1, Math.min(10, prod.stockQuantity ?? 10));

                      return (
                        <article className="cart-item-card" key={item.id} id={`cart-item-${item.id}`}>
                          <Link to={`/product/${prod.slug}`} className="cart-item-image-wrap">
                            <img src={prod.image} alt={prod.name} className="cart-item-image" />
                          </Link>

                          <div className="cart-item-content">
                            <div className="cart-item-top-row">
                              <div>
                                <span className="cart-item-category">
                                  {prod.category} • {prod.finish}
                                </span>
                                <h3 className="cart-item-title">
                                  <Link to={`/product/${prod.slug}`}>{prod.name}</Link>
                                </h3>
                              </div>
                              <div className="cart-item-total-price">
                                <strong>{formatPrice(prod.price * item.quantity)}</strong>
                              </div>
                            </div>

                            <div className="cart-item-attributes">
                              <div className="cart-item-badge-pill">
                                <span
                                  className="cart-swatch-dot"
                                  style={{ backgroundColor: COLOR_SWATCHES[item.selectedColor] || "#D4AF37" }}
                                />
                                <span>
                                  Color: <strong>{item.selectedColor}</strong>
                                </span>
                              </div>
                              {item.selectedSize && (
                                <div className="cart-item-badge-pill">
                                  <span>
                                    Size: <strong>{item.selectedSize}</strong>
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="cart-item-unit-price">
                              <span>
                                Unit Price: <strong>{formatPrice(prod.price)}</strong> each
                              </span>
                              {prod.oldPrice > prod.price && (
                                <del className="cart-item-unit-old-price">{formatPrice(prod.oldPrice)}</del>
                              )}
                            </div>

                            <div className="cart-item-controls-row">
                              <div className="cart-quantity-stepper" aria-label="Adjust quantity">
                                <button
                                  type="button"
                                  className="cart-qty-btn"
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  aria-label="Decrease quantity"
                                  disabled={item.quantity <= 1}
                                >
                                  <Minus size={13} />
                                </button>
                                <span className="cart-qty-value">{item.quantity}</span>
                                <button
                                  type="button"
                                  className="cart-qty-btn"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  aria-label="Increase quantity"
                                  disabled={item.quantity >= maxQuantity}
                                >
                                  <Plus size={13} />
                                </button>
                              </div>

                              <button
                                type="button"
                                className="cart-action-btn cart-wishlist-btn"
                                onClick={() => moveToWishlist(item)}
                                aria-label={`Move ${prod.name} to wishlist`}
                              >
                                <Heart size={15} />
                                <span>Move to Wishlist</span>
                              </button>

                              <button
                                type="button"
                                className="cart-action-btn cart-remove-btn"
                                onClick={() => removeFromCart(item.id)}
                                aria-label={`Remove ${prod.name} from bag`}
                              >
                                <Trash2 size={15} />
                                <span>Remove</span>
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <div className="cart-bottom-nav">
                    <Link to="/shop" className="back-shopping-link">
                      <ArrowLeft size={16} />
                      <span>Continue Shopping</span>
                    </Link>
                  </div>
                </div>

                <aside className="order-summary-sidebar">
                  <div className="order-summary-card">
                    <div className="order-summary-header">
                      <span className="eyebrow">Order Breakdown</span>
                      <h2 className="order-summary-title">Order Summary</h2>
                    </div>

                    <div className="summary-breakdown-list">
                      <div className="summary-row">
                        <span className="summary-label">Subtotal ({cartCount} items)</span>
                        <strong className="summary-value" id="cart-summary-subtotal">
                          {formatPrice(cartSubtotal)}
                        </strong>
                      </div>

                      {appliedPromo && (
                        <div className="summary-row summary-discount-row">
                          <div className="summary-discount-label">
                            <Tag size={14} />
                            <span>
                              Promo ({appliedPromo.code}
                              {appliedPromo.freeShipping ? " · free shipping" : ""})
                            </span>
                            <button
                              type="button"
                              className="remove-promo-btn"
                              onClick={removePromoCode}
                              title="Remove coupon"
                              aria-label="Remove promo code"
                            >
                              <X size={12} />
                            </button>
                          </div>
                          <span className="summary-discount-amount" id="cart-summary-discount">
                            -{formatPrice(discountAmount)}
                          </span>
                        </div>
                      )}

                      <div className="summary-row">
                        <span className="summary-label">Shipping</span>
                        <span className="summary-value" id="cart-summary-shipping">
                          {shipping === 0 ? <span className="free-shipping-tag">FREE</span> : formatPrice(shipping)}
                        </span>
                      </div>

                      <div className="summary-row">
                        <span className="summary-label">GST ({commerce.taxPercent}%)</span>
                        <span className="summary-value" id="cart-summary-tax">
                          {formatPrice(estimatedTax)}
                        </span>
                      </div>
                    </div>

                    <div className="promo-code-container">
                      <form onSubmit={handleApplyPromo} className="promo-code-form">
                        <div className="promo-input-wrap">
                          <Tag size={15} className="promo-input-icon" />
                          <input
                            type="text"
                            value={promoInput}
                            onChange={(e) => setPromoInput(e.target.value)}
                            placeholder="Promo code"
                            aria-label="Enter promotional discount code"
                            id="promo-code-input"
                          />
                        </div>
                        <button type="submit" className="promo-apply-button" id="apply-promo-button" disabled={isApplying}>
                          {isApplying ? "…" : "Apply"}
                        </button>
                      </form>

                      {promoMessage && (
                        <div className={`promo-feedback ${promoMessage.success ? "is-success" : "is-error"}`}>
                          {promoMessage.message}
                        </div>
                      )}
                    </div>

                    <div className="summary-divider" />

                    <div className="summary-final-total-row">
                      <div>
                        <span className="final-total-label">Total</span>
                        <span className="final-total-sub">Express delivery options at checkout</span>
                      </div>
                      <strong className="final-total-amount" id="cart-summary-total">
                        {formatPrice(cartTotal)}
                      </strong>
                    </div>

                    <button
                      type="button"
                      className="button button-gold summary-checkout-cta"
                      onClick={() => navigate("/checkout")}
                      id="proceed-to-checkout-button"
                    >
                      Proceed to Checkout
                    </button>

                    <div className="secure-checkout-card">
                      <div className="secure-checkout-header">
                        <ShieldCheck size={18} className="secure-shield-icon" />
                        <div>
                          <strong>Secure Checkout</strong>
                          <span>Prices are confirmed on our server when you order</span>
                        </div>
                      </div>

                      <div className="payment-badges-row">
                        {payments.onlineEnabled && <span className="payment-badge">UPI / Cards</span>}
                        {payments.codEnabled && <span className="payment-badge">Cash on Delivery</span>}
                      </div>
                    </div>

                    <div className="cart-perks-box">
                      <div className="cart-perk-item">
                        <Gift size={15} />
                        <span>Gift-ready packaging</span>
                      </div>
                      <div className="cart-perk-item">
                        <Sparkles size={15} />
                        <span>{commerce.returnWindowDays}-day returns</span>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            </>
          )}
        </div>
      </section>

      {recommendedProducts.length > 0 && (
        <section className="section cart-recommended-section">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Curated Complements</span>
                <h2>You May Also Love</h2>
              </div>
              <Link to="/shop" className="pdp-see-all-link">
                Explore all jewelry →
              </Link>
            </div>

            <div className="product-grid" id="cart-recommended-grid">
              {recommendedProducts.map((recProduct, idx) => (
                <ProductCard key={recProduct.slug} product={recProduct} index={idx} showQuickView={true} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
