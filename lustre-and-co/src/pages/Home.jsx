import { Link } from "react-router-dom";
import { ArrowUpRight, Star } from "lucide-react";
import { motion } from "framer-motion";
import ThreeHero from "../components/ThreeHero";
import SectionHeading from "../components/SectionHeading";
import ProductGrid from "../components/ProductGrid";
import PromotionalBanner from "../components/PromotionalBanner";
import WhyShopWithUs from "../components/WhyShopWithUs";
import { useSettings } from "../context/SettingsContext";
import { useStore } from "../context/StoreContext";

function ProductSection({ status, products, emptyText }) {
  if (status === "loading") return <p className="catalog-loading">Loading pieces…</p>;
  if (status === "error") return <p className="inline-alert inline-alert-error">Products could not be loaded.</p>;
  if (!products.length) return <p className="catalog-loading">{emptyText}</p>;
  return <ProductGrid products={products} />;
}

export default function Home() {
  const { settings, categories } = useSettings();
  const { products, productsStatus } = useStore();
  const { hero, categoriesSection, newArrivalsSection, bestSellersSection, editorial, testimonial } =
    settings.homepage;
  const { stats, commerce } = settings;

  const homeCategories = categories.filter((category) => category.showOnHome);
  const newProducts = products.filter((product) => product.tags.includes("new")).slice(0, 4);
  const tagged = products.filter((product) => product.tags.includes("bestseller"));
  const bestProducts = (tagged.length ? tagged : [...products].sort((a, b) => b.salesCount - a.salesCount)).slice(0, 4);

  return (
    <>
      <section className="home-hero">
        <div className="home-hero-noise" />
        <div className="container home-hero-grid">
          <motion.div
            className="home-hero-copy"
            initial={{ opacity: 0, x: -25 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="eyebrow">{hero.eyebrow}</span>
            <h1>
              {hero.title} {hero.highlight && <em>{hero.highlight}</em>}
            </h1>
            <p>{hero.subtitle}</p>

            <div className="hero-actions">
              {hero.primaryCtaLabel && (
                <Link to={hero.primaryCtaLink || "/shop"} className="button button-dark">
                  {hero.primaryCtaLabel}
                  <ArrowUpRight size={17} />
                </Link>
              )}
              {hero.secondaryCtaLabel && (
                <Link to={hero.secondaryCtaLink || "/shop"} className="text-link">
                  {hero.secondaryCtaLabel}
                </Link>
              )}
            </div>

            {stats.reviewCount > 0 && (
              <div className="hero-proof">
                <div className="hero-proof-avatars" aria-hidden="true">
                  <span>
                    <Star size={13} fill="currentColor" />
                  </span>
                </div>
                <div>
                  <strong>
                    {stats.averageRating}/5 from {stats.reviewCount} {stats.reviewCount === 1 ? "review" : "reviews"}
                  </strong>
                  <small>Rated by customers who wear our pieces.</small>
                </div>
              </div>
            )}
          </motion.div>

          <motion.div
            className="home-hero-visual"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.15 }}
          >
            <div className="hero-visual-ring hero-ring-one" />
            <div className="hero-visual-ring hero-ring-two" />
            {hero.cardTitle && (
              <div className="hero-visual-card">
                <span className="eyebrow">{hero.cardEyebrow}</span>
                <strong>{hero.cardTitle}</strong>
                <small>{hero.cardText}</small>
              </div>
            )}
            <ThreeHero />
          </motion.div>
        </div>
      </section>

      <WhyShopWithUs />

      {homeCategories.length > 0 && (
        <section className="section home-section">
          <div className="container">
            <SectionHeading
              eyebrow={categoriesSection.eyebrow}
              title={categoriesSection.title}
              description={categoriesSection.description}
              linkLabel="Shop all jewelry"
              linkTo="/shop"
            />

            <div className="category-card-grid">
              {homeCategories.map((category, index) => (
                <motion.div
                  key={category.slug}
                  className="category-card"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.06 }}
                >
                  <Link to={`/category/${category.slug}`}>
                    {category.image && <img src={category.image} alt={category.name} loading="lazy" />}
                    <div className="category-card-overlay">
                      <h3>{category.name}</h3>
                      <span>Explore collection →</span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section home-section section-beige">
        <div className="container">
          <SectionHeading
            eyebrow={newArrivalsSection.eyebrow}
            title={newArrivalsSection.title}
            description={newArrivalsSection.description}
            linkLabel="View all new arrivals"
            linkTo="/new-arrivals"
          />
          <ProductSection status={productsStatus} products={newProducts} emptyText="New pieces are on their way." />
        </div>
      </section>

      {editorial.enabled && (
        <section className="editorial-banner">
          <div className="container editorial-banner-inner">
            <div className="editorial-banner-copy">
              <span className="eyebrow">{editorial.eyebrow}</span>
              <h2>{editorial.title}</h2>
              <p>{editorial.text}</p>
              {editorial.ctaLabel && (
                <Link to={editorial.ctaLink || "/shop"} className="button button-light">
                  {editorial.ctaLabel}
                  <ArrowUpRight size={17} />
                </Link>
              )}
            </div>

            {editorial.image && (
              <div className="editorial-banner-image">
                <img src={editorial.image} alt={editorial.eyebrow} loading="lazy" />
              </div>
            )}
          </div>
        </section>
      )}

      <section className="section home-section">
        <div className="container">
          <SectionHeading
            eyebrow={bestSellersSection.eyebrow}
            title={bestSellersSection.title}
            description={bestSellersSection.description}
            linkLabel="Shop best sellers"
            linkTo="/best-sellers"
          />
          <ProductSection status={productsStatus} products={bestProducts} emptyText="Best sellers will appear here." />
        </div>
      </section>

      <PromotionalBanner />

      {testimonial.enabled && (
        <section className="testimonial-section">
          <div className="container testimonial-layout">
            <div>
              <span className="eyebrow">{testimonial.eyebrow}</span>
              <h2>“{testimonial.quote}”</h2>
              {testimonial.author && <span className="testimonial-author">— {testimonial.author}</span>}
            </div>

            <div className="testimonial-stats">
              <div>
                <strong>{stats.averageRating ?? "—"}</strong>
                <span>
                  Average rating{stats.reviewCount ? ` (${stats.reviewCount})` : ""}
                </span>
              </div>
              <div>
                <strong>{stats.customerCount.toLocaleString()}</strong>
                <span>Registered customers</span>
              </div>
              <div>
                <strong>{commerce.returnWindowDays} days</strong>
                <span>Easy returns</span>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
