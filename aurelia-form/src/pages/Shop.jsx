import { useMemo } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { CATEGORIES, COLLECTIONS, PRODUCTS, categoryFor } from "../data/products";
import ProductCard from "../components/ProductCard";
import Reveal from "../components/Reveal";
import { formatPrice } from "../lib/helpers";

const PRICE_STEPS = [
  { value: "", label: "Any price" },
  { value: "10000", label: "Up to ₹10,000" },
  { value: "15000", label: "Up to ₹15,000" },
  { value: "20000", label: "Up to ₹20,000" },
];

const SORTS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Name, A to Z" },
];

/**
 * One page for every shop route: all jewellery, a category, a collection, or the collections index.
 * Filters, sort and search live in the URL, so a filtered view can be shared and reloaded.
 */
export default function Shop() {
  const { category, slug } = useParams();
  const [params, setParams] = useSearchParams();
  const { pathname } = useLocation();
  const query = (params.get("q") || "").trim().toLowerCase();
  const material = params.get("material") || "";
  const maxPrice = Number(params.get("max") || 0);
  const inStockOnly = params.get("stock") === "1";
  const sort = params.get("sort") || "featured";

  const collection = COLLECTIONS.find((item) => item.slug === slug);
  const categoryInfo = CATEGORIES.find((item) => item.slug === category);
  const isIndex = pathname === "/collections";

  const materials = useMemo(() => [...new Set(PRODUCTS.map((product) => product.material))], []);

  const products = useMemo(() => {
    let list = PRODUCTS.filter((product) => {
      if (collection && product.collection !== collection.slug) return false;
      if (categoryInfo && categoryFor(product.kind) !== categoryInfo.slug) return false;
      if (material && product.material !== material) return false;
      if (maxPrice && product.price > maxPrice) return false;
      if (inStockOnly && !product.inStock) return false;
      if (query && !`${product.name} ${product.tagline} ${product.material}`.toLowerCase().includes(query)) return false;
      return true;
    });
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [collection, categoryInfo, material, maxPrice, inStockOnly, query, sort]);

  function update(key, value) {
    const next = new URLSearchParams(params);
    if (value === "" || value === false || value == null) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  }

  const title = collection ? collection.name : categoryInfo ? categoryInfo.name : isIndex ? "Collections" : "All jewellery";
  const lede = collection
    ? collection.description
    : categoryInfo
      ? `${categoryInfo.name} designed to be worn every day.`
      : "Sculptural pieces in gold, silver and rose, made to catch the light.";

  return (
    <>
      <section className="page-head container">
        <Reveal>
          <p className="eyebrow">{collection ? "Collection" : categoryInfo ? "Category" : "Shop"}</p>
          <h1>{title}</h1>
          <p className="page-lede">{lede}</p>
        </Reveal>
      </section>

      {!collection && (
        <section className="container collection-tiles" aria-label="Browse collections">
          {COLLECTIONS.map((item) => (
            <Link key={item.slug} to={`/collections/${item.slug}`} className="collection-tile" style={{ background: item.background }}>
              <span className="rail-mood">{item.mood}</span>
              <strong>{item.name}</strong>
            </Link>
          ))}
        </section>
      )}

      <section className="container shop-layout" aria-label="Products">
        <aside className="filters" aria-label="Filters">
          <div className="field">
            <label htmlFor="shop-search">Search</label>
            <input id="shop-search" type="search" value={params.get("q") || ""} onChange={(e) => update("q", e.target.value)} placeholder="Name or material" />
          </div>
          <div className="field">
            <label htmlFor="shop-material">Material</label>
            <select id="shop-material" value={material} onChange={(e) => update("material", e.target.value)}>
              <option value="">All materials</option>
              {materials.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="shop-price">Price</label>
            <select id="shop-price" value={maxPrice ? String(maxPrice) : ""} onChange={(e) => update("max", e.target.value)}>
              {PRICE_STEPS.map((step) => (
                <option key={step.value} value={step.value}>{step.label}</option>
              ))}
            </select>
          </div>
          <label className="check">
            <input type="checkbox" checked={inStockOnly} onChange={(e) => update("stock", e.target.checked ? "1" : "")} />
            In stock only
          </label>
        </aside>

        <div className="shop-results">
          <div className="results-bar">
            <p aria-live="polite">{products.length} {products.length === 1 ? "piece" : "pieces"}</p>
            <div className="field field-inline">
              <label htmlFor="shop-sort">Sort</label>
              <select id="shop-sort" value={sort} onChange={(e) => update("sort", e.target.value === "featured" ? "" : e.target.value)}>
                {SORTS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>
          </div>

          {products.length === 0 ? (
            <p className="empty">No pieces match these filters. Try clearing one of them.</p>
          ) : (
            <div className="product-grid">
              {products.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          )}

          <p className="price-note">Prices from {formatPrice(Math.min(...PRODUCTS.map((p) => p.price)))}.</p>
        </div>
      </section>
    </>
  );
}
