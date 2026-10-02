import { useState } from "react";
import { Heart, ShoppingBag, Eye, Star, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { formatPrice } from "../data/products";
import { useStore } from "../context/StoreContext";
import QuickViewModal from "./QuickViewModal";

export default function ProductCard({
  product,
  index = 0,
  featured = false,
  showQuickView = true
}) {
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const wished = isWishlisted(product.id);

  // Determine badge: explicit badge or calculate 'Sale' if oldPrice exists and is higher
  const discountPercent =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : null;

  let badgeText = product.badge;
  if (!badgeText && discountPercent) {
    badgeText = "Sale";
  }

  // Determine badge class modifier
  const badgeType = badgeText
    ? badgeText.toLowerCase().replace(/[^a-z0-9]/g, "-")
    : "";

  // Secondary lifestyle image if present
  const secondaryImage =
    product.gallery && product.gallery.length > 1 ? product.gallery[1] : null;

  async function handleAddClick(e) {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading || isAdded) return;
    setIsLoading(true);

    const added = await addToCart(product, 1);
    setIsLoading(false);
    setIsAdded(added);

    setTimeout(() => {
      setIsAdded(false);
    }, 2000);
  }

  function handleWishlistClick(e) {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  }

  function handleQuickViewClick(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsQuickViewOpen(true);
  }

  return (
    <>
      <motion.article
        className={`product-card ${featured ? "product-card-featured" : ""}`}
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={{ delay: Math.min(index * 0.04, 0.24), duration: 0.45 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Visual Media Wrapper */}
        <div className="product-card-image-wrap">
          <Link
            to={`/product/${product.slug}`}
            className="product-image-link"
            aria-label={`View ${product.name}`}
          >
            {/* Primary Product Image with Zoom on Hover */}
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              className={`product-card-main-img ${
                isHovered && secondaryImage ? "has-secondary" : ""
              }`}
            />

            {/* Secondary Lifestyle Hover Image */}
            {secondaryImage && (
              <img
                src={secondaryImage}
                alt={`${product.name} styled`}
                loading="lazy"
                className={`product-card-secondary-img ${
                  isHovered ? "is-visible" : ""
                }`}
              />
            )}
          </Link>

          {/* Badge: New, Bestseller, Sale */}
          {badgeText && (
            <span
              className={`product-badge badge-${badgeType}`}
              data-badge={badgeText}
            >
              {badgeText}
            </span>
          )}

          {/* Wishlist Heart Button with Interactive Selected State */}
          <motion.button
            className={`wishlist-button ${wished ? "is-wished" : ""}`}
            aria-label={
              wished
                ? `Remove ${product.name} from wishlist`
                : `Add ${product.name} to wishlist`
            }
            aria-pressed={wished}
            onClick={handleWishlistClick}
            whileTap={{ scale: 0.8 }}
            whileHover={{ scale: 1.12 }}
          >
            <Heart
              size={18}
              className={`wishlist-heart-icon ${wished ? "heart-filled" : ""}`}
              fill={wished ? "currentColor" : "none"}
            />
          </motion.button>

          {/* Desktop Hover Action Bar / Overlay */}
          <div className="product-card-action-bar">
            {showQuickView && (
              <button
                type="button"
                className="card-quick-view-btn"
                onClick={handleQuickViewClick}
                aria-label={`Quick view ${product.name}`}
                title="Quick preview"
              >
                <Eye size={15} />
                <span>Quick View</span>
              </button>
            )}

            {/* Add to Bag Button with Loading State */}
            <button
              type="button"
              className={`card-add-to-bag-btn ${isLoading ? "is-loading" : ""} ${
                isAdded ? "is-success" : ""
              }`}
              onClick={handleAddClick}
              disabled={isLoading}
              aria-label={`Add ${product.name} to shopping bag`}
            >
              {isLoading ? (
                <>
                  <span className="button-spinner" aria-hidden="true" />
                  <span>Adding...</span>
                </>
              ) : isAdded ? (
                <>
                  <Check size={15} />
                  <span>Added!</span>
                </>
              ) : (
                <>
                  <ShoppingBag size={15} />
                  <span>Add to Bag</span>
                </>
              )}
            </button>
          </div>

          {/* Mobile Touch-Optimized Quick Action Strip (Always accessible without hover) */}
          <div className="product-card-mobile-actions">
            {showQuickView && (
              <button
                type="button"
                className="mobile-action-btn mobile-quickview-btn"
                onClick={handleQuickViewClick}
                aria-label={`Quick view ${product.name}`}
              >
                <Eye size={16} />
              </button>
            )}

            <button
              type="button"
              className={`mobile-action-btn mobile-add-btn ${
                isLoading ? "is-loading" : ""
              } ${isAdded ? "is-success" : ""}`}
              onClick={handleAddClick}
              disabled={isLoading}
              aria-label={`Add ${product.name} to bag`}
            >
              {isLoading ? (
                <span className="button-spinner button-spinner-sm" />
              ) : isAdded ? (
                <Check size={16} />
              ) : (
                <ShoppingBag size={16} />
              )}
            </button>
          </div>
        </div>

        {/* Card Content Information */}
        <div className="product-card-content">
          {/* Finish & Star Rating with Review Count */}
          <div className="product-card-meta">
            <span className="product-card-finish">
              {product.finish || "Gold-tone"}
            </span>

            <div
              className="product-card-rating"
              title={`${product.rating} stars out of 5 (${product.reviews} reviews)`}
            >
              <div className="stars-mini-cluster" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={11}
                    className={
                      star <= Math.round(product.rating)
                        ? "star-mini-filled"
                        : "star-mini-empty"
                    }
                    fill={
                      star <= Math.round(product.rating) ? "currentColor" : "none"
                    }
                  />
                ))}
              </div>
              {product.reviews > 0 ? (
                <>
                  <span className="rating-mini-value">{product.rating}</span>
                  <span className="rating-mini-count">({product.reviews})</span>
                </>
              ) : (
                <span className="rating-mini-count">No reviews yet</span>
              )}
            </div>
          </div>

          {/* Product Name */}
          <Link
            to={`/product/${product.slug}`}
            className="product-card-title-link"
          >
            <h3 className="product-card-title">{product.name}</h3>
          </Link>

          {/* Price Block: Current price, Strikethrough original price, Discount % */}
          <div className="product-card-pricing-row">
            <div className="product-card-prices">
              <strong className="current-price">
                {formatPrice(product.price)}
              </strong>
              {product.oldPrice && (
                <del className="original-price">
                  {formatPrice(product.oldPrice)}
                </del>
              )}
            </div>

            {discountPercent && (
              <span className="product-discount-pill">
                {discountPercent}% OFF
              </span>
            )}
          </div>
        </div>
      </motion.article>

      {/* Quick View Modal */}
      {showQuickView && (
        <QuickViewModal
          product={product}
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
        />
      )}
    </>
  );
}