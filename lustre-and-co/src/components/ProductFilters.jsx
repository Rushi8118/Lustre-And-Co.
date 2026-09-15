import { useState } from "react";
import {
  SlidersHorizontal,
  X,
  ChevronDown,
  RotateCcw,
  Check,
  Filter
} from "lucide-react";
import { useSettings } from "../context/SettingsContext";

export const filterOptions = {
  categories: [
    { label: "All Categories", value: "all" },
    { label: "Necklaces", value: "necklaces" },
    { label: "Earrings", value: "earrings" },
    { label: "Rings", value: "rings" },
    { label: "Bracelets", value: "bracelets" },
    { label: "Bangles", value: "bangles" }
  ],
  priceRanges: [
    { label: "All Prices", value: "all" },
    { label: "Under ₹1,000", value: "under-1000" },
    { label: "₹1,000 – ₹2,000", value: "1000-2000" },
    { label: "₹2,000 – ₹3,500", value: "2000-3500" },
    { label: "Over ₹3,500", value: "over-3500" }
  ],
  colors: [
    { label: "All Colors", value: "all" },
    { label: "Gold", value: "Gold", hex: "#d6b56d" },
    { label: "Rose Gold", value: "Rose gold", hex: "#c98c82" },
    { label: "Silver", value: "Silver", hex: "#c0c0c0" },
    { label: "Antique Gold", value: "Antique gold", hex: "#b5944b" }
  ],
  materials: [
    { label: "All Materials", value: "all" },
    { label: "Premium Alloy", value: "Premium alloy" },
    { label: "Kundan & Stones", value: "Kundan & stones" },
    { label: "Cubic Zirconia", value: "Cubic zirconia" },
    { label: "Imitation Pearls", value: "Imitation pearls" },
    { label: "Gold-Plated Brass", value: "Gold-plated brass" }
  ],
  occasions: [
    { label: "All Occasions", value: "all" },
    { label: "Everyday Wear", value: "everyday" },
    { label: "Bridal & Wedding", value: "bridal" },
    { label: "Party & Evening", value: "party" },
    { label: "Festive Occasions", value: "festive" }
  ],
  ratings: [
    { label: "All Ratings", value: "all" },
    { label: "★ 4.8 & Above", value: "4.8" },
    { label: "★ 4.5 & Above", value: "4.5" },
    { label: "★ 4.0 & Above", value: "4.0" }
  ],
  availabilities: [
    { label: "All Items", value: "all" },
    { label: "In Stock Only", value: "in-stock" }
  ],
  discounts: [
    { label: "Any Price", value: "all" },
    { label: "20% Off or More", value: "20" },
    { label: "25% Off or More", value: "25" },
    { label: "30% Off or More", value: "30" }
  ]
};

export default function ProductFilters({
  filters,
  setFilters,
  mobileOpen,
  setMobileOpen,
  totalResults = 0,
  isSidebar = true
}) {
  const { categories } = useSettings();
  const categoryOptions = [
    { label: "All Categories", value: "all" },
    ...categories.map((category) => ({ label: category.name, value: category.slug }))
  ];

  // Accordion expand/collapse states (all open by default for clear visibility)
  const [openSections, setOpenSections] = useState({
    category: true,
    price: true,
    color: true,
    material: true,
    occasion: true,
    rating: true,
    availability: true,
    discount: true
  });

  function toggleSection(section) {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section]
    }));
  }

  function updateFilter(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value
    }));
  }

  function resetFilters() {
    setFilters({
      category: "all",
      price: "all",
      color: "all",
      material: "all",
      occasion: "all",
      rating: "all",
      availability: "all",
      discount: "all",
      sort: filters.sort || "recommended"
    });
  }

  // Count how many non-default filters are active
  const activeFilterCount = Object.entries(filters).filter(([key, val]) => {
    if (key === "sort") return false;
    return val !== "all" && val !== "";
  }).length;

  const content = (
    <div className="filters-scroll-area">
      {/* 1. CATEGORY FILTER */}
      <div className="filter-accordion">
        <button
          type="button"
          className="filter-accordion-header"
          onClick={() => toggleSection("category")}
          aria-expanded={openSections.category}
        >
          <span>Category</span>
          <ChevronDown
            size={16}
            className={`accordion-chevron ${openSections.category ? "is-open" : ""}`}
          />
        </button>

        {openSections.category && (
          <div className="filter-accordion-body">
            {categoryOptions.map((opt) => (
              <label key={opt.value} className="filter-radio-pill">
                <input
                  type="radio"
                  name={`category-${isSidebar ? "side" : "mob"}`}
                  value={opt.value}
                  checked={filters.category === opt.value}
                  onChange={(e) => updateFilter("category", e.target.value)}
                />
                <span className="radio-custom" />
                <span className="radio-label">{opt.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* 2. PRICE RANGE FILTER */}
      <div className="filter-accordion">
        <button
          type="button"
          className="filter-accordion-header"
          onClick={() => toggleSection("price")}
          aria-expanded={openSections.price}
        >
          <span>Price Range</span>
          <ChevronDown
            size={16}
            className={`accordion-chevron ${openSections.price ? "is-open" : ""}`}
          />
        </button>

        {openSections.price && (
          <div className="filter-accordion-body">
            {filterOptions.priceRanges.map((opt) => (
              <label key={opt.value} className="filter-radio-pill">
                <input
                  type="radio"
                  name={`price-${isSidebar ? "side" : "mob"}`}
                  value={opt.value}
                  checked={filters.price === opt.value}
                  onChange={(e) => updateFilter("price", e.target.value)}
                />
                <span className="radio-custom" />
                <span className="radio-label">{opt.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* 3. COLOR FILTER */}
      <div className="filter-accordion">
        <button
          type="button"
          className="filter-accordion-header"
          onClick={() => toggleSection("color")}
          aria-expanded={openSections.color}
        >
          <span>Color &amp; Finish</span>
          <ChevronDown
            size={16}
            className={`accordion-chevron ${openSections.color ? "is-open" : ""}`}
          />
        </button>

        {openSections.color && (
          <div className="filter-accordion-body">
            {filterOptions.colors.map((opt) => (
              <label key={opt.value} className="filter-radio-pill">
                <input
                  type="radio"
                  name={`color-${isSidebar ? "side" : "mob"}`}
                  value={opt.value}
                  checked={filters.color === opt.value}
                  onChange={(e) => updateFilter("color", e.target.value)}
                />
                <span className="radio-custom" />
                {opt.hex && (
                  <span
                    className="color-swatch-dot"
                    style={{ backgroundColor: opt.hex }}
                  />
                )}
                <span className="radio-label">{opt.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* 4. MATERIAL FILTER */}
      <div className="filter-accordion">
        <button
          type="button"
          className="filter-accordion-header"
          onClick={() => toggleSection("material")}
          aria-expanded={openSections.material}
        >
          <span>Material</span>
          <ChevronDown
            size={16}
            className={`accordion-chevron ${openSections.material ? "is-open" : ""}`}
          />
        </button>

        {openSections.material && (
          <div className="filter-accordion-body">
            {filterOptions.materials.map((opt) => (
              <label key={opt.value} className="filter-radio-pill">
                <input
                  type="radio"
                  name={`material-${isSidebar ? "side" : "mob"}`}
                  value={opt.value}
                  checked={filters.material === opt.value}
                  onChange={(e) => updateFilter("material", e.target.value)}
                />
                <span className="radio-custom" />
                <span className="radio-label">{opt.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* 5. OCCASION FILTER */}
      <div className="filter-accordion">
        <button
          type="button"
          className="filter-accordion-header"
          onClick={() => toggleSection("occasion")}
          aria-expanded={openSections.occasion}
        >
          <span>Occasion</span>
          <ChevronDown
            size={16}
            className={`accordion-chevron ${openSections.occasion ? "is-open" : ""}`}
          />
        </button>

        {openSections.occasion && (
          <div className="filter-accordion-body">
            {filterOptions.occasions.map((opt) => (
              <label key={opt.value} className="filter-radio-pill">
                <input
                  type="radio"
                  name={`occasion-${isSidebar ? "side" : "mob"}`}
                  value={opt.value}
                  checked={filters.occasion === opt.value}
                  onChange={(e) => updateFilter("occasion", e.target.value)}
                />
                <span className="radio-custom" />
                <span className="radio-label">{opt.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* 6. RATING FILTER */}
      <div className="filter-accordion">
        <button
          type="button"
          className="filter-accordion-header"
          onClick={() => toggleSection("rating")}
          aria-expanded={openSections.rating}
        >
          <span>Customer Rating</span>
          <ChevronDown
            size={16}
            className={`accordion-chevron ${openSections.rating ? "is-open" : ""}`}
          />
        </button>

        {openSections.rating && (
          <div className="filter-accordion-body">
            {filterOptions.ratings.map((opt) => (
              <label key={opt.value} className="filter-radio-pill">
                <input
                  type="radio"
                  name={`rating-${isSidebar ? "side" : "mob"}`}
                  value={opt.value}
                  checked={filters.rating === opt.value}
                  onChange={(e) => updateFilter("rating", e.target.value)}
                />
                <span className="radio-custom" />
                <span className="radio-label">{opt.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* 7. AVAILABILITY FILTER */}
      <div className="filter-accordion">
        <button
          type="button"
          className="filter-accordion-header"
          onClick={() => toggleSection("availability")}
          aria-expanded={openSections.availability}
        >
          <span>Availability</span>
          <ChevronDown
            size={16}
            className={`accordion-chevron ${openSections.availability ? "is-open" : ""}`}
          />
        </button>

        {openSections.availability && (
          <div className="filter-accordion-body">
            {filterOptions.availabilities.map((opt) => (
              <label key={opt.value} className="filter-radio-pill">
                <input
                  type="radio"
                  name={`availability-${isSidebar ? "side" : "mob"}`}
                  value={opt.value}
                  checked={filters.availability === opt.value}
                  onChange={(e) => updateFilter("availability", e.target.value)}
                />
                <span className="radio-custom" />
                <span className="radio-label">{opt.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* 8. DISCOUNT FILTER */}
      <div className="filter-accordion">
        <button
          type="button"
          className="filter-accordion-header"
          onClick={() => toggleSection("discount")}
          aria-expanded={openSections.discount}
        >
          <span>Discount &amp; Offers</span>
          <ChevronDown
            size={16}
            className={`accordion-chevron ${openSections.discount ? "is-open" : ""}`}
          />
        </button>

        {openSections.discount && (
          <div className="filter-accordion-body">
            {filterOptions.discounts.map((opt) => (
              <label key={opt.value} className="filter-radio-pill">
                <input
                  type="radio"
                  name={`discount-${isSidebar ? "side" : "mob"}`}
                  value={opt.value}
                  checked={filters.discount === opt.value}
                  onChange={(e) => updateFilter("discount", e.target.value)}
                />
                <span className="radio-custom" />
                <span className="radio-label">{opt.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // If this is the desktop sidebar
  if (isSidebar) {
    return (
      <aside className="desktop-filters-sidebar" aria-label="Product filters">
        <div className="sidebar-filters-header">
          <div className="sidebar-title-group">
            <Filter size={16} />
            <h3>Filters</h3>
            {activeFilterCount > 0 && (
              <span className="active-filters-badge">{activeFilterCount}</span>
            )}
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              className="clear-filters-link"
              onClick={resetFilters}
            >
              Clear All
            </button>
          )}
        </div>

        {content}
      </aside>
    );
  }

  // Otherwise, render mobile slide-out drawer
  return (
    <>
      <div
        className={`mobile-filter-drawer-overlay ${mobileOpen ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Filter products drawer"
      >
        {/* Backdrop */}
        <div
          className="mobile-filter-backdrop"
          onClick={() => setMobileOpen(false)}
        />

        {/* Slide-out Drawer Panel */}
        <div className="mobile-filter-panel">
          {/* Header */}
          <div className="mobile-drawer-header">
            <div className="drawer-title-group">
              <SlidersHorizontal size={18} />
              <h3>Filters &amp; Refinements</h3>
              {activeFilterCount > 0 && (
                <span className="active-filters-badge">{activeFilterCount}</span>
              )}
            </div>

            <button
              type="button"
              className="mobile-drawer-close"
              onClick={() => setMobileOpen(false)}
              aria-label="Close filters drawer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="mobile-drawer-body">{content}</div>

          {/* Sticky Bottom Actions Bar with "Apply Filters" Button */}
          <div className="mobile-drawer-footer">
            <button
              type="button"
              className="drawer-reset-btn"
              onClick={resetFilters}
              disabled={activeFilterCount === 0}
            >
              Reset
            </button>

            <button
              type="button"
              className="button button-dark drawer-apply-btn"
              onClick={() => setMobileOpen(false)}
            >
              <span>Apply Filters</span>
              {totalResults > 0 && (
                <span className="drawer-apply-count">({totalResults} items)</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}