import { useEffect, useState, useRef } from "react";
import { Heart, Menu, Search, ShoppingBag, UserRound, X, ChevronDown, Clock, TrendingUp, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { useSettings } from "../context/SettingsContext";
import api from "../services/api";
import MegaMenu from "./MegaMenu";

export function BrandName({ name }) {
  const [left, right] = (name || "").split("&").map((part) => part.trim());
  if (!right) return <span>{name}</span>;
  return (
    <>
      <span>{left}</span>
      <b>&amp;</b>
      <span>{right}</span>
    </>
  );
}

const DEFAULT_POPULAR_SEARCHES = [
  "Kundan Necklace",
  "Solitaire Ring",
  "Rose Gold Bangle",
  "Bridal Choker",
  "Pearl Drop Earrings",
  "Silver Anklet",
];

export default function Header() {
  const navigate = useNavigate();
  const { cartCount, wishlist, user } = useStore();
  const { settings, categories } = useSettings();

  const [menuOpen, setMenuOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [typoSuggestion, setTypoSuggestion] = useState(null);
  const [productPreviews, setProductPreviews] = useState([]);
  const [popularSearches, setPopularSearches] = useState(DEFAULT_POPULAR_SEARCHES);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("lustre_recent_searches") || "[]");
    } catch {
      return [];
    }
  });
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const searchDebounceRef = useRef(null);

  const shopLinks = [
    ["Shop All", "/shop"],
    ["New Arrivals", "/new-arrivals"],
    ["Best Sellers", "/best-sellers"],
    ...categories.filter((c) => c.showInMenu).map((c) => [c.name, `/category/${c.slug}`])
  ];

  const announcement = settings.announcement;
  const messages = announcement?.enabled ? (announcement.messages || []).filter(Boolean) : [];
  const feature = settings.homepage?.editorial;

  useEffect(() => {
    document.body.classList.toggle("menu-is-open", menuOpen);
    return () => document.body.classList.remove("menu-is-open");
  }, [menuOpen]);

  // Fetch popular searches from API on mount
  useEffect(() => {
    api.get("/search/popular")
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setPopularSearches(res.data.map((item) => (typeof item === "string" ? item : item.query)));
        }
      })
      .catch(() => {});
  }, []);

  // Fetch live autocomplete suggestions with debounce
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setSuggestions([]);
      setTypoSuggestion(null);
      setProductPreviews([]);
      setLoadingSuggestions(false);
      return;
    }

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    searchDebounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await api.get(`/search/suggestions?q=${encodeURIComponent(query.trim())}`);
        if (res.data) {
          setSuggestions(res.data.suggestions || []);
          setTypoSuggestion(res.data.typoCorrection || null);
          setProductPreviews(res.data.products || []);
        }
      } catch {
        // graceful fallback to empty suggestions
      } finally {
        setLoadingSuggestions(false);
      }
    }, 200);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [query]);

  function saveRecentSearch(term) {
    const trimmed = term.trim();
    if (!trimmed) return;
    try {
      const existing = recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...existing].slice(0, 6);
      setRecentSearches(updated);
      localStorage.setItem("lustre_recent_searches", JSON.stringify(updated));
    } catch {}
  }

  function clearRecentSearches() {
    setRecentSearches([]);
    try {
      localStorage.removeItem("lustre_recent_searches");
    } catch {}
  }

  function executeSearch(term) {
    const finalTerm = (term || query).trim();
    if (!finalTerm) return;
    saveRecentSearch(finalTerm);
    navigate(`/shop?search=${encodeURIComponent(finalTerm)}`);
    setSearchOpen(false);
    setQuery("");
  }

  function submitSearch(event) {
    event.preventDefault();
    executeSearch();
  }

  return (
    <>
      {messages.length > 0 && (
        <div className="announcement-bar">
          {messages.map((message, index) => (
            <span key={`${message}-${index}`} style={{ display: "contents" }}>
              {index > 0 && <span className="announcement-separator">✦</span>}
              <span>{message}</span>
            </span>
          ))}
        </div>
      )}

      <header className="site-header">
        <div className="header-inner container">
          <button
            className="mobile-menu-button icon-button"
            type="button"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation-drawer"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link to="/" className="brand-logo" onClick={() => setMenuOpen(false)}>
            <BrandName name={settings.store.name} />
          </Link>


          <div className="header-actions">
            <button className="icon-button" aria-label="Search jewelry catalog" onClick={() => setSearchOpen(true)}>
              <Search size={19} />
            </button>

            <Link
              className="icon-button header-action-with-count"
              to="/wishlist"
              aria-label={`Wishlist, ${wishlist.length} items`}
            >
              <Heart size={19} />
              {wishlist.length > 0 && <span className="header-count">{wishlist.length}</span>}
            </Link>

            <Link
              className="icon-button"
              to={user ? "/account" : "/account/login"}
              aria-label={user ? "Your account" : "Sign in"}
            >
              <UserRound size={19} />
            </Link>

            <Link
              className="icon-button header-action-with-count"
              to="/cart"
              aria-label={`Shopping bag, ${cartCount} items`}
            >
              <ShoppingBag size={19} />
              {cartCount > 0 && <span className="header-count">{cartCount}</span>}
            </Link>
          </div>
        </div>

        <MegaMenu categories={categories} showAdmin={user?.role === "admin"} />

        <nav
          id="mobile-navigation-drawer"
          className={`mobile-navigation ${menuOpen ? "is-open" : ""}`}
          aria-label="Mobile Navigation"
        >
          <div className="mobile-navigation-inner">
            <button
              className="mobile-nav-group-toggle"
              aria-expanded={shopOpen}
              onClick={() => setShopOpen((open) => !open)}
            >
              <span>Shop All Categories</span>
              <ChevronDown size={16} className={`dropdown-arrow ${shopOpen ? "is-rotated" : ""}`} />
            </button>

            {shopOpen && (
              <div className="mobile-shop-links">
                {shopLinks.map(([label, path]) => (
                  <Link key={path} to={path} onClick={() => setMenuOpen(false)}>
                    {label}
                  </Link>
                ))}
              </div>
            )}

            <Link to="/collections/bridal" onClick={() => setMenuOpen(false)}>
              Collections
            </Link>
            <Link to="/bundles" onClick={() => setMenuOpen(false)}>
              Bundles & Sets
            </Link>
            <Link to="/new-arrivals" onClick={() => setMenuOpen(false)}>
              New Arrivals
            </Link>
            <Link to="/best-sellers" onClick={() => setMenuOpen(false)}>
              Best Sellers
            </Link>
            <Link to="/track-order" onClick={() => setMenuOpen(false)}>
              Track My Order
            </Link>
            <Link to="/about" onClick={() => setMenuOpen(false)}>
              About Us
            </Link>
            <Link to="/faq" onClick={() => setMenuOpen(false)}>
              FAQ
            </Link>
            <Link to="/contact" onClick={() => setMenuOpen(false)}>
              Contact Us
            </Link>
            {user?.role === "admin" && (
              <Link to="/admin" onClick={() => setMenuOpen(false)}>
                Admin Panel
              </Link>
            )}
          </div>
        </nav>
      </header>

      {searchOpen && (
        <div className="search-overlay" role="dialog" aria-modal="true">
          <button
            className="search-overlay-close icon-button"
            onClick={() => setSearchOpen(false)}
            aria-label="Close search"
          >
            <X size={22} />
          </button>

          <div className="search-form" style={{ width: "min(720px, calc(100% - 32px))", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
            <span className="eyebrow" style={{ color: "var(--gold, #d4af37)", letterSpacing: "2px" }}>
              Explore Lustre &amp; Co.
            </span>

            <form onSubmit={submitSearch} style={{ width: "100%" }}>
              <div
                className="search-input-wrap"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  margin: "12px 0 16px",
                  padding: "10px 0",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.4)",
                  position: "relative",
                }}
              >
                <Search size={22} style={{ color: "var(--gold, #d4af37)", flexShrink: 0 }} />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search rings, necklaces, kundan, bridal..."
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "#fff",
                    fontSize: "clamp(18px, 3.5vw, 28px)",
                    fontFamily: "var(--serif, serif)",
                  }}
                  id="header-search-input"
                />
                {loadingSuggestions && (
                  <Loader2 size={18} className="pdp-spinner" style={{ color: "var(--gold, #d4af37)", animation: "spin 1s linear infinite" }} />
                )}
                {query && !loadingSuggestions && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", padding: "4px" }}
                    aria-label="Clear search input"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </form>

            {/* Typo Correction Prompt */}
            {typoSuggestion && typoSuggestion.toLowerCase() !== query.toLowerCase() && (
              <div
                style={{
                  background: "rgba(212, 175, 55, 0.15)",
                  border: "1px solid rgba(212, 175, 55, 0.4)",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  marginBottom: "16px",
                  fontSize: "13px",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Sparkles size={15} style={{ color: "var(--gold, #d4af37)" }} />
                <span>Did you mean:</span>
                <button
                  type="button"
                  onClick={() => {
                    setQuery(typoSuggestion);
                    executeSearch(typoSuggestion);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--gold, #d4af37)",
                    fontWeight: "700",
                    textDecoration: "underline",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {typoSuggestion}
                </button>
              </div>
            )}

            <div style={{ overflowY: "auto", flex: 1, paddingRight: "4px" }}>
              {/* Autocomplete Suggestions */}
              {suggestions.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "8px" }}>
                    Suggested Searches
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {suggestions.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => executeSearch(item)}
                        style={{
                          background: "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(255,255,255,0.2)",
                          color: "#fff",
                          padding: "6px 14px",
                          borderRadius: "20px",
                          fontSize: "13px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(212,175,55,0.2)";
                          e.currentTarget.style.borderColor = "var(--gold, #d4af37)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                          e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                        }}
                      >
                        <Search size={12} style={{ color: "var(--gold, #d4af37)" }} />
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Instant Product Previews */}
              {productPreviews.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "10px" }}>
                    Matching Products
                  </span>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px" }}>
                    {productPreviews.slice(0, 4).map((p) => (
                      <Link
                        key={p.id}
                        to={`/product/${p.slug || p.id}`}
                        onClick={() => setSearchOpen(false)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          background: "rgba(255,255,255,0.06)",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          textDecoration: "none",
                          color: "#fff",
                          border: "1px solid rgba(255,255,255,0.1)",
                          transition: "border-color 0.2s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--gold, #d4af37)")}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                      >
                        {p.images?.[0] || p.image ? (
                          <img
                            src={p.images?.[0] || p.image}
                            alt={p.name}
                            style={{ width: "42px", height: "42px", objectFit: "cover", borderRadius: "6px" }}
                          />
                        ) : (
                          <div style={{ width: "42px", height: "42px", background: "rgba(255,255,255,0.1)", borderRadius: "6px" }} />
                        )}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: "13px", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--gold, #d4af37)", marginTop: "2px" }}>
                            ₹{Number(p.price || 0).toLocaleString("en-IN")}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* When no query is typed, show Recent Searches & Popular Trending */}
              {!query.trim() && (
                <>
                  {recentSearches.length > 0 && (
                    <div style={{ marginBottom: "22px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: "6px" }}>
                          <Clock size={12} /> Recent Searches
                        </span>
                        <button
                          type="button"
                          onClick={clearRecentSearches}
                          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: "11px", cursor: "pointer", textDecoration: "underline" }}
                        >
                          Clear
                        </button>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {recentSearches.map((term, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => executeSearch(term)}
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              border: "1px solid rgba(255,255,255,0.15)",
                              color: "rgba(255,255,255,0.9)",
                              padding: "5px 12px",
                              borderRadius: "16px",
                              fontSize: "12px",
                              cursor: "pointer",
                            }}
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: "16px" }}>
                    <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                      <TrendingUp size={12} style={{ color: "var(--gold, #d4af37)" }} /> Popular Searches
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {popularSearches.map((term, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => executeSearch(term)}
                          style={{
                            background: "rgba(212, 175, 55, 0.08)",
                            border: "1px solid rgba(212, 175, 55, 0.25)",
                            color: "#fff",
                            padding: "6px 14px",
                            borderRadius: "20px",
                            fontSize: "13px",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            transition: "background 0.2s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(212, 175, 55, 0.2)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(212, 175, 55, 0.08)")}
                        >
                          ✦ {term}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                type="button"
                className="button button-gold"
                onClick={() => executeSearch()}
                style={{ minHeight: "42px", padding: "0 22px" }}
              >
                Search Catalog <ArrowRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", fontSize: "12px", cursor: "pointer" }}
              >
                Press ESC to close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
