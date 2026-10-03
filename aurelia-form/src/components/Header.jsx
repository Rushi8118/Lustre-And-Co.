import { useEffect, useId, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Heart, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useScrolled } from "../hooks/useInteraction";
import { useStore } from "../context/StoreContext";

const NAV = [
  { to: "/collections", label: "Collections" },
  { to: "/shop/rings", label: "Rings" },
  { to: "/shop/necklaces", label: "Necklaces" },
  { to: "/shop/earrings", label: "Earrings" },
  { to: "/shop/bracelets", label: "Bracelets" },
  { to: "/story", label: "Our Story" },
  { to: "/journal", label: "Journal" },
];

/** A small abstract orbit mark: a ring, a tilted orbit and a single point of light. */
function OrbitMark() {
  return (
    <svg className="orbit-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="9" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <ellipse cx="16" cy="16" rx="14" ry="5" fill="none" stroke="#c8a45d" strokeWidth="1" transform="rotate(-24 16 16)" />
      <circle cx="26" cy="11" r="2" fill="#c8a45d" />
    </svg>
  );
}

export default function Header() {
  const scrolled = useScrolled(12);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { count, wishlistIds } = useStore();
  const menuId = useId();

  // Close the mobile menu after navigating.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  // Escape closes the menu, and the page stops scrolling underneath it.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (event) => event.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  function submitSearch(event) {
    event.preventDefault();
    const term = query.trim();
    navigate(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
    setQuery("");
  }

  return (
    <>
      <div className="top-line" aria-hidden="true" />
      <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
        <div className="site-header-inner container">
          <button
            type="button"
            className="icon-button menu-toggle"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link to="/" className="brand" aria-label="Aurelia Form, home">
            <OrbitMark />
            <span className="brand-name">Aurelia Form</span>
          </Link>

          <nav className="primary-nav" aria-label="Main">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} className="primary-nav-link">
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="header-tools">
            <form className="header-search" role="search" onSubmit={submitSearch}>
              <label htmlFor="header-search-input" className="visually-hidden">
                Search jewellery
              </label>
              <input id="header-search-input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" />
              <button type="submit" className="icon-button" aria-label="Search">
                <Search size={18} />
              </button>
            </form>

            <Link to="/wishlist" className="icon-button" aria-label={`Wishlist, ${wishlistIds.length} saved`}>
              <Heart size={18} />
              {wishlistIds.length > 0 && <span className="badge">{wishlistIds.length}</span>}
            </Link>
            <Link to="/account" className="icon-button" aria-label="Account">
              <UserRound size={18} />
            </Link>
            <Link to="/bag" className="icon-button" aria-label={`Bag, ${count} items`}>
              <ShoppingBag size={18} />
              {count > 0 && <span className="badge">{count}</span>}
            </Link>
          </div>
        </div>

        <nav id={menuId} className={`mobile-menu ${menuOpen ? "is-open" : ""}`} aria-label="Mobile">
          <form className="mobile-search" role="search" onSubmit={submitSearch}>
            <label htmlFor="mobile-search-input" className="visually-hidden">
              Search jewellery
            </label>
            <input id="mobile-search-input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search jewellery" />
          </form>
          <ul>
            <li>
              <NavLink to="/shop" className="mobile-menu-link">
                All jewellery
              </NavLink>
            </li>
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className="mobile-menu-link">
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
    </>
  );
}
