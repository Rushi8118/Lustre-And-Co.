import { lazy, Suspense, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { PRODUCTS } from "../data/products";
import Reveal from "../components/Reveal";
import ProductCard from "../components/ProductCard";
import CollectionRail from "../components/CollectionRail";
import Craftsmanship from "../components/Craftsmanship";
import ChooseLight from "../components/ChooseLight";
import ArPreview from "../components/ArPreview";
import { Testimonials, Newsletter, JournalCards } from "../components/Editorial";
import { ViewerLoading } from "../components/Viewer";

const HeroRing = lazy(() => import("../components/HeroRing"));

export default function Home() {
  const [arOpen, setArOpen] = useState(false);
  const closeAr = useCallback(() => setArOpen(false), []);
  const featured = PRODUCTS.filter((product) => product.inStock).slice(0, 4);

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="container hero-grid">
          <Reveal className="hero-copy">
            <p className="eyebrow">Formed by light</p>
            <h1 id="hero-title">Wear the moment.</h1>
            <p className="hero-lede">
              Sculptural jewellery designed to move with you, catch the light, and become part of your story.
            </p>
            <div className="hero-actions">
              <Link to="/collections" className="btn">Explore the collection</Link>
              <Link to="/story" className="btn btn-outline">Discover our story</Link>
            </div>
          </Reveal>

          <div className="hero-visual">
            <Suspense fallback={<ViewerLoading />}>
              <HeroRing onViewInSpace={() => setArOpen(true)} />
            </Suspense>
          </div>
        </div>
        <ArPreview open={arOpen} onClose={closeAr} />
      </section>

      <ChooseLight />

      <section className="section" aria-labelledby="rail-title">
        <div className="container">
          <Reveal>
            <p className="eyebrow">Collections</p>
            <h2 id="rail-title">A collection in motion</h2>
          </Reveal>
        </div>
        <div className="container">
          <CollectionRail />
        </div>
      </section>

      <section className="section" aria-labelledby="featured-title">
        <div className="container">
          <Reveal className="section-head">
            <div>
              <p className="eyebrow">Featured</p>
              <h2 id="featured-title">Pieces to wear now</h2>
            </div>
            <Link to="/shop" className="text-link">View all jewellery <span aria-hidden="true">→</span></Link>
          </Reveal>
          <div className="product-grid">
            {featured.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </div>
      </section>

      <Craftsmanship />

      <section className="section" aria-labelledby="journal-title">
        <div className="container">
          <Reveal>
            <p className="eyebrow">Journal</p>
            <h2 id="journal-title">Notes from the studio</h2>
          </Reveal>
          <JournalCards />
        </div>
      </section>

      <Testimonials />
      <Newsletter />
    </>
  );
}
