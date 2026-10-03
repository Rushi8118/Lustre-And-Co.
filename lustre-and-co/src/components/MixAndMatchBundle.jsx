import { useMemo, useState } from "react";
import { Check, Sparkles, AlertCircle, ShoppingBag, Calculator } from "lucide-react";
import { formatPrice } from "../data/products";
import { addBundleToCart, validateBundle } from "../services/bundles";
import { useStore } from "../context/StoreContext";

export default function MixAndMatchBundle({ bundle, cartId: propCartId, onAdded }) {
  const { cartId: storeCartId, showToast } = useStore();
  const cartId = propCartId || storeCartId || "current";

  const [selectedItems, setSelectedItems] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);

  const selectedCount = useMemo(
    () =>
      selectedItems.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0,
      ),
    [selectedItems],
  );

  const minItems = Number(bundle.minItems || 1);
  const maxItems = bundle.maxItems ? Number(bundle.maxItems) : null;
  const isSelectionValid =
    selectedCount >= minItems && (!maxItems || selectedCount <= maxItems);

  function toggleProduct(productId) {
    setSelectedItems((current) => {
      const existing = current.find((item) => item.productId === productId);
      if (existing) {
        return current.filter((item) => item.productId !== productId);
      }
      return [...current, { productId, quantity: 1 }];
    });
    setPrice(null);
    setMessage("");
  }

  async function calculatePrice() {
    if (!isSelectionValid) {
      setMessage(
        `Please select at least ${minItems}${maxItems ? ` and at most ${maxItems}` : ""} pieces.`,
      );
      return;
    }

    setMessage("");

    try {
      const result = await validateBundle({
        bundleId: bundle.id,
        quantity,
        selectedItems,
      });

      setPrice(result.price);
    } catch (error) {
      setPrice(null);
      setMessage(
        error.response?.data?.message ||
          "Please choose a valid bundle selection.",
      );
    }
  }

  async function handleAddToCart() {
    if (!isSelectionValid) {
      setMessage(
        `Please select at least ${minItems}${maxItems ? ` and at most ${maxItems}` : ""} pieces.`,
      );
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      await validateBundle({
        bundleId: bundle.id,
        quantity,
        selectedItems,
      });

      await addBundleToCart(cartId, {
        bundleId: bundle.id,
        quantity,
        selectedItems,
      });

      setAdded(true);
      setMessage("Your personalized bundle was added to the bag.");
      if (showToast) {
        showToast(`${bundle.name} added to your bag.`, "success");
      }
      onAdded?.();
      setTimeout(() => setAdded(false), 3000);
    } catch (error) {
      const errMsg =
        error.response?.data?.message ||
        "The selected items are not available in the requested quantities.";
      setMessage(errMsg);
      if (showToast) {
        showToast(errMsg, "error");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mix-and-match-bundle">
      <div className="mix-and-match-header">
        <span className="mix-badge">
          <Sparkles size={14} /> Mix & Match Customizer
        </span>
        <h2>{bundle.name}</h2>
        {bundle.description && <p>{bundle.description}</p>}
        <div className="mix-rules-pill">
          Choose between <strong>{minItems}</strong> and{" "}
          <strong>{maxItems || "any number of"}</strong> items to unlock your bundle discount.
        </div>
      </div>

      <div className="mix-and-match-grid">
        {bundle.items.map((item) => {
          const selected = selectedItems.some(
            (selectedItem) => selectedItem.productId === item.productId,
          );

          return (
            <label
              key={item.productId}
              className={`mix-product-card ${selected ? "is-selected" : ""}`}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => toggleProduct(item.productId)}
                className="mix-checkbox sr-only"
              />

              <div className="mix-card-check">
                {selected && <Check size={14} />}
              </div>

              {item.product?.image ? (
                <div className="mix-img-wrapper">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="mix-product-image"
                  />
                </div>
              ) : null}

              <div className="mix-product-details">
                <span className="mix-product-name">{item.product?.name}</span>
                <span className="mix-product-price">
                  {formatPrice(item.product?.price || 0)}
                </span>
              </div>
            </label>
          );
        })}
      </div>

      <div className="mix-selection-bar">
        <div className="mix-selection-counter">
          Selected: <strong>{selectedCount}</strong>{" "}
          {maxItems ? `/ ${maxItems}` : `(Min ${minItems})`}
        </div>

        <div className="mix-actions-row">
          <button
            type="button"
            onClick={calculatePrice}
            className="mix-calc-btn"
            disabled={!isSelectionValid}
          >
            <Calculator size={15} /> Calculate Savings
          </button>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={busy || !isSelectionValid || added}
            className={`mix-add-btn ${added ? "is-added" : ""}`}
          >
            {busy ? (
              "Adding…"
            ) : added ? (
              <>
                <Check size={16} /> Added to Bag
              </>
            ) : (
              <>
                <ShoppingBag size={16} /> Add Bundle to Bag
              </>
            )}
          </button>
        </div>
      </div>

      {price && (
        <div className="bundle-price-summary">
          <div className="price-summary-line">
            <span>Original total:</span>
            <del>{formatPrice(price.originalTotal)}</del>
          </div>
          <div className="price-summary-line savings-line">
            <span>Bundle discount savings:</span>
            <strong>-{formatPrice(price.discountTotal)}</strong>
          </div>
          <div className="price-summary-line final-line">
            <span>Your bundle price:</span>
            <span className="final-highlight">{formatPrice(price.finalTotal)}</span>
          </div>
        </div>
      )}

      {message && (
        <p
          className={`mix-message-alert ${added ? "is-success" : "is-error"}`}
          role="alert"
        >
          {!added && <AlertCircle size={15} />} {message}
        </p>
      )}
    </section>
  );
}
