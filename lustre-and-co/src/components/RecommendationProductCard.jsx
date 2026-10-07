// lustre-and-co/src/components/RecommendationProductCard.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import SmartImage from "./SmartImage";
import { ShoppingBag, Heart, Eye } from "lucide-react";
import { formatPrice } from "../data/products";
import { trackRecommendationEvent } from "../services/recommendations";
import { useStore } from "../context/StoreContext";

export default function RecommendationProductCard({
  product,
  recommendationType,
  sourceProductId,
  position = 0,
}) {
  const { addToCart, toggleWishlist, isWishlisted, showToast } = useStore();
  const [adding, setAdding] = useState(false);

  const wishlisted = isWishlisted?.(product.id);

  const discount =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : 0;

  function handleClick() {
    trackRecommendationEvent({
      sourceProductId,
      recommendedProductId: product.id,
      recommendationType,
      eventType: "click",
      position,
    });
  }

  async function handleAddToCart(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!product.inStock || adding) return;

    trackRecommendationEvent({
      sourceProductId,
      recommendedProductId: product.id,
      recommendationType,
      eventType: "add_to_cart",
      position,
    });

    setAdding(true);
    try {
      await addToCart({ ...product, quantity: 1 });
      showToast?.("Added to bag");
    } catch {
      showToast?.("Could not add to bag", "error");
    } finally {
      setAdding(false);
    }
  }

  function handleWishlist(e) {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist?.(product);
  }

  return (
    <div className="rec-card" id={`rec-card-${product.id}`}>
      <Link
        to={`/product/${product.slug}`}
        className="rec-card-image-link"
        onClick={handleClick}
        aria-label={`View ${product.name}`}
      >
        <div className="rec-card-image-wrap">
          {product.image ? (
            <SmartImage
              src={product.image}
              alt={product.name}
              width={400}
              className="rec-card-image"
              loading="lazy"
            />
          ) : (
            <div className="rec-card-image-placeholder">
              <Eye size={24} />
            </div>
          )}

          {/* Badges */}
          <div className="rec-card-badges">
            {discount > 0 && (
              <span className="rec-card-badge rec-card-badge--sale">-{discount}%</span>
            )}
            {!product.inStock && (
              <span className="rec-card-badge rec-card-badge--sold-out">Sold Out</span>
            )}
          </div>

          {/* Hover actions */}
          <div className="rec-card-actions">
            <button
              type="button"
              className={`rec-card-action-btn ${wishlisted ? "is-wishlisted" : ""}`}
              onClick={handleWishlist}
              aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
              title="Wishlist"
            >
              <Heart size={15} fill={wishlisted ? "currentColor" : "none"} />
            </button>
            <button
              type="button"
              className={`rec-card-action-btn rec-card-add-btn ${adding ? "is-loading" : ""}`}
              onClick={handleAddToCart}
              disabled={!product.inStock || adding}
              aria-label={`Add ${product.name} to bag`}
              title="Add to bag"
            >
              <ShoppingBag size={15} />
            </button>
          </div>
        </div>
      </Link>

      <div className="rec-card-body">
        {product.category && (
          <span className="rec-card-category">{product.category}</span>
        )}
        <Link
          to={`/product/${product.slug}`}
          className="rec-card-name"
          onClick={handleClick}
        >
          {product.name}
        </Link>
        <div className="rec-card-price-row">
          <span className="rec-card-price">{formatPrice(product.price)}</span>
          {product.oldPrice && product.oldPrice > product.price && (
            <span className="rec-card-old-price">{formatPrice(product.oldPrice)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
