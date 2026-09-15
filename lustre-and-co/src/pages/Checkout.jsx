import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Lock,
  Check,
  ChevronRight,
  ChevronDown,
  Wallet,
  Banknote,
  ArrowLeft,
  AlertCircle,
  ShoppingBag,
  Loader2
} from "lucide-react";
import { formatPrice } from "../data/products";
import { useStore } from "../context/StoreContext";
import { useSettings } from "../context/SettingsContext";
import api, { getErrorMessage } from "../services/api";
import { payOrderOnline } from "../services/payments";

const COUNTRIES = ["India", "United States", "United Kingdom", "Canada", "Australia", "United Arab Emirates", "Singapore"];

function Field({ id, label, error, children, full = false }) {
  return (
    <div className={`checkout-field-wrap ${full ? "full-width" : ""}`}>
      <label htmlFor={id}>
        {label} <span className="required-star">*</span>
      </label>
      {children}
      {error && (
        <span className="field-error-msg" role="alert">
          <AlertCircle size={13} /> {error}
        </span>
      )}
    </div>
  );
}

export default function Checkout() {
  const navigate = useNavigate();
  const {
    cart,
    cartSubtotal,
    appliedPromo,
    discountAmount,
    shipping,
    estimatedTax,
    cartTotal,
    placeOrder,
    user,
    authReady,
    productsStatus,
    showToast
  } = useStore();
  const { settings } = useSettings();
  const { commerce, payments, store } = settings;

  const paymentOptions = [payments.onlineEnabled && "razorpay", payments.codEnabled && "cod"].filter(Boolean);

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);

  const [shippingData, setShippingData] = useState({
    fullName: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    country: "India",
    city: "",
    state: "",
    postalCode: "",
    address: "",
    saveAddress: true
  });
  const [paymentMethod, setPaymentMethod] = useState(paymentOptions[0] || "");
  const [deliveryOption, setDeliveryOption] = useState("standard");
  const [notes, setNotes] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState({});

  // Prefill from the signed-in customer's profile and default address.
  useEffect(() => {
    if (!user) return;
    let active = true;
    api
      .get("/users/profile")
      .then(({ data }) => {
        if (!active) return;
        setSavedAddresses(data.addresses || []);
        const preferred = (data.addresses || []).find((a) => a.isDefault) || data.addresses?.[0];
        setShippingData((prev) => ({
          ...prev,
          fullName: prev.fullName || data.name || "",
          email: prev.email || data.email || "",
          phone: prev.phone || preferred?.phone || data.phone || "",
          ...(preferred && !prev.address
            ? {
                address: preferred.address,
                city: preferred.city,
                state: preferred.state,
                postalCode: preferred.postalCode,
                country: preferred.country || "India"
              }
            : {})
        }));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user]);

  const deliverySurcharge = deliveryOption === "express" ? commerce.expressShippingFee : 0;
  const grandTotal = cartTotal + deliverySurcharge;

  function handleShippingChange(e) {
    const { name, value, type, checked } = e.target;
    setShippingData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  function applySavedAddress(addr) {
    setShippingData((prev) => ({
      ...prev,
      fullName: addr.fullName || prev.fullName,
      phone: addr.phone || prev.phone,
      address: addr.address,
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country || "India"
    }));
    setErrors({});
  }

  function validateShipping() {
    const next = {};
    const d = shippingData;
    if (!d.fullName.trim()) next.fullName = "Full name is required";
    if (!d.email.trim()) next.email = "Email address is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) next.email = "Please enter a valid email address";
    if (!d.phone.trim()) next.phone = "Phone number is required";
    else if (d.phone.replace(/\D/g, "").length < 10) next.phone = "Enter a valid 10-digit phone number";
    if (!d.country.trim()) next.country = "Country is required";
    if (!d.city.trim()) next.city = "City is required";
    if (!d.state.trim()) next.state = "State is required";
    if (!d.postalCode.trim()) next.postalCode = "Postal code is required";
    else if (d.postalCode.trim().length < 5) next.postalCode = "Enter a valid postal code";
    if (!d.address.trim()) next.address = "Complete address is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function validatePayment() {
    if (!paymentMethod) {
      setErrors({ payment: "No payment method is available right now. Please contact support." });
      return false;
    }
    setErrors({});
    return true;
  }

  function goTo(nextStep) {
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handlePlaceOrder(e) {
    e.preventDefault();
    if (!agreedToTerms) {
      setErrors({ terms: "You must accept the Terms and Privacy Policy to place your order" });
      return;
    }
    if (!validateShipping() || !validatePayment()) {
      setStep(!validateShipping() ? 1 : 2);
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    const d = shippingData;
    const shippingAddress = {
      address: d.address.trim(),
      city: d.city.trim(),
      state: d.state.trim(),
      postalCode: d.postalCode.trim(),
      country: d.country
    };

    try {
      if (user && d.saveAddress) {
        const alreadySaved = savedAddresses.some(
          (a) => a.address === shippingAddress.address && a.postalCode === shippingAddress.postalCode
        );
        if (!alreadySaved) {
          await api
            .post("/users/addresses", { fullName: d.fullName.trim(), phone: d.phone.trim(), ...shippingAddress })
            .catch(() => {});
        }
      }

      const order = await placeOrder({
        customer: { fullName: d.fullName.trim(), email: d.email.trim(), phone: d.phone.trim() },
        shippingAddress,
        deliveryOption,
        paymentMethod,
        notes
      });

      if (paymentMethod === "razorpay") {
        try {
          const result = await payOrderOnline(order, store.name);
          showToast(
            result === "paid"
              ? "Payment received. Thank you!"
              : "Payment not completed. Your order is saved — you can pay from the confirmation page.",
            result === "paid" ? "success" : "error"
          );
        } catch (err) {
          showToast(getErrorMessage(err, "Payment could not be completed. You can retry from the confirmation page."), "error");
        }
      } else {
        showToast("Your order has been placed!", "success");
      }

      navigate(`/order-confirmation/${order.orderId}`);
    } catch (err) {
      setSubmitError(getErrorMessage(err, "We could not place your order. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  }

  const summaryLines = (
    <>
      <div className="summary-line">
        <span>Subtotal</span>
        <strong>{formatPrice(cartSubtotal)}</strong>
      </div>
      {appliedPromo && discountAmount > 0 && (
        <div className="summary-line discount">
          <span>Promo ({appliedPromo.code})</span>
          <span>-{formatPrice(discountAmount)}</span>
        </div>
      )}
      <div className="summary-line">
        <span>Shipping</span>
        <strong>{shipping === 0 ? "FREE" : formatPrice(shipping)}</strong>
      </div>
      {deliverySurcharge > 0 && (
        <div className="summary-line">
          <span>Express Delivery</span>
          <strong>{formatPrice(deliverySurcharge)}</strong>
        </div>
      )}
      <div className="summary-line">
        <span>GST ({commerce.taxPercent}%)</span>
        <strong>{formatPrice(estimatedTax)}</strong>
      </div>
    </>
  );

  if (!authReady || productsStatus === "loading") {
    return (
      <section className="section">
        <div className="container">
          <p className="catalog-loading">Preparing checkout…</p>
        </div>
      </section>
    );
  }

  return (
    <div className="checkout-page">
      <nav className="pdp-breadcrumbs-bar" aria-label="Breadcrumb">
        <div className="container">
          <ol className="pdp-breadcrumbs-list">
            <li>
              <Link to="/">Home</Link>
            </li>
            <span className="pdp-breadcrumb-sep">/</span>
            <li>
              <Link to="/cart">Cart</Link>
            </li>
            <span className="pdp-breadcrumb-sep">/</span>
            <li className="active" aria-current="page">
              Secure Checkout
            </li>
          </ol>
        </div>
      </nav>

      <section className="section checkout-section">
        <div className="container">
          {cart.length === 0 ? (
            <div className="cart-empty-container">
              <div className="cart-empty-icon-wrap">
                <ShoppingBag size={42} strokeWidth={1.2} />
              </div>
              <h2>Your bag is currently empty</h2>
              <p>Add pieces to your bag before checking out.</p>
              <div className="cart-empty-actions">
                <Link to="/shop" className="button button-dark">
                  Explore Shop
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="checkout-mobile-summary-bar">
                <button
                  type="button"
                  className="checkout-mobile-summary-toggle"
                  onClick={() => setMobileSummaryOpen(!mobileSummaryOpen)}
                  aria-expanded={mobileSummaryOpen}
                >
                  <div className="checkout-mobile-toggle-left">
                    <ShoppingBag size={18} />
                    <span>{mobileSummaryOpen ? "Hide order summary" : "Show order summary"}</span>
                    <ChevronDown size={16} className={`checkout-chevron-icon ${mobileSummaryOpen ? "rotate" : ""}`} />
                  </div>
                  <strong className="checkout-mobile-total-price">{formatPrice(grandTotal)}</strong>
                </button>

                {mobileSummaryOpen && (
                  <div className="checkout-mobile-summary-drawer">
                    <div className="checkout-summary-items-list">
                      {cart.map((item) => (
                        <div key={item.id} className="checkout-mini-item">
                          <img src={item.product.image} alt={item.product.name} />
                          <div className="checkout-mini-item-info">
                            <h5>{item.product.name}</h5>
                            <span>
                              {item.selectedColor} • Qty: {item.quantity}
                            </span>
                          </div>
                          <strong>{formatPrice(item.product.price * item.quantity)}</strong>
                        </div>
                      ))}
                    </div>
                    <div className="checkout-mini-totals summary-breakdown">
                      {summaryLines}
                      <div className="checkout-mini-row total">
                        <strong>Total</strong>
                        <strong>{formatPrice(grandTotal)}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="checkout-grid-layout">
                <div className="checkout-main-column">
                  <div className="checkout-step-progress" aria-label="Checkout Progress">
                    <button
                      type="button"
                      className={`checkout-step-tab ${step === 1 ? "is-active" : ""} ${step > 1 ? "is-completed" : ""}`}
                      onClick={() => goTo(1)}
                    >
                      <span className="step-number">{step > 1 ? <Check size={14} /> : "1"}</span>
                      <span className="step-title">Shipping Information</span>
                    </button>
                    <span className="step-arrow-divider">
                      <ChevronRight size={16} />
                    </span>
                    <button
                      type="button"
                      className={`checkout-step-tab ${step === 2 ? "is-active" : ""} ${step > 2 ? "is-completed" : ""}`}
                      onClick={() => validateShipping() && goTo(2)}
                      disabled={step < 2}
                    >
                      <span className="step-number">{step > 2 ? <Check size={14} /> : "2"}</span>
                      <span className="step-title">Payment Method</span>
                    </button>
                    <span className="step-arrow-divider">
                      <ChevronRight size={16} />
                    </span>
                    <button
                      type="button"
                      className={`checkout-step-tab ${step === 3 ? "is-active" : ""}`}
                      onClick={() => validateShipping() && validatePayment() && goTo(3)}
                      disabled={step < 3}
                    >
                      <span className="step-number">3</span>
                      <span className="step-title">Order Review</span>
                    </button>
                  </div>

                  {step === 1 && (
                    <div className="checkout-step-content" id="step-shipping-section">
                      <div className="checkout-step-heading">
                        <h2>1. Shipping Information</h2>
                        <p className="checkout-step-sub">Where should we deliver your pieces?</p>
                      </div>

                      {!user && (
                        <div className="checkout-guest-banner">
                          <div className="checkout-guest-info">
                            <strong>Checking out as a guest</strong>
                            <span>
                              You can track this order with your email.{" "}
                              <Link to="/account/login" state={{ from: "/checkout" }}>
                                Sign in
                              </Link>{" "}
                              to save it to your account.
                            </span>
                          </div>
                        </div>
                      )}

                      {savedAddresses.length > 0 && (
                        <div className="checkout-saved-addresses">
                          <span className="checkout-saved-label">Use a saved address:</span>
                          {savedAddresses.map((addr) => (
                            <button
                              key={addr._id}
                              type="button"
                              className="button button-outline-dark button-sm"
                              onClick={() => applySavedAddress(addr)}
                            >
                              {addr.address}, {addr.city}
                            </button>
                          ))}
                        </div>
                      )}

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (validateShipping()) goTo(2);
                        }}
                        noValidate
                        className="checkout-form-body"
                      >
                        <div className="checkout-form-grid">
                          <Field id="fullName" label="Full Name" error={errors.fullName}>
                            <input id="fullName" name="fullName" value={shippingData.fullName} onChange={handleShippingChange} className={errors.fullName ? "has-error" : ""} autoComplete="name" />
                          </Field>
                          <Field id="email" label="Email Address" error={errors.email}>
                            <input id="email" type="email" name="email" value={shippingData.email} onChange={handleShippingChange} className={errors.email ? "has-error" : ""} autoComplete="email" />
                          </Field>
                          <Field id="phone" label="Phone Number" error={errors.phone}>
                            <input id="phone" type="tel" name="phone" value={shippingData.phone} onChange={handleShippingChange} className={errors.phone ? "has-error" : ""} autoComplete="tel" />
                          </Field>
                          <Field id="country" label="Country" error={errors.country}>
                            <select id="country" name="country" value={shippingData.country} onChange={handleShippingChange}>
                              {COUNTRIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field id="address" label="Complete Address (Flat, House no., Street, Area)" error={errors.address} full>
                            <textarea id="address" name="address" rows={2} value={shippingData.address} onChange={handleShippingChange} className={errors.address ? "has-error" : ""} autoComplete="street-address" />
                          </Field>
                          <Field id="city" label="City" error={errors.city}>
                            <input id="city" name="city" value={shippingData.city} onChange={handleShippingChange} className={errors.city ? "has-error" : ""} autoComplete="address-level2" />
                          </Field>
                          <Field id="state" label="State" error={errors.state}>
                            <input id="state" name="state" value={shippingData.state} onChange={handleShippingChange} className={errors.state ? "has-error" : ""} autoComplete="address-level1" />
                          </Field>
                          <Field id="postalCode" label="Postal Code" error={errors.postalCode}>
                            <input id="postalCode" name="postalCode" value={shippingData.postalCode} onChange={handleShippingChange} className={errors.postalCode ? "has-error" : ""} autoComplete="postal-code" />
                          </Field>
                        </div>

                        {user && (
                          <div className="checkout-checkbox-row">
                            <label className="checkout-checkbox-label">
                              <input type="checkbox" name="saveAddress" checked={shippingData.saveAddress} onChange={handleShippingChange} />
                              <span>Save this address to my account</span>
                            </label>
                          </div>
                        )}

                        <div className="checkout-step-footer">
                          <Link to="/cart" className="checkout-back-link">
                            <ArrowLeft size={16} /> Return to Cart
                          </Link>
                          <button type="submit" className="button button-dark checkout-continue-btn" id="continue-to-payment-btn">
                            <span>Continue to Payment</span>
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="checkout-step-content" id="step-payment-section">
                      <div className="checkout-step-heading">
                        <h2>2. Payment Method</h2>
                        <p className="checkout-step-sub">Choose how you would like to pay.</p>
                      </div>

                      <div className="checkout-summary-pill">
                        <div className="pill-content">
                          <span className="pill-label">Ship to:</span>
                          <span className="pill-val">
                            {shippingData.fullName}, {shippingData.address}, {shippingData.city}, {shippingData.postalCode}
                          </span>
                        </div>
                        <button type="button" className="pill-edit-btn" onClick={() => goTo(1)}>
                          Change
                        </button>
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (validatePayment()) goTo(3);
                        }}
                        className="checkout-form-body"
                      >
                        {paymentOptions.length === 0 ? (
                          <p className="inline-alert inline-alert-error">
                            No payment methods are currently available. Please contact {store.supportEmail}.
                          </p>
                        ) : (
                          <div className="payment-options-grid">
                            {payments.onlineEnabled && (
                              <label className={`payment-method-card ${paymentMethod === "razorpay" ? "is-selected" : ""}`}>
                                <div className="payment-method-top">
                                  <input type="radio" name="method" value="razorpay" checked={paymentMethod === "razorpay"} onChange={() => setPaymentMethod("razorpay")} />
                                  <div className="payment-method-info">
                                    <span className="payment-method-name">Pay Online</span>
                                    <span className="payment-method-desc">UPI, cards, net banking, and wallets via Razorpay</span>
                                  </div>
                                  <Wallet size={20} className="payment-method-icon" />
                                </div>
                                {paymentMethod === "razorpay" && (
                                  <p className="cod-notice">A secure Razorpay window opens after you place the order. We never see your card details.</p>
                                )}
                              </label>
                            )}

                            {payments.codEnabled && (
                              <label className={`payment-method-card ${paymentMethod === "cod" ? "is-selected" : ""}`}>
                                <div className="payment-method-top">
                                  <input type="radio" name="method" value="cod" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} />
                                  <div className="payment-method-info">
                                    <span className="payment-method-name">Cash on Delivery</span>
                                    <span className="payment-method-desc">Pay when your parcel arrives</span>
                                  </div>
                                  <Banknote size={20} className="payment-method-icon" />
                                </div>
                              </label>
                            )}
                          </div>
                        )}

                        {errors.payment && (
                          <span className="field-error-msg" role="alert">
                            <AlertCircle size={13} /> {errors.payment}
                          </span>
                        )}

                        <div className="checkout-step-footer">
                          <button type="button" className="checkout-back-link" onClick={() => goTo(1)}>
                            <ArrowLeft size={16} /> Back to Shipping
                          </button>
                          <button type="submit" className="button button-dark checkout-continue-btn" disabled={paymentOptions.length === 0}>
                            <span>Continue to Order Review</span>
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="checkout-step-content" id="step-review-section">
                      <div className="checkout-step-heading">
                        <h2>3. Order Review</h2>
                        <p className="checkout-step-sub">Please review your order before placing it.</p>
                      </div>

                      <div className="checkout-recaps-grid">
                        <div className="checkout-recap-box">
                          <div className="recap-header">
                            <span className="recap-title">Shipping Address</span>
                            <button type="button" className="recap-edit-btn" onClick={() => goTo(1)}>
                              Edit
                            </button>
                          </div>
                          <div className="recap-body">
                            <strong>{shippingData.fullName}</strong>
                            <p>{shippingData.address}</p>
                            <p>
                              {shippingData.city}, {shippingData.state} - {shippingData.postalCode}
                            </p>
                            <p>{shippingData.country}</p>
                            <span className="recap-sub">
                              Phone: {shippingData.phone} • Email: {shippingData.email}
                            </span>
                          </div>
                        </div>

                        <div className="checkout-recap-box">
                          <div className="recap-header">
                            <span className="recap-title">Payment Method</span>
                            <button type="button" className="recap-edit-btn" onClick={() => goTo(2)}>
                              Edit
                            </button>
                          </div>
                          <div className="recap-body">
                            {paymentMethod === "cod" ? (
                              <>
                                <strong>Cash on Delivery</strong>
                                <p>Pay when your parcel arrives</p>
                              </>
                            ) : (
                              <>
                                <strong>Pay Online</strong>
                                <p>Razorpay secure checkout</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="checkout-delivery-speed-box">
                        <h4>Select Delivery Speed</h4>
                        <div className="delivery-speed-options">
                          <label className={`delivery-speed-label ${deliveryOption === "standard" ? "active" : ""}`}>
                            <input type="radio" name="deliveryOption" value="standard" checked={deliveryOption === "standard"} onChange={() => setDeliveryOption("standard")} />
                            <div>
                              <strong>Standard Delivery ({commerce.standardDelivery})</strong>
                              <span>Tracked shipping</span>
                            </div>
                            <span className="speed-price">{shipping === 0 ? "FREE" : formatPrice(shipping)}</span>
                          </label>
                          <label className={`delivery-speed-label ${deliveryOption === "express" ? "active" : ""}`}>
                            <input type="radio" name="deliveryOption" value="express" checked={deliveryOption === "express"} onChange={() => setDeliveryOption("express")} />
                            <div>
                              <strong>Express Delivery ({commerce.expressDelivery})</strong>
                              <span>Priority dispatch</span>
                            </div>
                            <span className="speed-price">+{formatPrice(commerce.expressShippingFee)}</span>
                          </label>
                        </div>
                      </div>

                      <div className="checkout-review-items-table">
                        <h4>Items in Your Order ({cart.length})</h4>
                        <div className="review-items-list">
                          {cart.map((item) => (
                            <div key={item.id} className="review-item-row">
                              <img src={item.product.image} alt={item.product.name} />
                              <div className="review-item-details">
                                <h5>{item.product.name}</h5>
                                <span>
                                  {item.selectedColor}
                                  {item.selectedSize ? ` • ${item.selectedSize}` : ""} • Qty: {item.quantity}
                                </span>
                              </div>
                              <div className="review-item-price">
                                <strong>{formatPrice(item.product.price * item.quantity)}</strong>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <form onSubmit={handlePlaceOrder} className="checkout-place-order-form">
                        <div className="checkout-field-wrap full-width">
                          <label htmlFor="orderNotes">Order notes (optional)</label>
                          <textarea id="orderNotes" rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Gift message or delivery instructions" />
                        </div>

                        <div className="checkout-terms-card">
                          <label className="checkout-terms-label">
                            <input
                              type="checkbox"
                              checked={agreedToTerms}
                              onChange={(e) => {
                                setAgreedToTerms(e.target.checked);
                                setErrors((prev) => ({ ...prev, terms: undefined }));
                              }}
                              id="terms-privacy-checkbox"
                            />
                            <span>
                              I agree to the{" "}
                              <Link to="/terms" target="_blank">
                                Terms of Service
                              </Link>{" "}
                              and{" "}
                              <Link to="/privacy" target="_blank">
                                Privacy Policy
                              </Link>
                              . <span className="required-star">*</span>
                            </span>
                          </label>
                          {errors.terms && (
                            <span className="field-error-msg" role="alert">
                              <AlertCircle size={13} /> {errors.terms}
                            </span>
                          )}
                        </div>

                        {submitError && <p className="inline-alert inline-alert-error">{submitError}</p>}

                        <div className="checkout-final-action-row">
                          <button type="button" className="checkout-back-link" onClick={() => goTo(2)}>
                            <ArrowLeft size={16} /> Back to Payment
                          </button>
                          <button type="submit" className="button button-gold checkout-place-order-btn" disabled={isSubmitting} id="place-order-button">
                            {isSubmitting ? (
                              <>
                                <Loader2 size={18} className="checkout-spinner" />
                                <span>Placing Your Order...</span>
                              </>
                            ) : (
                              <>
                                <Lock size={16} />
                                <span>Place Order • {formatPrice(grandTotal)}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>

                <aside className="checkout-sidebar-column">
                  <div className="checkout-order-summary-card">
                    <div className="summary-header">
                      <h3>Order Summary</h3>
                      <span className="summary-count-badge">
                        {cart.length} {cart.length === 1 ? "Piece" : "Pieces"}
                      </span>
                    </div>

                    <div className="checkout-sidebar-items">
                      {cart.map((item) => (
                        <div key={item.id} className="checkout-sidebar-item">
                          <div className="item-thumb-wrap">
                            <img src={item.product.image} alt={item.product.name} />
                            <span className="item-qty-badge">{item.quantity}</span>
                          </div>
                          <div className="item-info">
                            <h4 className="item-name">{item.product.name}</h4>
                            <span className="item-variant">{item.selectedColor}</span>
                          </div>
                          <strong className="item-price">{formatPrice(item.product.price * item.quantity)}</strong>
                        </div>
                      ))}
                    </div>

                    <div className="summary-breakdown">
                      {summaryLines}
                      <div className="summary-divider" />
                      <div className="summary-total-line">
                        <span>Total Due</span>
                        <strong className="summary-grand-total" id="checkout-sidebar-grand-total">
                          {formatPrice(grandTotal)}
                        </strong>
                      </div>
                    </div>

                    <div className="checkout-sidebar-security">
                      <ShieldCheck size={15} />
                      <span>Final prices are confirmed by our server</span>
                    </div>
                  </div>
                </aside>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
