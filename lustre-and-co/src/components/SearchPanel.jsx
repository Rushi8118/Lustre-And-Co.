import { useEffect, useRef } from "react";
import { Clock, Loader2, Search, Sparkles, TrendingUp, X } from "lucide-react";
import { Link } from "react-router-dom";
import SmartImage from "./SmartImage";

/**
 * Search dropdown under the header. Shows product matches, suggestions, recent and
 * popular searches. Escape or a click outside closes it; the query is kept while open.
 */
export default function SearchPanel({
  query,
  setQuery,
  suggestions,
  typoSuggestion,
  productPreviews,
  popularSearches,
  recentSearches,
  loadingSuggestions,
  submitSearch,
  executeSearch,
  clearRecentSearches,
  onClose,
}) {
  const panelRef = useRef(null);
  const trimmed = query.trim();

  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape") onClose();
    }
    function handleClickAway(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClickAway);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClickAway);
    };
  }, [onClose]);

  const showTypo = typoSuggestion && typoSuggestion.toLowerCase() !== trimmed.toLowerCase();

  return (
    <div className="search-panel" role="dialog" aria-label="Search the catalog" ref={panelRef}>
      <form className="search-panel-form" onSubmit={submitSearch} role="search">
        <Search size={18} className="search-panel-icon" aria-hidden="true" />
        <input
          id="header-search-input"
          type="search"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search rings, necklaces, kundan, bridal"
          aria-label="Search products"
          autoComplete="off"
        />
        {loadingSuggestions && <Loader2 size={16} className="search-panel-spinner" aria-hidden="true" />}
        {query && (
          <button type="button" className="search-panel-clear" onClick={() => setQuery("")} aria-label="Clear search">
            <X size={16} />
          </button>
        )}
        <button type="submit" className="search-panel-submit">
          Search
        </button>
      </form>

      {showTypo && (
        <div className="search-panel-typo">
          <Sparkles size={14} aria-hidden="true" />
          Did you mean{" "}
          <button type="button" onClick={() => executeSearch(typoSuggestion)}>
            {typoSuggestion}
          </button>
          ?
        </div>
      )}

      <div className="search-panel-body">
        {productPreviews.length > 0 && (
          <section className="search-panel-section">
            <h3>Products</h3>
            <ul className="search-product-list">
              {productPreviews.slice(0, 4).map((product) => {
                const image = product.images?.[0] || product.image;
                return (
                  <li key={product.id}>
                    <Link to={`/product/${product.slug || product.id}`} onClick={onClose}>
                      {image ? (
                        <SmartImage src={image} alt="" width={160} />
                      ) : (
                        <span className="search-product-thumb-empty" />
                      )}
                      <span className="search-product-name">{product.name}</span>
                      <span className="search-product-price">₹{Number(product.price || 0).toLocaleString("en-IN")}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {suggestions.length > 0 && (
          <section className="search-panel-section">
            <h3>Suggestions</h3>
            <div className="search-chips">
              {suggestions.map((item) => (
                <button key={item} type="button" onClick={() => executeSearch(item)}>
                  <Search size={12} aria-hidden="true" />
                  {item}
                </button>
              ))}
            </div>
          </section>
        )}

        {!trimmed && recentSearches.length > 0 && (
          <section className="search-panel-section">
            <div className="search-panel-heading">
              <h3>
                <Clock size={13} aria-hidden="true" /> Recent
              </h3>
              <button type="button" className="search-panel-link" onClick={clearRecentSearches}>
                Clear
              </button>
            </div>
            <div className="search-chips">
              {recentSearches.map((term) => (
                <button key={term} type="button" onClick={() => executeSearch(term)}>
                  {term}
                </button>
              ))}
            </div>
          </section>
        )}

        {!trimmed && (
          <section className="search-panel-section">
            <h3>
              <TrendingUp size={13} aria-hidden="true" /> Popular
            </h3>
            <div className="search-chips">
              {popularSearches.map((term) => (
                <button key={term} type="button" onClick={() => executeSearch(term)}>
                  {term}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {trimmed && (
        <div className="search-panel-footer">
          <button type="button" className="search-panel-link" onClick={() => executeSearch(trimmed)}>
            View all results for “{trimmed}” →
          </button>
        </div>
      )}
    </div>
  );
}
