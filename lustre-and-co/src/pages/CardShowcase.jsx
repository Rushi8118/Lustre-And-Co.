import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Smartphone,
  Monitor,
  Heart,
  ShoppingBag,
  Eye,
  CheckCircle2,
  Percent,
  Star,
  Layers,
  ArrowRight
} from "lucide-react";
import ProductCard from "../components/ProductCard";
import PromotionalBanner from "../components/PromotionalBanner";
import WhyShopWithUs from "../components/WhyShopWithUs";
import PageIntro from "../components/PageIntro";
import { useStore } from "../context/StoreContext";

export default function CardShowcase() {
  const { products } = useStore();
  const [deviceView, setDeviceView] = useState("desktop"); // 'desktop' or 'mobile'
  const [filterBadge, setFilterBadge] = useState("all");

  if (products.length < 4) return null;

  // Sample items representing New, Bestseller, Sale
  const bestsellerProduct = products.find((p) => p.badge === "Bestseller") || products[0];
  const newProduct = products.find((p) => p.badge === "New") || products[1];
  
  // Create a dedicated Sale product if not explicitly tagged
  const saleProduct = {
    ...products[2],
    badge: "Sale",
    oldPrice: 1299,
    price: 849
  };

  const showcaseProducts = [
    { ...bestsellerProduct, badge: "Bestseller" },
    { ...newProduct, badge: "New" },
    saleProduct,
    products[3]
  ];

  const filteredProducts =
    filterBadge === "all"
      ? products.slice(0, 8)
      : products.filter(
          (p) =>
            p.badge?.toLowerCase() === filterBadge.toLowerCase() ||
            (filterBadge === "sale" && p.oldPrice && p.oldPrice > p.price)
        );

  return (
    <div className="card-showcase-page">
      <PageIntro
        eyebrow="Design System & Component Gallery"
        title="Lustre & Co. Product Card"
        description="A mastercrafted, reusable product card engineered with luxury aesthetics, tactile micro-interactions, responsive mobile touch optimization, and fluid state management."
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Product Card Component" }
        ]}
      />

      {/* Feature Verification Grid */}
      <section className="section showcase-features-section">
        <div className="container">
          <div className="showcase-metrics-banner">
            <div className="metric-item">
              <CheckCircle2 size={18} className="metric-icon" />
              <div>
                <strong>Large Product Image</strong>
                <span>0.82 luxury ratio with smooth hover zoom & lifestyle switch</span>
              </div>
            </div>

            <div className="metric-item">
              <Heart size={18} className="metric-icon" />
              <div>
                <strong>Wishlist Heart Icon</strong>
                <span>Top-right glassmorphic button with ruby color toggle</span>
              </div>
            </div>

            <div className="metric-item">
              <Sparkles size={18} className="metric-icon" />
              <div>
                <strong>Luxury Badges</strong>
                <span>Distinct New, Bestseller, and Sale editorial badges</span>
              </div>
            </div>

            <div className="metric-item">
              <Star size={18} className="metric-icon" />
              <div>
                <strong>Rating & Reviews</strong>
                <span>Golden star cluster + numeric rating + review count</span>
              </div>
            </div>

            <div className="metric-item">
              <Percent size={18} className="metric-icon" />
              <div>
                <strong>Price & Discount</strong>
                <span>Current price, strikethrough original, and discount % pill</span>
              </div>
            </div>

            <div className="metric-item">
              <Eye size={18} className="metric-icon" />
              <div>
                <strong>Quick View & Bag</strong>
                <span>Hover reveal + mobile touch strip + modal preview</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Badge Trio Showcase: New, Bestseller, Sale */}
      <section className="section showcase-trio-section">
        <div className="container">
          <div className="section-head-minimal">
            <div>
              <span className="eyebrow">Badge Variations</span>
              <h2 className="section-title">The Three Core Badge States</h2>
            </div>
            <p className="section-subtitle">
              Inspect the visual distinction between <strong>New</strong> (champagne pearl), <strong>Bestseller</strong> (obsidian foil), and <strong>Sale</strong> (terracotta ruby), along with automatic discount calculation.
            </p>
          </div>

          <div className="showcase-trio-grid">
            <div className="trio-column">
              <div className="trio-badge-label">
                <span className="sample-badge badge-new">New</span>
                <span>Fresh seasonal arrival</span>
              </div>
              <ProductCard product={{ ...newProduct, badge: "New" }} />
            </div>

            <div className="trio-column">
              <div className="trio-badge-label">
                <span className="sample-badge badge-bestseller">Bestseller</span>
                <span>Client favorite signature piece</span>
              </div>
              <ProductCard product={{ ...bestsellerProduct, badge: "Bestseller" }} />
            </div>

            <div className="trio-column">
              <div className="trio-badge-label">
                <span className="sample-badge badge-sale">Sale</span>
                <span>Special seasonal discount</span>
              </div>
              <ProductCard product={saleProduct} />
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Responsive Device Simulator */}
      <section className="section showcase-interactive-section">
        <div className="container">
          <div className="showcase-controls-bar">
            <div className="controls-left">
              <span className="controls-heading">Viewport & Device Mode</span>
              <div className="device-switcher">
                <button
                  type="button"
                  className={`device-btn ${deviceView === "desktop" ? "is-active" : ""}`}
                  onClick={() => setDeviceView("desktop")}
                >
                  <Monitor size={15} />
                  <span>Desktop (Grid)</span>
                </button>
                <button
                  type="button"
                  className={`device-btn ${deviceView === "mobile" ? "is-active" : ""}`}
                  onClick={() => setDeviceView("mobile")}
                >
                  <Smartphone size={15} />
                  <span>Mobile Touch (390px)</span>
                </button>
              </div>
            </div>

            <div className="controls-right">
              <span className="controls-heading">Filter Badge State</span>
              <div className="badge-filter-group">
                {["all", "new", "bestseller", "sale"].map((badge) => (
                  <button
                    key={badge}
                    type="button"
                    className={`filter-pill ${filterBadge === badge ? "is-active" : ""}`}
                    onClick={() => setFilterBadge(badge)}
                  >
                    {badge.charAt(0).toUpperCase() + badge.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Simulation Frame */}
          <div className={`showcase-preview-frame ${deviceView === "mobile" ? "is-mobile-frame" : ""}`}>
            {deviceView === "mobile" && (
              <div className="mobile-frame-header">
                <div className="mobile-notch" />
                <span className="mobile-header-title">Lustre & Co. • Mobile Touch View</span>
                <span className="mobile-touch-hint">Touch-optimized action buttons visible</span>
              </div>
            )}

            <div className={`product-grid ${deviceView === "mobile" ? "mobile-product-grid" : ""}`}>
              {filteredProducts.map((product, idx) => (
                <ProductCard key={`${deviceView}-${product.id}-${idx}`} product={product} index={idx} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Promotional Banner Showcase */}
      <PromotionalBanner />

      {/* Why Shop With Us - Five Benefit Cards */}
      <WhyShopWithUs />

      {/* Interaction States Guide */}
      <section className="section showcase-guide-section">
        <div className="container">
          <div className="guide-card">
            <h3 className="guide-title">Interaction State Specifications</h3>
            <div className="guide-grid">
              <div className="guide-item">
                <div className="guide-item-header">
                  <span className="guide-step">01</span>
                  <h4>Image Zoom on Hover</h4>
                </div>
                <p>
                  Cursor entrance gently scales the primary visual by <code>scale(1.08)</code> using hardware-accelerated cubic-bezier curves (0.65s transition). If an alternate model shot exists, it cross-fades smoothly.
                </p>
              </div>

              <div className="guide-item">
                <div className="guide-item-header">
                  <span className="guide-step">02</span>
                  <h4>Add to Bag & Quick View on Hover</h4>
                </div>
                <p>
                  On desktop, action triggers are tucked away to keep the editorial presentation clean, sliding into view on hover. On mobile touch displays, comfortable 44px tap targets are provided to eliminate hover friction.
                </p>
              </div>

              <div className="guide-item">
                <div className="guide-item-header">
                  <span className="guide-step">03</span>
                  <h4>Heart Icon Color Change</h4>
                </div>
                <p>
                  Wishlist toggle features a spring bounce micro-interaction. Active state transforms the heart icon from clear outline to vibrant crimson/rose with a delicate rose-glow background.
                </p>
              </div>

              <div className="guide-item">
                <div className="guide-item-header">
                  <span className="guide-step">04</span>
                  <h4>Loading State & Rich Toast</h4>
                </div>
                <p>
                  Clicking &ldquo;Add to Bag&rdquo; activates an inline spinning loader and temporary button disablement. Upon completion, a confirmation checkmark flashes and a rich notification toast appears with thumbnail and quick bag access.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
