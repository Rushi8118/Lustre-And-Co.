// lustre-and-co/src/components/RecommendationSection.jsx
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import RecommendationProductCard from "./RecommendationProductCard";
import { trackRecommendationEvent } from "../services/recommendations";

const SECTION_ICONS = {
  you_may_also_like: "✦",
  frequently_bought_together: "🛍",
  recently_viewed: "🕐",
  similar_products: "◈",
  customers_also_purchased: "★",
  complete_the_look: "◉",
};

/**
 * RecommendationSection
 *
 * Props:
 *   type           – recommendation type key
 *   label          – section heading
 *   products       – array of RecommendationProduct
 *   sourceProductId – product the recommendations are based on (optional)
 *   cardStyle      – "grid" | "scroll" (default "scroll")
 *   maxVisible     – max cards in grid mode (default 4)
 */
export default function RecommendationSection({
  type,
  label,
  products = [],
  sourceProductId,
  cardStyle = "scroll",
  maxVisible = 4,
}) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const trackedRef = useRef(false);

  // Track impressions once on mount
  useEffect(() => {
    if (trackedRef.current || products.length === 0) return;
    trackedRef.current = true;
    products.slice(0, 6).forEach((product, idx) => {
      trackRecommendationEvent({
        sourceProductId,
        recommendedProductId: product.id,
        recommendationType: type,
        eventType: "impression",
        position: idx,
      });
    });
  }, [products, type, sourceProductId]);

  // Scroll arrows state
  useEffect(() => {
    if (cardStyle !== "scroll") return;
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [cardStyle, products]);

  function scroll(direction) {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector(".rec-card")?.offsetWidth ?? 240;
    el.scrollBy({ left: direction * (cardWidth + 16), behavior: "smooth" });
  }

  if (products.length === 0) return null;

  const displayProducts =
    cardStyle === "grid" ? products.slice(0, maxVisible) : products;

  return (
    <section className="rec-section" aria-label={label} id={`rec-section-${type}`}>
      <div className="rec-section-header">
        <div className="rec-section-title-row">
          <span className="rec-section-icon" aria-hidden="true">
            {SECTION_ICONS[type] ?? <Sparkles size={16} />}
          </span>
          <h2 className="rec-section-title">{label}</h2>
        </div>

        {cardStyle === "scroll" && (
          <div className="rec-section-arrows">
            <button
              type="button"
              className="rec-arrow-btn"
              onClick={() => scroll(-1)}
              disabled={!canScrollLeft}
              aria-label="Scroll left"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="rec-arrow-btn"
              onClick={() => scroll(1)}
              disabled={!canScrollRight}
              aria-label="Scroll right"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {cardStyle === "scroll" ? (
        <div className="rec-scroll-track" ref={scrollRef}>
          {displayProducts.map((product, idx) => (
            <div className="rec-scroll-item" key={product.id}>
              <RecommendationProductCard
                product={product}
                recommendationType={type}
                sourceProductId={sourceProductId}
                position={idx}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="rec-grid">
          {displayProducts.map((product, idx) => (
            <RecommendationProductCard
              key={product.id}
              product={product}
              recommendationType={type}
              sourceProductId={sourceProductId}
              position={idx}
            />
          ))}
        </div>
      )}
    </section>
  );
}
