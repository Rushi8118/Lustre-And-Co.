import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Sparkles,
  ShoppingBag,
  Check,
  ArrowLeft,
  ShieldCheck,
  Truck,
  Layers,
  AlertCircle,
} from "lucide-react";
import { formatPrice } from "../data/products";
import { getBundle, addBundleToCart } from "../services/bundles";
import { useStore } from "../context/StoreContext";
import MixAndMatchBundle from "../components/MixAndMatchBundle";
import SmartImage from "../components/SmartImage";

export default function BundleDetails() {
  const { slug } = useParams();
  const { cartId, showToast } = useStore();

  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    getBundle(slug)
      .then((data) => {
        if (mounted) setBundle(data);
      })
      .catch(() => {
        if (mounted) setError("This bundle could not be found or is inactive.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <main className="bundle-details-page page-container">
        <div className="bundle-skeleton-wrap animate-pulse">
          <div className="bundle-skeleton-img" />
          <div className="bundle-skeleton-text" />
        </div>
      </main>
    );
  }

  if (error || !bundle) {
    return (
      <main className="bundle-details-page page-container">
        <div className="bundles-error-card">
          <AlertCircle size={32} />
          <h2>Bundle Not Found</h2>
          <p>{error || "The requested package is not currently available."}</p>
          <Link to="/bundles" className="bundles-reset-btn">
            Browse All Bundles
          </Link>
        </div>
      </main>
    );
  }

  if (bundle.bundleType === "mix_and_match") {
    return (
      <main className="bundle-details-page page-container">
        <div className="bundle-back-row">
          <Link to="/bundles" className="bundle-back-link">
            <ArrowLeft size={16} /> Back to Bundles
          </Link>
        </div>
        <MixAndMatchBundle bundle={bundle} cartId={cartId} />
      </main>
    );
  }

  const items = bundle.items || [];
  const originalTotal = items.reduce((sum, item) => {
    return sum + Number(item.product?.price || 0) * (item.quantity || 1);
  }, 0);

  let discountEstimate = 0;
  if (bundle.discountType === "percentage") {
    discountEstimate = originalTotal * (Number(bundle.discountValue || 0) / 100);
  } else if (bundle.discountType === "fixed") {
    discountEstimate = Number(bundle.discountValue || 0);
  } else if (bundle.discountType === "free_item") {
    const minPrice = items.length
      ? Math.min(...items.map((i) => Number(i.product?.price || 0)))
      : 0;
    discountEstimate = minPrice * Number(bundle.getQuantity || 1);
  }
  const finalTotal = Math.max(0, originalTotal - discountEstimate);

  const coverImage =
    bundle.image ||
    items[0]?.product?.image ||
    "https://images.unsplash.com/photo-1650455221359-3aebf920bcc5?auto=format&fit=crop&w=800&q=80";

  async function handleAddToCart() {
    setBusy(true);
    setMessage("");

    try {
      await addBundleToCart(cartId || "current", {
        bundleId: bundle.id,
        quantity,
      });

      setAdded(true);
      setMessage("Bundle added to your shopping bag!");
      if (showToast) {
        showToast(`${bundle.name} added to your bag.`, "success");
      }
      setTimeout(() => setAdded(false), 3000);
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        "Could not add this bundle to the bag right now.";
      setMessage(errMsg);
      if (showToast) {
        showToast(errMsg, "error");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="bundle-details-page page-container">
      <div className="bundle-back-row">
        <Link to="/bundles" className="bundle-back-link">
          <ArrowLeft size={16} /> Back to Bundles & Gift Sets
        </Link>
      </div>

      <div className="bundle-details-grid">
        {/* Media column */}
        <div className="bundle-media-col">
          <div className="bundle-hero-img-wrap">
            <SmartImage
              src={coverImage}
              alt={bundle.name}
              width={900}
              priority
              className="bundle-hero-img"
            />
            <div className="bundle-detail-badges">
              <span className="bundle-type-badge">
                <Sparkles size={12} /> {bundle.bundleType.replace(/_/g, " ")}
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
        </div>

        {/* Content column */}
        <div className="bundle-info-col">
          <h1 className="bundle-title">{bundle.name}</h1>

          {bundle.description && (
            <p className="bundle-description">{bundle.description}</p>
          )}

          {/* Pricing breakdown */}
          <div className="bundle-price-box">
            <div className="bundle-price-main">
              {originalTotal > finalTotal && (
                <del className="bundle-original-price">
                  {formatPrice(originalTotal * quantity)}
                </del>
              )}
              <span className="bundle-final-price">
                {formatPrice(finalTotal * quantity)}
              </span>
            </div>
            {discountEstimate > 0 && (
              <span className="bundle-savings-badge">
                You save {formatPrice(discountEstimate * quantity)} (
                {Math.round((discountEstimate / originalTotal) * 100)}% off)
              </span>
            )}
          </div>

          {/* Included Products List */}
          <div className="bundle-items-breakdown">
            <h3>
              <Layers size={16} /> Package Includes ({items.length} pieces)
            </h3>
            <div className="bundle-items-list">
              {items.map((item) => (
                <div key={item.productId || item.id} className="bundle-product-row">
                  {item.product?.image && (
                    <SmartImage
                      src={item.product.image}
                      alt={item.product.name}
                      width={240}
                      className="bundle-item-thumb"
                    />
                  )}
                  <div className="bundle-item-info">
                    <span className="bundle-item-title">
                      {item.product?.name || "Jewelry piece"}
                    </span>
                    <span className="bundle-item-price-tag">
                      {item.quantity} × {formatPrice(item.product?.price || 0)}
                    </span>
                  </div>
                  {item.product?.slug && (
                    <Link
                      to={`/product/${item.product.slug}`}
                      className="bundle-view-piece-link"
                    >
                      View Piece
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Purchase actions */}
          <div className="bundle-purchase-actions">
            <div className="bundle-qty-selector">
              <label htmlFor="bundle-detail-qty">Quantity</label>
              <input
                id="bundle-detail-qty"
                type="number"
                min="1"
                max="20"
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, Math.min(20, Number(e.target.value) || 1)))
                }
              />
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={busy || added}
              className={`bundle-primary-btn ${added ? "is-added" : ""}`}
            >
              {busy ? (
                "Adding to Bag…"
              ) : added ? (
                <>
                  <Check size={18} /> Added to Bag
                </>
              ) : (
                <>
                  <ShoppingBag size={18} /> Add Complete Bundle
                </>
              )}
            </button>
          </div>

          {message && (
            <p
              className={`bundle-alert ${added ? "is-success" : "is-error"}`}
              role="status"
            >
              {message}
            </p>
          )}

          {/* Value props */}
          <div className="bundle-guarantees">
            <div className="guarantee-item">
              <ShieldCheck size={16} /> Certified Authenticity & Hallmark
            </div>
            <div className="guarantee-item">
              <Truck size={16} /> Insured Complimentary Express Shipping
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
