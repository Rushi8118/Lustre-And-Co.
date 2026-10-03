import { lazy, Suspense, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Heart, Minus, Plus } from "lucide-react";
import { PRODUCTS } from "../data/products";
import { FINISHES, FINISH_LIST, DEFAULT_FINISH } from "../lib/materials";
import { formatPrice, hasWebGL } from "../lib/helpers";
import { useStore } from "../context/StoreContext";
import ProductCard from "../components/ProductCard";
import { ViewerFallback, ViewerLoading } from "../components/Viewer";
import Reveal from "../components/Reveal";

const LazyProductViewer = lazy(() => import("../components/ProductViewer"));

/** Angles shown as thumbnails. The viewer eases to the chosen yaw. */
const VIEWS = [
  { id: "front", label: "Front", turn: 0 },
  { id: "side", label: "Side", turn: Math.PI / 2 },
  { id: "angle", label: "Angle", turn: Math.PI / 4 },
];

export default function ProductDetail() {
  const { id } = useParams();
  const product = PRODUCTS.find((item) => item.id === id);
  const { addToBag, isWished, toggleWish } = useStore();
  const [finish, setFinish] = useState(DEFAULT_FINISH);
  const [size, setSize] = useState(product?.sizes[0] || "");
  const [qty, setQty] = useState(1);
  const [view, setView] = useState(VIEWS[0]);
  const [added, setAdded] = useState(false);
  const webgl = useMemo(() => hasWebGL(), []);

  if (!product) {
    return (
      <section className="container page-head">
        <h1>We could not find that piece.</h1>
        <p><Link to="/shop" className="text-link">Back to all jewellery</Link></p>
      </section>
    );
  }

  const wished = isWished(product.id);
  const lowStock = product.stock > 0 && product.stock <= 3;
  const others = PRODUCTS.filter((item) => item.id !== product.id && item.inStock && item.kind !== product.kind).slice(0, 3);

  function handleAdd() {
    addToBag(product, { finish, size, qty });
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  }

  return (
    <>
      <section className="container product-detail">
        <div className="pdp-viewer-col">
          {webgl ? (
            <Suspense fallback={<ViewerLoading />}>
              <LazyProductViewer kind={product.kind} finish={finish} turn={view.turn} label={`${product.name}, 3D viewer. Drag to rotate, scroll to zoom.`} />
            </Suspense>
          ) : (
            <ViewerFallback label="The 3D viewer needs WebGL, which this browser does not support." />
          )}

          <div className="thumbs" role="group" aria-label="Views">
            {VIEWS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`thumb ${view.id === item.id ? "is-on" : ""}`}
                aria-pressed={view.id === item.id}
                onClick={() => setView(item)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pdp-info">
          <Reveal>
            <p className="eyebrow">{product.material}</p>
            <h1>{product.name}</h1>
            <p className="pdp-tagline">{product.tagline}</p>
            <p className="pdp-price">{formatPrice(product.price)}</p>
            <p className="pdp-desc">{product.description}</p>
          </Reveal>

          <fieldset className="pdp-field">
            <legend>Finish: <strong>{FINISHES[finish].name}</strong></legend>
            <div className="finish-options compact" role="radiogroup" aria-label="Finish">
              {FINISH_LIST.map((item) => (
                <button key={item.id} type="button" role="radio" aria-checked={finish === item.id} className={`finish-option ${finish === item.id ? "is-selected" : ""}`} onClick={() => setFinish(item.id)}>
                  <span className="swatch" style={{ background: item.color }} aria-hidden="true" />
                  {item.name}
                </button>
              ))}
            </div>
          </fieldset>

          {product.sizes.length > 0 && (
            <div className="pdp-field">
              <label htmlFor="pdp-size">Size</label>
              <select id="pdp-size" value={size} onChange={(e) => setSize(e.target.value)}>
                {product.sizes.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          )}

          <div className="pdp-buy">
            <div className="qty" role="group" aria-label="Quantity">
              <button type="button" className="icon-button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}>
                <Minus size={16} />
              </button>
              <output aria-live="polite">{qty}</output>
              <button type="button" className="icon-button" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(5, q + 1))} disabled={qty >= 5}>
                <Plus size={16} />
              </button>
            </div>
            <button type="button" className="btn btn-wide" onClick={handleAdd} disabled={!product.inStock}>
              {!product.inStock ? "Sold out" : added ? "Added to your bag" : "Add to bag"}
            </button>
            <button type="button" className={`icon-button wish-button ${wished ? "is-on" : ""}`} aria-pressed={wished} aria-label={`${wished ? "Remove from" : "Save to"} wishlist`} onClick={() => toggleWish(product.id)}>
              <Heart size={18} fill={wished ? "currentColor" : "none"} />
            </button>
          </div>
          {lowStock && <p className="stock-note">Only {product.stock} left in this design.</p>}

          <div className="accordion">
            <details>
              <summary>Shipping and returns</summary>
              <p>Insured delivery in 3 to 5 working days. Complimentary shipping on orders over ₹5,000. Returns accepted within 14 days, in the original pouch and unworn.</p>
            </details>
            <details>
              <summary>Care instructions</summary>
              <ul>
                {product.care.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </details>
            <details>
              <summary>Materials</summary>
              <p>{product.material}. Stones and pearls are set by hand. Nickel free.</p>
            </details>
          </div>
        </div>
      </section>

      <section className="section container" aria-labelledby="look-title">
        <Reveal className="section-head">
          <div>
            <p className="eyebrow">Pairs well</p>
            <h2 id="look-title">Complete the look</h2>
          </div>
        </Reveal>
        <div className="product-grid">
          {others.map((item, i) => (
            <ProductCard key={item.id} product={item} index={i} />
          ))}
        </div>
      </section>
    </>
  );
}
