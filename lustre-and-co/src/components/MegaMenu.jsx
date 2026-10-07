import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { categoryMenuLinks, UTILITY_NAV } from "../data/menuConfig";
import SmartImage from "./SmartImage";

/** Categories shown in the bar; the rest sit under More so the bar stays one short row. */
const VISIBLE_CATEGORIES = 7;

const HIDDEN_MARKER = { left: 0, width: 0, shown: false };

/**
 * One scrolling row of categories under the header. Hovering, focusing or tapping a
 * category opens a panel below the row with its links and a featured card.
 *
 * A single gold marker glides between items rather than each item drawing its own
 * underline, and a small diamond on the panel points back at the open category.
 * Escape or a click outside closes it. Class names use the `cat-bar` prefix so they
 * never collide with the older `.mega-menu` styles.
 */
export default function MegaMenu({ categories, showAdmin = false }) {
  const [openSlug, setOpenSlug] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [marker, setMarker] = useState(HIDDEN_MARKER);
  const [notchX, setNotchX] = useState(null);
  const barRef = useRef(null);
  const reduceMotion = useReducedMotion();

  const menuCategories = categories.filter((category) => category.showInMenu);
  const openCategory = menuCategories.find((category) => category.slug === openSlug);
  const overflowCategories = menuCategories.slice(VISIBLE_CATEGORIES);

  /** Slides the gold marker under the hovered item, and points the panel notch at it. */
  const moveMarker = useCallback((listItem) => {
    const link = listItem?.querySelector(".cat-bar-link");
    if (!link) return;
    setMarker({ left: link.offsetLeft, width: link.offsetWidth, shown: true });
    if (barRef.current) {
      const linkRect = link.getBoundingClientRect();
      const barRect = barRef.current.getBoundingClientRect();
      setNotchX(linkRect.left - barRect.left + linkRect.width / 2);
    }
  }, []);

  const closeAll = useCallback(() => {
    setOpenSlug(null);
    setMarker((current) => ({ ...current, shown: false }));
  }, []);

  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape") {
        closeAll();
        setMoreOpen(false);
      }
    }
    function handleClickAway(event) {
      if (barRef.current && !barRef.current.contains(event.target)) {
        closeAll();
        setMoreOpen(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClickAway);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClickAway);
    };
  }, [closeAll]);

  return (
    <nav className="cat-bar" aria-label="Shop categories" ref={barRef} onMouseLeave={closeAll}>
      <ul className="cat-bar-list container">
        <span
          className={`cat-bar-marker ${marker.shown ? "is-shown" : ""}`}
          style={{ transform: `translateX(${marker.left}px)`, width: `${marker.width}px` }}
          aria-hidden="true"
        />

        <li onMouseEnter={(event) => moveMarker(event.currentTarget)}>
          <NavLink className="cat-bar-link" to="/shop" onFocus={(event) => moveMarker(event.currentTarget.parentElement)}>
            All Jewellery
          </NavLink>
        </li>

        {menuCategories.slice(0, VISIBLE_CATEGORIES).map((category) => {
          const isOpen = openSlug === category.slug;
          return (
            <li
              key={category.slug}
              onMouseEnter={(event) => {
                setOpenSlug(category.slug);
                moveMarker(event.currentTarget);
              }}
            >
              <button
                type="button"
                className={`cat-bar-link cat-bar-trigger ${isOpen ? "is-open" : ""}`}
                aria-expanded={isOpen}
                aria-controls="cat-bar-panel"
                onFocus={(event) => {
                  setOpenSlug(category.slug);
                  moveMarker(event.currentTarget.parentElement);
                }}
                onClick={() => setOpenSlug(isOpen ? null : category.slug)}
              >
                {category.name}
                <ChevronDown size={13} aria-hidden="true" />
              </button>
            </li>
          );
        })}

        {overflowCategories.length > 0 && (
          <li onMouseEnter={(event) => moveMarker(event.currentTarget)}>
            <button
              type="button"
              className={`cat-bar-link cat-bar-trigger ${moreOpen ? "is-open" : ""}`}
              aria-expanded={moreOpen}
              onFocus={(event) => moveMarker(event.currentTarget.parentElement)}
              onClick={() => {
                setOpenSlug(null);
                setMoreOpen((open) => !open);
              }}
            >
              More
              <ChevronDown size={13} aria-hidden="true" />
            </button>
          </li>
        )}

        {UTILITY_NAV.map((item) => (
          <li key={item.to} onMouseEnter={(event) => moveMarker(event.currentTarget)}>
            <NavLink className="cat-bar-link" to={item.to} onFocus={(event) => moveMarker(event.currentTarget.parentElement)}>
              {item.label}
            </NavLink>
          </li>
        ))}

        {showAdmin && (
          <li onMouseEnter={(event) => moveMarker(event.currentTarget)}>
            <NavLink className="cat-bar-link" to="/admin">
              Admin
            </NavLink>
          </li>
        )}
      </ul>

      {moreOpen && overflowCategories.length > 0 && (
        <div className="cat-more-list" role="menu">
          {overflowCategories.map((category) => (
            <Link key={category.slug} to={`/category/${category.slug}`} role="menuitem" onClick={() => setMoreOpen(false)}>
              {category.name}
            </Link>
          ))}
        </div>
      )}

      {openCategory && (
        <motion.div
          className="cat-panel"
          id="cat-bar-panel"
          initial={reduceMotion ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.2, 0.75, 0.25, 1] }}
        >
          {notchX !== null && <span className="cat-panel-notch" style={{ left: `${notchX}px` }} aria-hidden="true" />}

          <div className="cat-panel-inner container">
            <div className="cat-panel-links">
              <span className="cat-panel-eyebrow">Shop {openCategory.name}</span>
              <ul>
                {categoryMenuLinks(openCategory).map((link, index) => (
                  <motion.li
                    key={link.to + link.label}
                    initial={reduceMotion ? false : { opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: reduceMotion ? 0 : 0.04 * index }}
                  >
                    <Link to={link.to} onClick={closeAll}>
                      {link.label}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </div>

            {openCategory.image && (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: reduceMotion ? 0 : 0.1 }}
              >
                <Link to={`/category/${openCategory.slug}`} className="cat-panel-feature" onClick={closeAll}>
                  <SmartImage src={openCategory.image} alt="" width={800} />
                  <div>
                    <strong>{openCategory.title || openCategory.name}</strong>
                    {openCategory.description && <span>{openCategory.description}</span>}
                    <em>Shop now →</em>
                  </div>
                </Link>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </nav>
  );
}
