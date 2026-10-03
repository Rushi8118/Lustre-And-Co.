import { useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, Check, Sparkles, Layers, ArrowRight } from "lucide-react";
import { formatPrice } from "../data/products";
import { addBundleToCart } from "../services/bundles";
import { useStore } from "../context/StoreContext";

export default function BundleCard({ bundle, cartId: propCartId, onAdded }) {
  const { cartId: storeCartId, showToast } = useStore();
  const cartId = propCartId || storeCartId || "current";

  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [message, setMessage] = useState("");

  const products = bundle.items || [];

  // Compute estimate pricing
  const originalTotal = products.reduce((sum, item) => {
    const itemPrice = Number(item.product?.price || 0);
    return sum + itemPrice * (item.quantity || 1);
  }, 0);

  let discountEstimate = 0;
  if (bundle.discountType === "percentage") {
    discountEstimate = originalTotal * (Number(bundle.discountValue || 0) / 100);
  } else if (bundle.discountType === "fixed") {
    discountEstimate = Number(bundle.discountValue || 0);
  } else if (bundle.discountType === "free_item") {
    const minPrice = products.length
      ? Math.min(...products.map((p) => Number(p.product?.price || 0)))
      : 0;
    discountEstimate = minPrice * Number(bundle.getQuantity || 1);
  }
  const finalEstimate = Math.max(0, originalTotal - discountEstimate);

  const bundleTypeLabels = {
    fixed_bundle: "Curated Bundle",
    gift_set: "Luxury Gift Set",
    starter_kit: "Starter Kit",
    frequently_bought_together: "Perfect Pair",
    mix_and_match: "Mix & Match",
    bogo: "BOGO Offer",
  };

  async function handleAddToCart() {
    setBusy(true);
    setMessage("");

    try {
      await addBundleToCart(cartId, {
        bundleId: bundle.id,
        quantity,
      });

      setAdded(true);
      setMessage("Bundle added to your bag!");
      if (showToast) {
        showToast(`${bundle.name} added to your bag.`, "success");
      }
      onAdded?.();
      setTimeout(() => setAdded(false), 3000);
    } catch (error) {
      const errMsg =
        error.response?.data?.message ||
        "This bundle is currently unavailable or out of stock.";
      setMessage(errMsg);
      if (showToast) {
        showToast(errMsg, "error");
      }
    } finally {
      setBusy(false);
    }
  }

  // Cover image: either bundle image or first item product image
  const coverImage =
    bundle.image ||
    products[0]?.product?.image ||
    "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80";

  return (
    <article className="bundle-card">
      <div className="bundle-card-media">
        <img
          src={coverImage}
          alt={bundle.name}
          className="bundle-card-image"
          loading="lazy"
        />
        <div className="bundle-badge-row">
          <span className="bundle-type-badge">
            <Sparkles size={12} />
            {bundleTypeLabels[bundle.bundleType] || bundle.bundleType.replace(/_/g, " ")}
          </span>
          {bundle.discountType === "percentage" && bundle.discountValue > 0 && (
            <span className="bundle-discount-badge">
              Save {bundle.discountValue}%
            </span>
          )}
          {bundle.discountType === "free_item" && (
            <span className="bundle-discount-badge bogo-badge">
              Buy {bundle.buyQuantity || 1} Get {bundle.getQuantity || 1} Free
            </span>
          )}
        </div>
      </div>

      <div className="bundle-card-content">
        <h3 className="bundle-card-title">{bundle.name}</h3>

        {bundle.description && (
          <p className="bundle-card-description">{bundle.description}</p>
        )}

        <div className="bundle-included-section">
          <div className="bundle-included-header">
            <Layers size={14} />
            <span>Includes {products.length} {products.length === 1 ? "piece" : "pieces"}:</span>
          </div>
          <ul className="bundle-included-list">
            {products.slice(0, 3).map((item) => (
              <li key={item.productId || item.id} className="bundle-included-item">
                <span className="bundle-item-bullet">•</span>
                <span className="bundle-item-name">
                  {item.product?.name || "Jewelry piece"}
                </span>
                <span className="bundle-item-qty">×{item.quantity}</span>
              </li>
            ))}
            {products.length > 3 && (
              <li className="bundle-included-more">
                +{products.length - 3} more items
              </li>
            )}
          </ul>
        </div>

        <div className="bundle-pricing-row">
          <div className="bundle-prices">
            {originalTotal > finalEstimate && (
              <del className="bundle-original-price">
                {formatPrice(originalTotal * quantity)}
              </del>
            )}
            <span className="bundle-final-price">
              {formatPrice(finalEstimate * quantity)}
            </span>
          </div>
          {discountEstimate > 0 && (
            <span className="bundle-savings-tag">
              Save {formatPrice(discountEstimate * quantity)}
            </span>
          )}
        </div>

        <div className="bundle-card-actions">
          <div className="bundle-qty-wrap">
            <label htmlFor={`bundle-qty-${bundle.id}`} className="sr-only">
              Quantity
            </label>
            <input
              id={`bundle-qty-${bundle.id}`}
              type="number"
              min="1"
              max="20"
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.max(1, Math.min(20, Number(e.target.value) || 1)))
              }
              className="bundle-qty-input"
            />
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={busy || added}
            className={`bundle-add-btn ${added ? "is-added" : ""}`}
          >
            {busy ? (
              <span>Adding…</span>
            ) : added ? (
              <>
                <Check size={16} /> Added to Bag
              </>
            ) : (
              <>
                <ShoppingBag size={16} /> Add Bundle
              </>
            )}
          </button>
        </div>

        {message && (
          <p
            className={`bundle-card-message ${added ? "is-success" : "is-error"}`}
            role="status"
          >
            {message}
          </p>
        )}

        <div className="bundle-card-footer">
          <Link to={`/bundles/${bundle.slug}`} className="bundle-details-link">
            Explore bundle details <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}
