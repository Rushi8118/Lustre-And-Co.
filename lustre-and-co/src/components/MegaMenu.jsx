import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { categoryMenuLinks, UTILITY_NAV } from "../data/menuConfig";

/**
 * One scrolling row of categories under the header. Hovering, focusing or tapping a
 * category opens a panel below the row with its links and a featured card.
 * Escape or a click outside closes it. Class names use the `cat-bar` prefix so they
 * never collide with the older `.mega-menu` styles.
 */
export default function MegaMenu({ categories, showAdmin = false }) {
  const [openSlug, setOpenSlug] = useState(null);
  const barRef = useRef(null);
  const menuCategories = categories.filter((category) => category.showInMenu);
  const openCategory = menuCategories.find((category) => category.slug === openSlug);

  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape") setOpenSlug(null);
    }
    function handleClickAway(event) {
      if (barRef.current && !barRef.current.contains(event.target)) setOpenSlug(null);
    }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClickAway);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClickAway);
    };
  }, []);

  return (
    <nav className="cat-bar" aria-label="Shop categories" ref={barRef} onMouseLeave={() => setOpenSlug(null)}>
      <ul className="cat-bar-list container">
        <li>
          <NavLink className="cat-bar-link" to="/shop">
            All Jewellery
          </NavLink>
        </li>

        {menuCategories.map((category) => {
          const isOpen = openSlug === category.slug;
          return (
            <li key={category.slug} onMouseEnter={() => setOpenSlug(category.slug)}>
              <button
                type="button"
                className={`cat-bar-link cat-bar-trigger ${isOpen ? "is-open" : ""}`}
                aria-expanded={isOpen}
                aria-controls="cat-bar-panel"
                onFocus={() => setOpenSlug(category.slug)}
                onClick={() => setOpenSlug(isOpen ? null : category.slug)}
              >
                {category.name}
                <ChevronDown size={13} aria-hidden="true" />
              </button>
            </li>
          );
        })}

        {UTILITY_NAV.map((item) => (
          <li key={item.to}>
            <NavLink className="cat-bar-link" to={item.to}>
              {item.label}
            </NavLink>
          </li>
        ))}

        {showAdmin && (
          <li>
            <NavLink className="cat-bar-link" to="/admin">
              Admin
            </NavLink>
          </li>
        )}
      </ul>

      {openCategory && (
        <div className="cat-panel" id="cat-bar-panel">
          <div className="cat-panel-inner container">
            <div className="cat-panel-links">
              <span className="cat-panel-eyebrow">Shop {openCategory.name}</span>
              <ul>
                {categoryMenuLinks(openCategory).map((link) => (
                  <li key={link.to + link.label}>
                    <Link to={link.to} onClick={() => setOpenSlug(null)}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {openCategory.image && (
              <Link to={`/category/${openCategory.slug}`} className="cat-panel-feature" onClick={() => setOpenSlug(null)}>
                <img src={openCategory.image} alt="" loading="lazy" />
                <div>
                  <strong>{openCategory.title || openCategory.name}</strong>
                  {openCategory.description && <span>{openCategory.description}</span>}
                  <em>Shop now →</em>
                </div>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
