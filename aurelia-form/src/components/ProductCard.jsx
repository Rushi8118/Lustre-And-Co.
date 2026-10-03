import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Heart, Plus } from "lucide-react";
import PreviewCanvas from "./PreviewCanvas";
import { useStore } from "../context/StoreContext";
import { formatPrice } from "../lib/helpers";
import { FINISHES } from "../lib/materials";

/** One product: a small 3D preview, its details, a wishlist toggle and a quick-add button. */
export default function ProductCard({ product, index = 0 }) {
  const { isWished, toggleWish, addToBag } = useStore();
  const reduce = useReducedMotion();
  const wished = isWished(product.id);
  const defaultFinish = "warm";
  const defaultSize = product.sizes[0] || "";

  return (
    <motion.article
      className="product-card"
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, delay: (index % 4) * 0.06 }}
      whileHover={reduce ? undefined : { y: -4 }}
    >
      <div className="product-card-media">
        <Link to={`/product/${product.id}`} tabIndex={-1} aria-hidden="true">
          <PreviewCanvas kind={product.kind} finish={defaultFinish} label={`${product.name}, 3D preview`} />
        </Link>
        {!product.inStock && <span className="product-flag">Sold out</span>}
        <button
          type="button"
          className={`icon-button wish-button ${wished ? "is-on" : ""}`}
          aria-pressed={wished}
          aria-label={`${wished ? "Remove" : "Save"} ${product.name} ${wished ? "from" : "to"} wishlist`}
          onClick={() => toggleWish(product.id)}
        >
          <Heart size={17} fill={wished ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="product-card-body">
        <h3>
          <Link to={`/product/${product.id}`}>{product.name}</Link>
        </h3>
        <p className="product-meta">
          {product.material}
          <span aria-hidden="true"> · </span>
          {Object.values(FINISHES)[0].name} shown
        </p>
        <div className="product-card-foot">
          <span className="product-price">{formatPrice(product.price)}</span>
          <button
            type="button"
            className="btn btn-small"
            disabled={!product.inStock}
            onClick={() => addToBag(product, { finish: defaultFinish, size: defaultSize })}
            aria-label={`Quick add ${product.name} to bag`}
          >
            <Plus size={14} aria-hidden="true" />
            {product.inStock ? "Quick add" : "Sold out"}
          </button>
        </div>
      </div>
    </motion.article>
  );
}
