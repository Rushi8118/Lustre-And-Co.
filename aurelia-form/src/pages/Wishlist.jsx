import { Link } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import ProductCard from "../components/ProductCard";

export default function Wishlist() {
  const { wishlistProducts } = useStore();
  return (
    <section className="container page-head">
      <p className="eyebrow">Saved</p>
      <h1>Wishlist</h1>
      {wishlistProducts.length === 0 ? (
        <p className="empty">Nothing saved yet. <Link to="/shop" className="text-link">Find something you love</Link>.</p>
      ) : (
        <div className="product-grid">
          {wishlistProducts.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
