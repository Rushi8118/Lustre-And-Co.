import { useEffect, useMemo, useState } from "react";
import { Heart, Menu, Search, ShoppingBag, UserRound, X, ChevronDown } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { useSettings } from "../context/SettingsContext";
import { trackSearch } from "../services/analytics";
import { formatPrice } from "../data/products";

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

export default function Header() {
  const navigate = useNavigate();
  const { cartCount, wishlist, user, products } = useStore();
  const { settings, categories } = useSettings();

  const [menuOpen, setMenuOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

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

  // The whole catalogue is already loaded, so suggestions need no extra request.
  const suggestions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];
    const scored = [];
    for (const product of products) {
      const name = (product.name || "").toLowerCase();
      const haystack = `${name} ${product.category || ""} ${product.material || ""} ${(product.tags || []).join(" ")}`.toLowerCase();
      if (!haystack.includes(term)) continue;
      // Name matches first, then earlier matches within the name.
      const rank = name.startsWith(term) ? 0 : name.includes(term) ? 1 : 2;
      scored.push({ product, rank });
    }
    return scored
      .sort((a, b) => a.rank - b.rank || a.product.name.localeCompare(b.product.name))
      .slice(0, 6)
      .map((entry) => entry.product);
  }, [query, products]);

  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
  }

  function submitSearch(event) {
    event.preventDefault();
    if (!query.trim()) return;
    trackSearch(query.trim());
    navigate(`/shop?search=${encodeURIComponent(query.trim())}`);
    closeSearch();
  }

  function openSuggestion(product) {
    trackSearch(query.trim());
    navigate(`/product/${product.slug}`);
    closeSearch();
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

          <nav className="desktop-navigation" aria-label="Main navigation">
            <div
              className="nav-dropdown"
              onMouseEnter={() => setShopOpen(true)}
              onMouseLeave={() => setShopOpen(false)}
            >
              <button
                className="nav-link nav-dropdown-trigger"
                aria-haspopup="true"
                aria-expanded={shopOpen}
                onClick={() => setShopOpen((open) => !open)}
              >
                Shop <ChevronDown size={14} />
              </button>

              {shopOpen && (
                <div className="mega-menu">
                  {feature?.enabled && (
                    <div className="mega-menu-feature">
                      <div className="mega-menu-feature-image">
                        <img src={feature.image} alt={feature.eyebrow} />
                      </div>
                      <div>
                        <span className="eyebrow">{feature.eyebrow}</span>
                        <h3>{feature.title}</h3>
                        <Link to={feature.ctaLink} className="text-link">
                          {feature.ctaLabel}
                        </Link>
                      </div>
                    </div>
                  )}

                  <div className="mega-menu-links">
                    {shopLinks.map(([label, path]) => (
                      <Link key={path} to={path}>
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <NavLink className="nav-link" to="/collections/bridal">
              Collections
            </NavLink>
            <NavLink className="nav-link" to="/new-arrivals">
              New Arrivals
            </NavLink>
            <NavLink className="nav-link" to="/best-sellers">
              Best Sellers
            </NavLink>
            <NavLink className="nav-link" to="/about">
              About Us
            </NavLink>
            {user?.role === "admin" && (
              <NavLink className="nav-link" to="/admin">
                Admin
              </NavLink>
            )}
          </nav>

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
            onClick={closeSearch}
            aria-label="Close search"
          >
            <X size={22} />
          </button>

          <form className="search-form" onSubmit={submitSearch}>
            <span className="eyebrow">Search the collection</span>
            <div className="search-input-wrap">
              <Search size={22} />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Try “pearl earrings”"
              />
            </div>
            <button className="button button-dark" type="submit">
              Search
            </button>

            {query.trim().length >= 2 && (
              <div className="search-suggestions" role="listbox" aria-label="Search suggestions">
                {suggestions.length === 0 ? (
                  <p className="search-suggestion-empty">
                    Nothing matches “{query.trim()}”. Press Search to browse the full collection.
                  </p>
                ) : (
                  suggestions.map((product) => (
                    <button
                      type="button"
                      key={product.slug}
                      className="search-suggestion"
                      role="option"
                      aria-selected="false"
                      onClick={() => openSuggestion(product)}
                    >
                      <img src={product.image} alt="" loading="lazy" />
                      <span className="search-suggestion-text">
                        <span className="search-suggestion-name">{product.name}</span>
                        <span className="search-suggestion-meta">{product.category}</span>
                      </span>
                      <span className="search-suggestion-price">{formatPrice(product.price)}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </form>
        </div>
      )}
    </>
  );
}
