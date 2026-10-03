import { Link } from "react-router-dom";
import { ArrowUpRight, Star } from "lucide-react";
import { motion } from "framer-motion";
import { lazy, Suspense } from "react";
const JewelryShowcase = lazy(() => import("../components/JewelryShowcase"));
import SectionHeading from "../components/SectionHeading";
import ProductGrid from "../components/ProductGrid";
import PromotionalBanner from "../components/PromotionalBanner";
import HeroCarousel from "../components/HeroCarousel";
import { imageUrl } from "../utils/image";
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

  const carouselSlides = [
    {
      key: "brand",
      eyebrow: hero.eyebrow,
      title: [hero.title, hero.highlight].filter(Boolean).join(" "),
      text: hero.subtitle,
      cta: "Shop the collection",
      to: "/shop",
      image: homeCategories.find((category) => category.image)?.image,
    },
    ...homeCategories
      .filter((category) => category.image)
      .slice(0, 5)
      .map((category) => ({
        key: category.slug,
        eyebrow: category.eyebrow,
        title: category.title || category.name,
        text: category.description,
        cta: `Shop ${category.name}`,
        to: `/category/${category.slug}`,
        image: category.image,
      })),
  ];

  return (
    <>
      <HeroCarousel slides={carouselSlides} />

      <section className="showcase-section">
        <div className="container showcase-inner">
          <div className="showcase-copy">
            <span className="eyebrow">Crafted to be seen</span>
            <h2>{hero.title}</h2>
            <p>{hero.subtitle}</p>
          </div>
          <Suspense fallback={<div className="jewelry-showcase-loading" aria-hidden="true" />}>
            <JewelryShowcase />
          </Suspense>
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
                    {category.image && <img src={imageUrl(category.image, 900)} alt={category.name} loading="lazy" />}
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
