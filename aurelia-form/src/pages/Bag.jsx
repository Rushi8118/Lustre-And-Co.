import { useState } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus, X } from "lucide-react";
import { useStore } from "../context/StoreContext";
import { FINISHES } from "../lib/materials";
import { formatPrice } from "../lib/helpers";
import { SHIPPING_NOTE } from "../data/products";

export default function Bag() {
  const { bagLines, subtotal, setQty, removeLine } = useStore();
  const [notice, setNotice] = useState("");

  return (
    <section className="container page-head">
      <p className="eyebrow">Your bag</p>
      <h1>Bag</h1>

      {bagLines.length === 0 ? (
        <p className="empty">
          Your bag is empty. <Link to="/shop" className="text-link">Browse the collection</Link>.
        </p>
      ) : (
        <div className="bag-layout">
          <ul className="bag-lines">
            {bagLines.map((line) => (
              <li key={line.key} className="bag-line">
                <div>
                  <h2>
                    <Link to={`/product/${line.product.id}`}>{line.product.name}</Link>
                  </h2>
                  <p className="bag-meta">
                    {FINISHES[line.finish].name}
                    {line.size && ` · Size ${line.size}`}
                  </p>
                  <p className="bag-price">{formatPrice(line.product.price)}</p>
                </div>
                <div className="qty" role="group" aria-label={`Quantity for ${line.product.name}`}>
                  <button type="button" className="icon-button" aria-label="Decrease quantity" onClick={() => setQty(line.key, line.qty - 1)}>
                    <Minus size={16} />
                  </button>
                  <output aria-live="polite">{line.qty}</output>
                  <button type="button" className="icon-button" aria-label="Increase quantity" disabled={line.qty >= 5} onClick={() => setQty(line.key, line.qty + 1)}>
                    <Plus size={16} />
                  </button>
                </div>
                <button type="button" className="icon-button" aria-label={`Remove ${line.product.name}`} onClick={() => removeLine(line.key)}>
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>

          <aside className="bag-summary" aria-label="Order summary">
            <p><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></p>
            <p className="muted">{SHIPPING_NOTE}</p>
            <button type="button" className="btn btn-wide" onClick={() => setNotice("Checkout is not connected in this preview yet.")}>
              Proceed to checkout
            </button>
            {notice && <p role="status" className="muted">{notice}</p>}
          </aside>
        </div>
      )}
    </section>
  );
}
