import { useEffect, useState, useRef } from "react";
import { Heart, Menu, Search, ShoppingBag, UserRound, X, ChevronDown, Clock, TrendingUp, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { useSettings } from "../context/SettingsContext";
import api from "../services/api";
import MegaMenu from "./MegaMenu";
import SearchPanel from "./SearchPanel";

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
  const [condensed, setCondensed] = useState(false);
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

  // The header tightens once the page scrolls, so the catalogue stays in reach.
  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

      <header className={`site-header ${condensed ? "is-condensed" : ""}`}>
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
        <SearchPanel
          query={query}
          setQuery={setQuery}
          suggestions={suggestions}
          typoSuggestion={typoSuggestion}
          productPreviews={productPreviews}
          popularSearches={popularSearches}
          recentSearches={recentSearches}
          loadingSuggestions={loadingSuggestions}
          submitSearch={submitSearch}
          executeSearch={executeSearch}
          clearRecentSearches={clearRecentSearches}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </>
  );
}
