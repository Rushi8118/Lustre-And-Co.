import ProductCard from "./ProductCard";

export default function ProductGrid({ products }) {
  if (!products.length) {
    return (
      <div className="empty-products">
        <span className="empty-icon">✦</span>
        <h3>No pieces found</h3>
        <p>Try adjusting your filters or explore the full collection.</p>
      </div>
    );
  }

  return (
    <div className="product-grid">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} index={index} />
      ))}
    </div>
  );
}