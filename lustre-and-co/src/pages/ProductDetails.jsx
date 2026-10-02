import { useEffect, useMemo, useRef, useState } from "react";
import {
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  Truck,
  RotateCcw,
  Star,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ZoomIn,
  Loader2,
  Check,
  ShoppingBag,
  Sparkles,
  MapPin,
  Award
} from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { COLOR_SWATCHES, formatPrice, isInStock, normalizeProduct } from "../data/products";
import { useStore } from "../context/StoreContext";
import { useSettings } from "../context/SettingsContext";
import ProductCard from "../components/ProductCard";
import api, { getErrorMessage } from "../services/api";

function parseDayRange(text, fallback) {
  const numbers = String(text || "").match(/\d+/g);
  if (!numbers) return fallback;
  return [Number(numbers[0]), Number(numbers[1] || numbers[0])];
}

function Accordion({ id, title, open, onToggle, children }) {
  return (
    <div className="pdp-accordion-item" id={id}>
      <button
        type="button"
        className={`pdp-accordion-header ${open ? "is-open" : ""}`}
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="pdp-accordion-title">{title}</span>
        <ChevronDown size={18} className={`pdp-accordion-chevron ${open ? "rotate" : ""}`} />
      </button>
      {open && <div className="pdp-accordion-content">{children}</div>}
    </div>
  );
}

export default function ProductDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart, toggleWishlist, isWishlisted, showToast, user } = useStore();
  const { settings } = useSettings();
  const { commerce } = settings;

  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState("loading");
  const [related, setRelated] = useState([]);
  const [reviewData, setReviewData] = useState({ reviews: [], distribution: [] });

  const [activeImage, setActiveImage] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const galleryRef = useRef(null);

  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const [pinCode, setPinCode] = useState("");
  const [pinStatus, setPinStatus] = useState(null);

  const [openAccordions, setOpenAccordions] = useState({
    details: true,
    material: false,
    shipping: false,
    returns: false,
    reviews: false
  });

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: "", comment: "" });
  const [reviewMessage, setReviewMessage] = useState(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const [selectedBundleIds, setSelectedBundleIds] = useState([]);
  const [isAddingBundle, setIsAddingBundle] = useState(false);

  async function loadReviews(productSlug) {
    try {
      const { data } = await api.get(`/products/${productSlug}/reviews`);
      setReviewData(data);
    } catch {
      setReviewData({ reviews: [], distribution: [] });
    }
  }

  useEffect(() => {
    let active = true;
    setStatus("loading");
    setActiveImage(0);
    setQuantity(1);
    setReviewMessage(null);

    (async () => {
      try {
        const { data } = await api.get(`/products/${slug}`);
        if (!active) return;
        const loaded = normalizeProduct(data);
        setProduct(loaded);
        setSelectedColor(loaded.availableColors?.[0] || "Gold");
        setSelectedSize(loaded.availableSizes?.[0] || "");
        setStatus("ready");

        const [relatedRes] = await Promise.allSettled([api.get(`/products/${slug}/related`), loadReviews(slug)]);
        if (!active) return;
        if (relatedRes.status === "fulfilled") {
          const items = relatedRes.value.data.map(normalizeProduct);
          setRelated(items);
          setSelectedBundleIds(items.slice(0, 3).map((item) => item.slug));
        }
      } catch (err) {
        if (active) setStatus(err.response?.status === 404 ? "not-found" : "error");
      }
    })();

    return () => {
      active = false;
    };
  }, [slug]);

  const deliveryRange = useMemo(() => {
    const [start, end] = parseDayRange(commerce.standardDelivery, [3, 5]);
    const opts = { month: "short", day: "numeric" };
    const from = new Date(Date.now() + start * 86400000).toLocaleDateString("en-US", opts);
    const to = new Date(Date.now() + end * 86400000).toLocaleDateString("en-US", opts);
    return `${from} – ${to}`;
  }, [commerce.standardDelivery]);

  if (status === "loading") {
    return (
      <section className="section">
        <div className="container">
          <p className="catalog-loading">Loading piece…</p>
        </div>
      </section>
    );
  }

  if (status !== "ready" || !product) {
    return (
      <section className="section">
        <div className="container empty-state">
          <span className="empty-icon">✦</span>
          <h1>{status === "not-found" ? "Piece not found" : "This piece could not be loaded"}</h1>
          <p>
            {status === "not-found"
              ? "The product you are looking for is no longer available."
              : "Please check your connection and try again."}
          </p>
          <Link to="/shop" className="button button-dark">
            Return to shop
          </Link>
        </div>
      </section>
    );
  }

  const wished = isWishlisted(product.slug);
  const gallery = product.gallery;
  const inStock = isInStock(product);
  const maxQuantity = Math.max(1, Math.min(10, product.stockQuantity));
  const discountPercent =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : 0;
  const bundleItems = related.slice(0, 3);
  const totalReviews = reviewData.reviews.length;

  function handleMouseMove(e) {
    if (!galleryRef.current) return;
    const rect = galleryRef.current.getBoundingClientRect();
    setZoomPos({
      x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
    });
  }

  async function handleAddToCart() {
    if (isAdding || !inStock) return;
    setIsAdding(true);
    const added = await addToCart({ ...product, selectedColor, selectedSize }, quantity);
    setIsAdding(false);
    if (added) {
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2200);
    }
  }

  async function handleBuyNow() {
    if (!inStock) return;
    const added = await addToCart({ ...product, selectedColor, selectedSize }, quantity);
    if (added) navigate("/checkout");
  }

  function handleCheckDelivery(e) {
    e.preventDefault();
    const trimmed = pinCode.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setPinStatus({ success: false, message: "Please enter a valid 6-digit PIN code." });
      return;
    }
    setPinStatus({
      success: true,
      message: `Standard delivery to ${trimmed} usually takes ${commerce.standardDelivery} after dispatch (${commerce.dispatchTime}).${
        settings.payments.codEnabled ? " Cash on delivery is available at checkout." : ""
      }`
    });
  }

  function toggleAccordion(key) {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleReviewSubmit(e) {
    e.preventDefault();
    if (!reviewForm.comment.trim() || !reviewForm.title.trim()) return;
    setIsSubmittingReview(true);
    setReviewMessage(null);
    try {
      const { data } = await api.post(`/products/${product.slug}/reviews`, reviewForm);
      setReviewMessage({ success: true, text: data.message });
      setReviewForm({ rating: 5, title: "", comment: "" });
      if (data.review?.status === "approved") loadReviews(product.slug);
      setTimeout(() => setShowReviewForm(false), 2500);
    } catch (err) {
      setReviewMessage({ success: false, text: getErrorMessage(err, "Your review could not be submitted.") });
    } finally {
      setIsSubmittingReview(false);
    }
  }

  function toggleBundleItem(itemSlug) {
    setSelectedBundleIds((prev) =>
      prev.includes(itemSlug) ? prev.filter((id) => id !== itemSlug) : [...prev, itemSlug]
    );
  }

  const selectedBundle = bundleItems.filter((item) => selectedBundleIds.includes(item.slug));
  const bundleTotal = product.price + selectedBundle.reduce((sum, item) => sum + item.price, 0);

  async function handleAddBundleToBag() {
    if (isAddingBundle) return;
    setIsAddingBundle(true);
    const mainAdded = await addToCart({ ...product, selectedColor, selectedSize }, 1);
    for (const item of selectedBundle) {
      if (isInStock(item)) await addToCart(item, 1);
    }
    setIsAddingBundle(false);
    if (mainAdded) showToast("The complete look was added to your bag.", "success");
  }

  const shippingLines = product.shipping?.length
    ? product.shipping
    : [
        `Dispatched within ${commerce.dispatchTime}.`,
        `Free standard shipping on orders over ${formatPrice(commerce.freeShippingThreshold)}.`,
        `Standard delivery: ${commerce.standardDelivery}.`,
        `Express delivery (${commerce.expressDelivery}) available at checkout for ${formatPrice(commerce.expressShippingFee)}.`
      ];

  const returnLines = product.returns?.length
    ? product.returns
    : [
        `${commerce.returnWindowDays}-day return window from the date of delivery.`,
        "Items must be unworn, with original tags and packaging intact.",
        "Approved refunds are issued to the original payment method."
      ];

  return (
    <div className="product-details-page">
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
            <li>
              <Link to={`/category/${product.category}`}>{product.category}</Link>
            </li>
            <span className="pdp-breadcrumb-sep">/</span>
            <li className="active" aria-current="page">
              {product.name}
            </li>
          </ol>
        </div>
      </nav>

      <section className="product-details-section">
        <div className="container">
          <div className="product-details-grid">
            <div className="pdp-gallery-column">
              <div
                className="pdp-main-image-container"
                ref={galleryRef}
                onMouseEnter={() => setIsZoomed(true)}
                onMouseLeave={() => setIsZoomed(false)}
                onMouseMove={handleMouseMove}
              >
                {product.badge && (
                  <span className={`pdp-badge badge-${product.badge.toLowerCase()}`}>{product.badge}</span>
                )}

                <div className="pdp-zoom-viewport">
                  <img
                    src={gallery[activeImage]}
                    alt={`${product.name} - View ${activeImage + 1}`}
                    className="pdp-main-image"
                    style={{
                      transform: isZoomed ? "scale(2.2)" : "scale(1)",
                      transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                      transition: isZoomed ? "transform 0.08s ease-out" : "transform 0.35s ease-out"
                    }}
                  />
                </div>

                <div className={`pdp-zoom-indicator ${isZoomed ? "active" : ""}`}>
                  <ZoomIn size={14} />
                  <span>{isZoomed ? "Zoom active" : "Hover image to zoom"}</span>
                </div>

                {gallery.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="pdp-gallery-arrow pdp-gallery-arrow-prev"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImage((curr) => (curr - 1 + gallery.length) % gallery.length);
                      }}
                      aria-label="Previous product image"
                    >
                      <ChevronLeft size={22} />
                    </button>
                    <button
                      type="button"
                      className="pdp-gallery-arrow pdp-gallery-arrow-next"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImage((curr) => (curr + 1) % gallery.length);
                      }}
                      aria-label="Next product image"
                    >
                      <ChevronRight size={22} />
                    </button>
                  </>
                )}

                <span className="pdp-gallery-counter">
                  {activeImage + 1} / {gallery.length}
                </span>
              </div>

              {gallery.length > 1 && (
                <div className="pdp-thumbnails-row">
                  {gallery.map((imgUrl, index) => (
                    <button
                      key={`${imgUrl}-${index}`}
                      type="button"
                      className={`pdp-thumbnail-button ${activeImage === index ? "is-active" : ""}`}
                      onClick={() => setActiveImage(index)}
                      aria-label={`View image ${index + 1}`}
                    >
                      <img src={imgUrl} alt={`${product.name} thumbnail ${index + 1}`} />
                    </button>
                  ))}
                </div>
              )}

              <div className="pdp-trust-pills-row">
                <div className="pdp-trust-pill">
                  <Sparkles size={16} />
                  <span>{product.finish}</span>
                </div>
                <div className="pdp-trust-pill">
                  <ShieldCheck size={16} />
                  <span>{product.material}</span>
                </div>
                <div className="pdp-trust-pill">
                  <Award size={16} />
                  <span>Quality checked before dispatch</span>
                </div>
              </div>
            </div>

            <div className="pdp-info-column">
              <div className="pdp-eyebrow-row">
                <span className="pdp-eyebrow-category">{product.category}</span>
                <span className="pdp-eyebrow-divider">•</span>
                <span className="pdp-eyebrow-finish">{product.finish}</span>
              </div>

              <h1 className="pdp-title">{product.name}</h1>

              <div className="pdp-rating-row">
                {product.reviews > 0 ? (
                  <>
                    <div className="pdp-stars" aria-label={`Rated ${product.rating} out of 5 stars`}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={16}
                          className="pdp-star-icon"
                          fill={star <= Math.round(product.rating) ? "var(--gold)" : "none"}
                        />
                      ))}
                      <span className="pdp-rating-score">{product.rating}</span>
                    </div>
                    <span className="pdp-rating-dot">•</span>
                    <button
                      type="button"
                      className="pdp-review-link"
                      onClick={() => {
                        setOpenAccordions((prev) => ({ ...prev, reviews: true }));
                        document.getElementById("pdp-reviews-section")?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      {product.reviews} {product.reviews === 1 ? "review" : "reviews"}
                    </button>
                  </>
                ) : (
                  <span className="pdp-review-link">No reviews yet</span>
                )}

                <span className="pdp-rating-dot">•</span>

                <span className="pdp-in-stock-badge">
                  {inStock ? (
                    <>
                      <Check size={13} />{" "}
                      {product.stockQuantity <= commerce.lowStockThreshold
                        ? `Only ${product.stockQuantity} left`
                        : "In stock"}
                    </>
                  ) : (
                    "Out of stock"
                  )}
                </span>
              </div>

              <div className="pdp-pricing-box">
                <div className="pdp-price-line">
                  <span className="pdp-current-price">{formatPrice(product.price)}</span>
                  {discountPercent > 0 && (
                    <>
                      <del className="pdp-original-price">{formatPrice(product.oldPrice)}</del>
                      <span className="pdp-discount-tag">{discountPercent}% OFF</span>
                    </>
                  )}
                </div>
                <p className="pdp-tax-note">
                  GST ({commerce.taxPercent}%) added at checkout • Free shipping over{" "}
                  {formatPrice(commerce.freeShippingThreshold)}
                </p>
              </div>

              {product.description && <p className="pdp-short-description">{product.description}</p>}

              <div className="pdp-divider" />

              {product.availableColors?.length > 0 && (
                <div className="pdp-option-group">
                  <div className="pdp-option-header">
                    <span className="pdp-option-label">Color:</span>
                    <span className="pdp-option-selected-val">{selectedColor}</span>
                  </div>
                  <div className="pdp-swatches-row" role="radiogroup" aria-label="Select color">
                    {product.availableColors.map((colorName) => (
                      <button
                        key={colorName}
                        type="button"
                        role="radio"
                        aria-checked={selectedColor === colorName}
                        className={`pdp-swatch-btn ${selectedColor === colorName ? "is-selected" : ""}`}
                        onClick={() => setSelectedColor(colorName)}
                        title={colorName}
                      >
                        <span
                          className="pdp-swatch-circle"
                          style={{ backgroundColor: COLOR_SWATCHES[colorName] || "#D4AF37" }}
                        />
                        <span className="pdp-swatch-text">{colorName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {product.availableSizes?.length > 1 && (
                <div className="pdp-option-group">
                  <div className="pdp-option-header">
                    <span className="pdp-option-label">Size:</span>
                    <span className="pdp-option-selected-val">{selectedSize}</span>
                  </div>
                  <div className="pdp-swatches-row" role="radiogroup" aria-label="Select size">
                    {product.availableSizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        role="radio"
                        aria-checked={selectedSize === size}
                        className={`pdp-swatch-btn ${selectedSize === size ? "is-selected" : ""}`}
                        onClick={() => setSelectedSize(size)}
                      >
                        <span className="pdp-swatch-text">{size}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pdp-actions-container">
                <div className="pdp-qty-and-cart-row">
                  <div className="pdp-quantity-stepper" aria-label="Quantity selector">
                    <button
                      type="button"
                      className="pdp-qty-btn"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="pdp-qty-value">{quantity}</span>
                    <button
                      type="button"
                      className="pdp-qty-btn"
                      onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                      disabled={quantity >= maxQuantity}
                      aria-label="Increase quantity"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <button
                    type="button"
                    className={`button pdp-add-bag-btn ${isAdded ? "is-added" : ""}`}
                    onClick={handleAddToCart}
                    disabled={isAdding || !inStock}
                    id="pdp-add-to-bag-button"
                  >
                    {!inStock ? (
                      <span>Out of Stock</span>
                    ) : isAdding ? (
                      <>
                        <Loader2 size={18} className="pdp-spinner" />
                        <span>Adding to Bag...</span>
                      </>
                    ) : isAdded ? (
                      <>
                        <Check size={18} />
                        <span>Added to Bag!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag size={18} />
                        <span>Add to Bag</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className={`pdp-wishlist-toggle ${wished ? "is-wished" : ""}`}
                    onClick={() => toggleWishlist(product)}
                    aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
                    id="pdp-wishlist-button"
                  >
                    <Heart
                      size={20}
                      fill={wished ? "var(--rose)" : "none"}
                      stroke={wished ? "var(--rose)" : "currentColor"}
                    />
                  </button>
                </div>

                <button
                  type="button"
                  className="button button-gold pdp-buy-now-btn"
                  onClick={handleBuyNow}
                  disabled={!inStock}
                  id="pdp-buy-now-button"
                >
                  Buy Now
                </button>
              </div>

              <div className="pdp-delivery-card">
                <div className="pdp-delivery-header">
                  <Truck size={18} className="pdp-delivery-truck-icon" />
                  <div className="pdp-delivery-title-box">
                    <strong>Estimated Delivery: {deliveryRange}</strong>
                    <span>Dispatched within {commerce.dispatchTime}</span>
                  </div>
                </div>

                <form onSubmit={handleCheckDelivery} className="pdp-pin-checker-form">
                  <div className="pdp-pin-input-wrap">
                    <MapPin size={15} className="pdp-pin-icon" />
                    <input
                      type="text"
                      maxLength={6}
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="Enter Delivery PIN Code"
                      aria-label="Enter PIN code for delivery estimate"
                      id="pdp-pin-input"
                    />
                  </div>
                  <button type="submit" className="pdp-pin-submit-btn" id="pdp-pin-check-btn">
                    Check
                  </button>
                </form>

                {pinStatus && (
                  <div className={`pdp-pin-message ${pinStatus.success ? "is-success" : "is-error"}`}>
                    {pinStatus.message}
                  </div>
                )}
              </div>

              <div className="pdp-accordions-group">
                {product.details?.length > 0 && (
                  <Accordion title="Product Details" open={openAccordions.details} onToggle={() => toggleAccordion("details")}>
                    <ul className="pdp-details-list">
                      {product.details.map((detail, idx) => (
                        <li key={idx}>
                          <span className="pdp-bullet-dot">✦</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </Accordion>
                )}

                <Accordion title="Material and Care" open={openAccordions.material} onToggle={() => toggleAccordion("material")}>
                  <p className="pdp-care-intro">
                    {product.material} with a {product.finish.toLowerCase()} finish.
                  </p>
                  {product.care?.length > 0 ? (
                    <ul className="pdp-care-list">
                      {product.care.map((tip, idx) => (
                        <li key={idx}>
                          <span className="pdp-bullet-dot">✦</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>
                      See our <Link to="/jewelry-care">jewelry care guide</Link> to keep this piece looking its best.
                    </p>
                  )}
                </Accordion>

                <Accordion title="Shipping Information" open={openAccordions.shipping} onToggle={() => toggleAccordion("shipping")}>
                  <ul className="pdp-shipping-list">
                    {shippingLines.map((item, idx) => (
                      <li key={idx}>
                        <Truck size={15} className="pdp-list-icon" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </Accordion>

                <Accordion title="Return Policy" open={openAccordions.returns} onToggle={() => toggleAccordion("returns")}>
                  <ul className="pdp-returns-list">
                    {returnLines.map((item, idx) => (
                      <li key={idx}>
                        <RotateCcw size={15} className="pdp-list-icon" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </Accordion>

                <Accordion
                  id="pdp-reviews-section"
                  title={`Customer Reviews (${totalReviews})`}
                  open={openAccordions.reviews}
                  onToggle={() => toggleAccordion("reviews")}
                >
                  <div className="pdp-reviews-content">
                    {totalReviews > 0 && (
                      <div className="pdp-rating-overview-card">
                        <div className="pdp-score-block">
                          <span className="pdp-big-score">{product.rating}</span>
                          <div className="pdp-stars">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={15}
                                fill={s <= Math.round(product.rating) ? "var(--gold)" : "none"}
                                color="var(--gold)"
                              />
                            ))}
                          </div>
                          <span className="pdp-total-count">
                            Based on {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
                          </span>
                        </div>

                        <div className="pdp-breakdown-bars">
                          {reviewData.distribution.map((bar) => {
                            const pct = totalReviews ? Math.round((bar.count / totalReviews) * 100) : 0;
                            return (
                              <div key={bar.stars} className="pdp-bar-row">
                                <span className="pdp-bar-label">{bar.stars}★</span>
                                <div className="pdp-bar-track">
                                  <div className="pdp-bar-fill" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="pdp-bar-pct">{pct}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="pdp-review-actions-bar">
                      {user ? (
                        <button
                          type="button"
                          className="button button-outline"
                          onClick={() => setShowReviewForm((v) => !v)}
                        >
                          {showReviewForm ? "Cancel Review" : "Write a Review"}
                        </button>
                      ) : (
                        <p className="review-login-note">
                          <Link to="/account/login" state={{ from: location.pathname }}>
                            Sign in
                          </Link>{" "}
                          to write a review.
                        </p>
                      )}
                    </div>

                    {showReviewForm && user && (
                      <form onSubmit={handleReviewSubmit} className="pdp-review-form">
                        <h4>Share your experience</h4>

                        <div className="pdp-form-field">
                          <label>Rating</label>
                          <div className="pdp-star-picker">
                            {[1, 2, 3, 4, 5].map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setReviewForm((f) => ({ ...f, rating: val }))}
                                className="pdp-star-picker-btn"
                                aria-label={`${val} star${val > 1 ? "s" : ""}`}
                              >
                                <Star size={20} fill={val <= reviewForm.rating ? "var(--gold)" : "none"} color="var(--gold)" />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="pdp-form-field">
                          <label>Review Headline *</label>
                          <input
                            type="text"
                            required
                            maxLength={120}
                            value={reviewForm.title}
                            onChange={(e) => setReviewForm((f) => ({ ...f, title: e.target.value }))}
                            placeholder="e.g. Even more radiant in person!"
                          />
                        </div>

                        <div className="pdp-form-field">
                          <label>Your Review *</label>
                          <textarea
                            rows={3}
                            required
                            maxLength={2000}
                            value={reviewForm.comment}
                            onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                            placeholder="Describe the fit, finish, and everyday wear..."
                          />
                        </div>

                        <button type="submit" className="button button-dark" disabled={isSubmittingReview}>
                          {isSubmittingReview ? "Submitting…" : "Submit Review"}
                        </button>

                        {reviewMessage && (
                          <p className={reviewMessage.success ? "pdp-form-success" : "form-error"}>{reviewMessage.text}</p>
                        )}
                      </form>
                    )}

                    <div className="pdp-reviews-list">
                      {totalReviews === 0 && <p className="review-login-note">Be the first to review this piece.</p>}
                      {reviewData.reviews.map((rev) => (
                        <div key={rev._id} className="pdp-review-card">
                          <div className="pdp-rev-header">
                            <div className="pdp-rev-author-group">
                              <strong>{rev.author}</strong>
                              {rev.verifiedPurchase && (
                                <span className="pdp-verified-badge">
                                  <Check size={11} /> Verified Buyer
                                </span>
                              )}
                            </div>
                            <span className="pdp-rev-date">
                              {new Date(rev.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric"
                              })}
                            </span>
                          </div>

                          <div className="pdp-rev-stars">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} size={13} fill={s <= rev.rating ? "var(--gold)" : "none"} color="var(--gold)" />
                            ))}
                          </div>

                          <h5 className="pdp-rev-title">{rev.title}</h5>
                          <p className="pdp-rev-text">{rev.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Accordion>
              </div>
            </div>
          </div>
        </div>
      </section>

      {bundleItems.length > 0 && (
        <section className="section pdp-complete-look-section">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Curated Ensemble</span>
                <h2>Complete the Look</h2>
              </div>
              <p className="section-heading-sub">Pieces that pair beautifully with the {product.name}.</p>
            </div>

            <div className="pdp-bundle-container">
              <div className="pdp-bundle-items-grid">
                <div className="pdp-bundle-card is-anchor">
                  <div className="pdp-bundle-thumb">
                    <img src={gallery[0]} alt={product.name} />
                    <span className="pdp-bundle-tag">This Piece</span>
                  </div>
                  <div className="pdp-bundle-info">
                    <h4 className="pdp-bundle-item-name">{product.name}</h4>
                    <div className="pdp-bundle-item-price">
                      <strong>{formatPrice(product.price)}</strong>
                    </div>
                    <span className="pdp-bundle-checked-indicator">
                      <Check size={14} /> Selected
                    </span>
                  </div>
                </div>

                {bundleItems.map((item) => {
                  const isSelected = selectedBundleIds.includes(item.slug);
                  return (
                    <div
                      key={item.slug}
                      className={`pdp-bundle-card ${isSelected ? "is-selected" : "is-deselected"}`}
                      onClick={() => toggleBundleItem(item.slug)}
                    >
                      <div className="pdp-bundle-thumb">
                        <img src={item.image} alt={item.name} />
                        <button
                          type="button"
                          className={`pdp-bundle-checkbox ${isSelected ? "checked" : ""}`}
                          aria-label={`Toggle ${item.name} in the look`}
                        >
                          {isSelected && <Check size={12} />}
                        </button>
                      </div>
                      <div className="pdp-bundle-info">
                        <h4 className="pdp-bundle-item-name">{item.name}</h4>
                        <div className="pdp-bundle-item-price">
                          <strong>{formatPrice(item.price)}</strong>
                        </div>
                        <span className="pdp-bundle-category-tag">{item.category}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pdp-bundle-summary-card">
                <div className="pdp-bundle-price-row">
                  <div>
                    <span className="pdp-bundle-total-label">Total for {1 + selectedBundle.length} pieces:</span>
                    <div className="pdp-bundle-price-nums">
                      <strong className="pdp-bundle-final-price">{formatPrice(bundleTotal)}</strong>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="button button-gold pdp-bundle-cta-btn"
                  onClick={handleAddBundleToBag}
                  disabled={isAddingBundle || !inStock}
                  id="pdp-add-bundle-button"
                >
                  {isAddingBundle ? (
                    <>
                      <Loader2 size={16} className="pdp-spinner" />
                      <span>Adding to Bag...</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={16} />
                      <span>Add Complete Look to Bag</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="section pdp-recommendations-section">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Recommendations</span>
                <h2>You May Also Like</h2>
              </div>
              <Link to="/shop" className="pdp-see-all-link">
                Explore all jewelry →
              </Link>
            </div>

            <div className="product-grid" id="pdp-you-may-also-like-grid">
              {related.map((relProduct, idx) => (
                <ProductCard key={relProduct.slug} product={relProduct} index={idx} showQuickView={true} />
              ))}
            </div>
          </div>
        </section>
      )}

      <aside className="pdp-sticky-mobile-bar" aria-label="Quick Add to Bag">
        <div className="sticky-bar-inner">
          <div className="sticky-product-info">
            <img src={gallery[0]} alt={product.name} className="sticky-product-thumb" />
            <div className="sticky-product-text">
              <span className="sticky-product-title">{product.name}</span>
              <div className="sticky-price-row">
                <span className="sticky-current-price">{formatPrice(product.price)}</span>
                {discountPercent > 0 && <span className="sticky-original-price">{formatPrice(product.oldPrice)}</span>}
              </div>
            </div>
          </div>

          <div className="sticky-actions">
            <button
              type="button"
              className={`button button-dark sticky-add-btn ${isAdded ? "is-added" : ""}`}
              onClick={handleAddToCart}
              disabled={isAdding || !inStock}
              aria-label={`Add ${product.name} to bag`}
            >
              {!inStock ? (
                <span>Sold Out</span>
              ) : isAdding ? (
                <>
                  <Loader2 size={16} className="pdp-spinner" />
                  <span>Adding...</span>
                </>
              ) : isAdded ? (
                <>
                  <Check size={16} />
                  <span>Added!</span>
                </>
              ) : (
                <>
                  <ShoppingBag size={16} />
                  <span>Add to Bag</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
