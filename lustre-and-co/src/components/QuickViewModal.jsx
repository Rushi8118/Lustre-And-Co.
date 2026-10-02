import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Heart,
  ShoppingBag,
  Star,
  Minus,
  Plus,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatPrice } from "../data/products";
import { useStore } from "../context/StoreContext";

export default function QuickViewModal({ product, isOpen, onClose }) {
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  // Reset state when product changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveImageIndex(0);
      setQuantity(1);
      setIsLoading(false);
      setIsAdded(false);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, product]);

  // Handle ESC key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!product) return null;

  const wished = isWishlisted(product.id);
  const images = product.gallery && product.gallery.length > 0
    ? product.gallery
    : [product.image];

  const discountPercent =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : null;

  async function handleAddToCart() {
    if (isLoading || isAdded) return;
    setIsLoading(true);

    const added = await addToCart(product, quantity);
    setIsLoading(false);
    setIsAdded(added);

    setTimeout(() => {
      setIsAdded(false);
    }, 2200);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="quickview-overlay" role="dialog" aria-modal="true" aria-label={`Quick view: ${product.name}`}>
          {/* Backdrop */}
          <motion.div
            className="quickview-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            className="quickview-dialog"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
          >
            {/* Close Button */}
            <button
              className="quickview-close-btn"
              onClick={onClose}
              aria-label="Close quick view"
            >
              <X size={20} />
            </button>

            <div className="quickview-grid">
              {/* Image Gallery Column */}
              <div className="quickview-media">
                <div className="quickview-main-image-wrap">
                  <motion.img
                    key={activeImageIndex}
                    src={images[activeImageIndex]}
                    alt={`${product.name} view ${activeImageIndex + 1}`}
                    className="quickview-main-img"
                    initial={{ opacity: 0.5, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  />

                  {/* Badge */}
                  {product.badge && (
                    <span className={`product-badge badge-${product.badge.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}>
                      {product.badge}
                    </span>
                  )}
                </div>

                {/* Thumbnails */}
                {images.length > 1 && (
                  <div className="quickview-thumbnails">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        className={`quickview-thumb ${idx === activeImageIndex ? "is-active" : ""}`}
                        onClick={() => setActiveImageIndex(idx)}
                        aria-label={`View image ${idx + 1}`}
                      >
                        <img src={img} alt="" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Details Column */}
              <div className="quickview-details">
                {/* Meta header */}
                <div className="quickview-meta-bar">
                  <span className="quickview-category-tag">
                    {product.finish || product.category}
                  </span>
                  
                  {/* Star Rating & Review Count */}
                  <div className="quickview-rating" title={`${product.rating} out of 5 stars based on ${product.reviews} reviews`}>
                    <div className="stars-cluster">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={13}
                          className={star <= Math.round(product.rating) ? "star-filled" : "star-empty"}
                          fill={star <= Math.round(product.rating) ? "currentColor" : "none"}
                        />
                      ))}
                    </div>
                    <span className="rating-score">{product.rating}</span>
                    <span className="rating-reviews-count">({product.reviews} reviews)</span>
                  </div>
                </div>

                <h2 className="quickview-title">{product.name}</h2>

                {/* Price Display */}
                <div className="quickview-price-row">
                  <span className="quickview-price-current">{formatPrice(product.price)}</span>
                  {product.oldPrice && (
                    <del className="quickview-price-old">{formatPrice(product.oldPrice)}</del>
                  )}
                  {discountPercent && (
                    <span className="product-discount-pill">
                      {discountPercent}% OFF
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="quickview-description">{product.description}</p>

                {/* Bullet details */}
                {product.details && product.details.length > 0 && (
                  <ul className="quickview-features">
                    {product.details.slice(0, 3).map((detail, idx) => (
                      <li key={idx}>
                        <Sparkles size={13} className="feature-icon" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Quantity & CTA Row */}
                <div className="quickview-actions">
                  <div className="quickview-qty-group">
                    <label htmlFor="quickview-qty" className="sr-only">Quantity</label>
                    <div className="quickview-stepper">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        <Minus size={14} />
                      </button>
                      <span id="quickview-qty" className="stepper-value">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                        disabled={quantity >= 10}
                        aria-label="Increase quantity"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Add to Bag Button with Loading State */}
                  <button
                    className={`button quickview-add-btn ${isAdded ? "is-success" : ""} ${isLoading ? "is-loading" : ""}`}
                    onClick={handleAddToCart}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="button-spinner" aria-hidden="true" />
                        <span>Adding to Bag...</span>
                      </>
                    ) : isAdded ? (
                      <>
                        <Check size={16} />
                        <span>Added to Bag!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag size={16} />
                        <span>Add to Bag</span>
                      </>
                    )}
                  </button>

                  {/* Wishlist Button */}
                  <button
                    className={`quickview-wish-btn ${wished ? "is-wished" : ""}`}
                    onClick={() => toggleWishlist(product)}
                    aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
                    aria-pressed={wished}
                    title={wished ? "Remove from wishlist" : "Add to wishlist"}
                  >
                    <Heart size={18} fill={wished ? "currentColor" : "none"} />
                  </button>
                </div>

                {/* Trust Footer */}
                <div className="quickview-footer">
                  <div className="quickview-trust-badge">
                    <ShieldCheck size={14} />
                    <span>Hallmarked & certified luxury craftsmanship</span>
                  </div>
                  <Link
                    to={`/product/${product.slug}`}
                    className="quickview-view-full"
                    onClick={onClose}
                  >
                    <span>View full product details</span>
                    <ExternalLink size={13} />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
