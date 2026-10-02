import { useMemo, useState, useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { SlidersHorizontal, ChevronDown, X, Sparkles, ArrowUpDown, Home, ChevronRight, RotateCcw } from "lucide-react";
import ProductGrid from "../components/ProductGrid";
import ProductFilters, { filterOptions } from "../components/ProductFilters";
import { useStore } from "../context/StoreContext";
import { useSettings } from "../context/SettingsContext";

const pageConfig = {
  shop: {
    title: "All Imitation Jewelry",
    eyebrow: "Curated Collection",
    description:
      "Explore imitation jewelry designed for daily polish, bridal elegance, celebrations, and thoughtful gifts.",
    breadcrumb: "All Jewelry"
  },
  new: {
    title: "New Arrivals",
    eyebrow: "Fresh In",
    description: "Our newest designs featuring sculpted silhouettes, sparkling stones, and contemporary finishes.",
    breadcrumb: "New Arrivals"
  },
  bestsellers: {
    title: "Best Sellers",
    eyebrow: "Most Coveted",
    description: "The signature pieces our community loves most and wears daily.",
    breadcrumb: "Best Sellers"
  },
  bridal: {
    title: "Bridal Collection",
    eyebrow: "The Wedding Edit",
    description: "Kundan sets, ornate chokers, and heirloom-inspired designs for weddings and festivities.",
    breadcrumb: "Bridal Collection"
  },
  sale: {
    title: "Sale & Offers",
    eyebrow: "Special Pricing",
    description: "Reduced prices on selected jewelry favorites.",
    breadcrumb: "Sale & Offers"
  }
};

const sortOptions = [
  { label: "Recommended", value: "recommended" },
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price-low" },
  { label: "Price: High to Low", value: "price-high" },
  { label: "Best Rated", value: "best-rated" },
  { label: "Most Popular", value: "most-popular" }
];

const INITIAL_PAGE_SIZE = 9;
const PAGE_INCREMENT = 6;

const initialFilters = (categorySlug, type) => ({
  category: categorySlug || "all",
  price: "all",
  color: "all",
  material: "all",
  occasion: type === "bridal" ? "bridal" : "all",
  rating: "all",
  availability: "all",
  discount: "all",
  sort: "recommended"
});

const discountOf = (p) =>
  p.oldPrice && p.oldPrice > p.price ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0;

export default function CatalogPage({ type = "shop" }) {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const { products, productsStatus } = useStore();
  const { categories } = useSettings();

  const categorySlug = type === "category" ? slug : null;
  const category = categorySlug ? categories.find((c) => c.slug === categorySlug) : null;
  const config = category
    ? {
        title: category.title || category.name,
        eyebrow: category.eyebrow || `${category.name} Collection`,
        description: category.description,
        breadcrumb: category.name
      }
    : pageConfig[type] || pageConfig.shop;

  const pageKey = categorySlug || type;
  const [filters, setFilters] = useState(() => initialFilters(categorySlug, type));
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_PAGE_SIZE);

  useEffect(() => {
    setFilters((prev) => ({ ...initialFilters(categorySlug, type), sort: prev.sort }));
    setVisibleCount(INITIAL_PAGE_SIZE);
  }, [pageKey, categorySlug, type]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (type === "new") result = result.filter((p) => p.tags.includes("new"));
    else if (type === "bestsellers") result = result.filter((p) => p.tags.includes("bestseller"));
    else if (type === "bridal") result = result.filter((p) => p.occasion === "bridal" || p.tags.includes("bridal"));
    else if (type === "sale") result = result.filter((p) => discountOf(p) > 0);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((p) =>
        `${p.name} ${p.category} ${p.finish} ${p.material} ${p.description} ${p.tags.join(" ")}`
          .toLowerCase()
          .includes(q)
      );
    }

    if (filters.category !== "all") result = result.filter((p) => p.category === filters.category);

    if (filters.price === "under-1000") result = result.filter((p) => p.price < 1000);
    else if (filters.price === "1000-2000") result = result.filter((p) => p.price >= 1000 && p.price <= 2000);
    else if (filters.price === "2000-3500") result = result.filter((p) => p.price > 2000 && p.price <= 3500);
    else if (filters.price === "over-3500") result = result.filter((p) => p.price > 3500);

    if (filters.color !== "all") {
      const color = filters.color.toLowerCase();
      result = result.filter((p) => (p.availableColors || []).some((c) => c.toLowerCase() === color));
    }
    if (filters.material !== "all") result = result.filter((p) => p.material === filters.material);
    if (filters.occasion !== "all") {
      result = result.filter((p) => p.occasion === filters.occasion || p.tags.includes(filters.occasion));
    }
    if (filters.rating !== "all") {
      const minRating = parseFloat(filters.rating);
      result = result.filter((p) => p.reviews > 0 && p.rating >= minRating);
    }
    if (filters.availability === "in-stock") {
      result = result.filter((p) => p.stockQuantity > 0 && p.availability !== "out-of-stock");
    }
    if (filters.discount !== "all") {
      const minDiscount = parseInt(filters.discount, 10);
      result = result.filter((p) => discountOf(p) >= minDiscount);
    }

    switch (filters.sort) {
      case "price-low":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        result.sort((a, b) => b.price - a.price);
        break;
      case "best-rated":
        result.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
        break;
      case "newest":
        result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
      case "most-popular":
        result.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
        break;
      default: {
        const score = (p) => (p.isFeatured ? 1000 : 0) + (p.salesCount || 0) * 2 + p.rating * p.reviews;
        result.sort((a, b) => score(b) - score(a));
      }
    }

    return result;
  }, [products, filters, searchQuery, type]);

  const activeChips = useMemo(() => {
    const chips = [];
    if (filters.category !== "all") {
      const match = categories.find((c) => c.slug === filters.category);
      chips.push({ key: "category", label: match ? match.name : filters.category });
    }
    if (filters.price !== "all") {
      const opt = filterOptions.priceRanges.find((p) => p.value === filters.price);
      chips.push({ key: "price", label: opt ? opt.label : filters.price });
    }
    if (filters.color !== "all") chips.push({ key: "color", label: `Color: ${filters.color}` });
    if (filters.material !== "all") chips.push({ key: "material", label: filters.material });
    if (filters.occasion !== "all") {
      const opt = filterOptions.occasions.find((o) => o.value === filters.occasion);
      chips.push({ key: "occasion", label: opt ? opt.label : filters.occasion });
    }
    if (filters.rating !== "all") chips.push({ key: "rating", label: `★ ${filters.rating}+` });
    if (filters.availability !== "all") chips.push({ key: "availability", label: "In Stock" });
    if (filters.discount !== "all") chips.push({ key: "discount", label: `${filters.discount}% Off+` });
    return chips;
  }, [filters, categories]);

  function removeChip(key) {
    setFilters((prev) => ({ ...prev, [key]: "all" }));
  }

  function clearAllFilters() {
    setFilters((prev) => ({ ...initialFilters(null, "shop"), sort: prev.sort }));
  }

  const paginatedProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  if (type === "category" && !category) {
    return (
      <section className="section">
        <div className="container empty-state">
          <span className="empty-icon">✦</span>
          <h1>Collection not found</h1>
          <p>This category is no longer available.</p>
          <Link to="/shop" className="button button-dark">
            Browse all jewelry
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="catalog-page-container">
      <nav className="catalog-breadcrumb-bar" aria-label="Breadcrumb">
        <div className="container">
          <ol className="breadcrumb-list">
            <li className="breadcrumb-item">
              <Link to="/" className="breadcrumb-link">
                <Home size={13} />
                <span>Home</span>
              </Link>
            </li>
            <ChevronRight size={13} className="breadcrumb-sep" />
            <li className="breadcrumb-item">
              <Link to="/shop" className="breadcrumb-link">
                Shop
              </Link>
            </li>
            <ChevronRight size={13} className="breadcrumb-sep" />
            <li className="breadcrumb-item is-active" aria-current="page">
              <span>{config.breadcrumb}</span>
            </li>
          </ol>
        </div>
      </nav>

      <header className="catalog-page-header">
        <div className="container">
          <div className="catalog-header-inner">
            <span className="eyebrow">{config.eyebrow}</span>
            <h1 className="catalog-main-title">{config.title}</h1>
            {config.description && <p className="catalog-main-description">{config.description}</p>}
          </div>
        </div>
      </header>

      <section className="catalog-body-section section">
        <div className="container">
          {searchQuery && (
            <div className="search-result-banner">
              <span>
                Showing search results for: <strong>“{searchQuery}”</strong>
              </span>
            </div>
          )}

          <div className="catalog-top-toolbar">
            <div className="toolbar-left-group">
              <button
                type="button"
                className="mobile-filter-drawer-btn"
                onClick={() => setMobileFiltersOpen(true)}
                aria-label="Open filters drawer"
              >
                <SlidersHorizontal size={16} />
                <span>Filter &amp; Refine</span>
                {activeChips.length > 0 && <span className="filter-count-bubble">{activeChips.length}</span>}
              </button>

              <div className="catalog-product-counter">
                <span className="counter-num">{filteredProducts.length}</span>
                <span className="counter-label">
                  {filteredProducts.length === 1 ? "piece found" : "pieces available"}
                </span>
              </div>
            </div>

            <div className="toolbar-right-group">
              <label htmlFor="catalog-sort-select" className="sort-label">
                <ArrowUpDown size={14} />
                <span>Sort by:</span>
              </label>
              <div className="sort-select-wrapper">
                <select
                  id="catalog-sort-select"
                  className="catalog-sort-select"
                  value={filters.sort}
                  onChange={(e) => setFilters((prev) => ({ ...prev, sort: e.target.value }))}
                >
                  {sortOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="sort-select-chevron" />
              </div>
            </div>
          </div>

          {activeChips.length > 0 && (
            <div className="active-chips-bar" aria-label="Active filters">
              <span className="chips-title">Active Filters:</span>
              <div className="chips-list">
                {activeChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    className="filter-chip"
                    onClick={() => removeChip(chip.key)}
                    title={`Remove ${chip.label}`}
                  >
                    <span>{chip.label}</span>
                    <X size={12} />
                  </button>
                ))}
                <button type="button" className="clear-all-chips-btn" onClick={clearAllFilters}>
                  Clear all
                </button>
              </div>
            </div>
          )}

          <div className="catalog-main-layout">
            <ProductFilters
              filters={filters}
              setFilters={setFilters}
              mobileOpen={mobileFiltersOpen}
              setMobileOpen={setMobileFiltersOpen}
              totalResults={filteredProducts.length}
              isSidebar={true}
            />

            <main className="catalog-results-area" id="catalog-products-results">
              {productsStatus === "loading" ? (
                <p className="catalog-loading">Loading pieces…</p>
              ) : productsStatus === "error" ? (
                <p className="inline-alert inline-alert-error">Products could not be loaded. Please refresh.</p>
              ) : filteredProducts.length === 0 ? (
                <div className="catalog-empty-state">
                  <div className="empty-icon-ring">✦</div>
                  <h3>No matching pieces found</h3>
                  <p>Try adjusting your filters, clearing search terms, or exploring our full collection.</p>
                  <button type="button" className="button button-dark reset-empty-btn" onClick={clearAllFilters}>
                    <RotateCcw size={15} />
                    <span>Reset all filters</span>
                  </button>
                </div>
              ) : (
                <>
                  <ProductGrid products={paginatedProducts} />

                  <div className="catalog-pagination-container">
                    <div className="pagination-progress-info">
                      <span>
                        Showing {paginatedProducts.length} of {filteredProducts.length} pieces
                      </span>
                      <div className="pagination-progress-track">
                        <div
                          className="pagination-progress-fill"
                          style={{ width: `${(paginatedProducts.length / filteredProducts.length) * 100}%` }}
                        />
                      </div>
                    </div>

                    {hasMore ? (
                      <button
                        type="button"
                        className="button button-dark load-more-button"
                        onClick={() =>
                          setVisibleCount((prev) => Math.min(prev + PAGE_INCREMENT, filteredProducts.length))
                        }
                      >
                        <span>Load More Pieces</span>
                      </button>
                    ) : (
                      <div className="pagination-complete-msg">
                        <Sparkles size={14} />
                        <span>You have viewed all {filteredProducts.length} pieces in this selection</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </main>
          </div>
        </div>
      </section>

      <ProductFilters
        filters={filters}
        setFilters={setFilters}
        mobileOpen={mobileFiltersOpen}
        setMobileOpen={setMobileFiltersOpen}
        totalResults={filteredProducts.length}
        isSidebar={false}
      />
    </div>
  );
}
