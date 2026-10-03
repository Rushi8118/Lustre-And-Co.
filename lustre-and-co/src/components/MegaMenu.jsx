import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { categoryMenuLinks, UTILITY_NAV } from "../data/menuConfig";

/**
 * Full-width category bar under the header. Hovering or focusing a category opens a
 * panel with its links and a featured card. Touch users tap to open; Escape closes.
 */
export default function MegaMenu({ categories, showAdmin = false }) {
  const [openSlug, setOpenSlug] = useState(null);
  const navRef = useRef(null);
  const menuCategories = categories.filter((category) => category.showInMenu);

  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape") setOpenSlug(null);
    }
    function handleClickAway(event) {
      if (navRef.current && !navRef.current.contains(event.target)) setOpenSlug(null);
    }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClickAway);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClickAway);
    };
  }, []);

  return (
    <nav className="mega-menu" aria-label="Shop categories" ref={navRef}>
      <div className="mega-menu-inner container">
        <ul className="mega-menu-list">
          <li>
            <NavLink className="mega-menu-link" to="/shop">
              All Jewellery
            </NavLink>
          </li>

          {menuCategories.map((category) => {
            const isOpen = openSlug === category.slug;
            return (
              <li
                key={category.slug}
                className="mega-menu-item"
                onMouseEnter={() => setOpenSlug(category.slug)}
                onMouseLeave={() => setOpenSlug(null)}
                onFocus={() => setOpenSlug(category.slug)}
              >
                <button
                  type="button"
                  className={`mega-menu-link mega-menu-trigger ${isOpen ? "is-open" : ""}`}
                  aria-expanded={isOpen}
                  aria-controls={`mega-panel-${category.slug}`}
                  onClick={() => setOpenSlug(isOpen ? null : category.slug)}
                >
                  {category.name}
                  <ChevronDown size={14} aria-hidden="true" />
                </button>

                {isOpen && (
                  <div className="mega-panel" id={`mega-panel-${category.slug}`}>
                    <div className="mega-panel-inner container">
                      <div className="mega-panel-links">
                        <span className="mega-panel-eyebrow">Shop {category.name}</span>
                        <ul>
                          {categoryMenuLinks(category).map((link) => (
                            <li key={link.to + link.label}>
                              <Link to={link.to} onClick={() => setOpenSlug(null)}>
                                {link.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {category.image && (
                        <Link
                          to={`/category/${category.slug}`}
                          className="mega-panel-feature"
                          onClick={() => setOpenSlug(null)}
                        >
                          <img src={category.image} alt="" loading="lazy" />
                          <div>
                            <strong>{category.title || category.name}</strong>
                            {category.description && <span>{category.description}</span>}
                            <em>Shop now →</em>
                          </div>
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}

          {UTILITY_NAV.map((item) => (
            <li key={item.to}>
              <NavLink className="mega-menu-link" to={item.to}>
                {item.label}
              </NavLink>
            </li>
          ))}
          {showAdmin && (
            <li>
              <NavLink className="mega-menu-link" to="/admin">
                Admin
              </NavLink>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}
