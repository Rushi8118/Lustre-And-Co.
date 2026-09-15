import { Link } from "react-router-dom";
import PageIntro from "../components/PageIntro";
import ProductGrid from "../components/ProductGrid";
import { useStore } from "../context/StoreContext";

export default function Wishlist() {
  const { wishlist, products, authReady, productsStatus } = useStore();

  const trending = [...products].sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0)).slice(0, 4);
  const isLoading = !authReady || productsStatus === "loading";

  return (
    <>
      <PageIntro
        eyebrow="Saved for later"
        title="Your wishlist"
        description="Keep the pieces you love close until the moment feels right."
        breadcrumbs={[{ label: "Wishlist" }]}
      />

      <section className="section">
        <div className="container">
          {isLoading ? (
            <p className="catalog-loading">Loading your wishlist…</p>
          ) : wishlist.length ? (
            <ProductGrid products={wishlist} />
          ) : (
            <div>
              <div className="empty-state">
                <span className="empty-icon" aria-hidden="true">
                  ♡
                </span>
                <h2>Your wishlist is waiting for a little lustre.</h2>
                <p>Tap the heart on any piece to save it here.</p>
                <Link to="/new-arrivals" className="button button-dark">
                  Explore new arrivals
                </Link>
              </div>

              {trending.length > 0 && (
                <div className="wishlist-trending">
                  <div className="wishlist-trending-heading">
                    <span className="eyebrow">Popular right now</span>
                    <h3>Pieces customers are choosing</h3>
                  </div>
                  <ProductGrid products={trending} />
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
