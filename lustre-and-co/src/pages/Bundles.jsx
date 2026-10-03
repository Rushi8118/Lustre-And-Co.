import { useEffect, useState, useMemo } from "react";
import { Sparkles, Gift, Tag, Layers, Search, RefreshCw, AlertCircle } from "lucide-react";
import BundleCard from "../components/BundleCard";
import MixAndMatchBundle from "../components/MixAndMatchBundle";
import { getBundles } from "../services/bundles";
import { useStore } from "../context/StoreContext";

const BUNDLE_FILTERS = [
  { id: "all", label: "All Collections", icon: Layers },
  { id: "gift_set", label: "Gift Sets", icon: Gift },
  { id: "starter_kit", label: "Starter Kits", icon: Sparkles },
  { id: "mix_and_match", label: "Mix & Match", icon: RefreshCw },
  { id: "bogo", label: "BOGO Deals", icon: Tag },
  { id: "frequently_bought_together", label: "Perfect Pairs", icon: Layers },
];

export default function Bundles() {
  const { cartId } = useStore();
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMixMatch, setSelectedMixMatch] = useState(null);

  const fetchBundles = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getBundles();
      setBundles(data || []);
    } catch {
      setError("Bundles and gift sets could not be loaded at this time.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBundles();
  }, []);

  const filteredBundles = useMemo(() => {
    return bundles.filter((bundle) => {
      const matchesType =
        activeFilter === "all" || bundle.bundleType === activeFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        bundle.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bundle.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [bundles, activeFilter, searchQuery]);

  return (
    <main className="bundles-page-wrapper">
      {/* Hero Section */}
      <section className="bundles-hero">
        <div className="bundles-hero-inner">
          <span className="bundles-hero-eyebrow">
            <Sparkles size={14} /> Curated Luxury Sets
          </span>
          <h1 className="bundles-hero-title">Bundles & Gift Sets</h1>
          <p className="bundles-hero-desc">
            Discover harmonious pairings designed to be worn together. Enjoy
            exclusive bundle savings on bespoke necklaces, earrings, bracelets,
            and gift packages.
          </p>
        </div>
      </section>

      <div className="bundles-container">
        {/* Controls Toolbar */}
        <div className="bundles-toolbar">
          <div className="bundles-filters">
            {BUNDLE_FILTERS.map((filter) => {
              const Icon = filter.icon;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => {
                    setActiveFilter(filter.id);
                    setSelectedMixMatch(null);
                  }}
                  className={`bundles-filter-chip ${
                    activeFilter === filter.id ? "is-active" : ""
                  }`}
                >
                  <Icon size={14} />
                  <span>{filter.label}</span>
                </button>
              );
            })}
          </div>

          <div className="bundles-search-box">
            <Search size={16} className="bundles-search-icon" />
            <input
              type="text"
              placeholder="Search sets and collections…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bundles-search-input"
            />
          </div>
        </div>

        {/* Selected Mix & Match Customizer Modal/Drawer */}
        {selectedMixMatch && (
          <div className="mix-modal-backdrop" onClick={() => setSelectedMixMatch(null)}>
            <div className="mix-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="mix-modal-top">
                <button
                  type="button"
                  className="mix-modal-close"
                  onClick={() => setSelectedMixMatch(null)}
                >
                  ✕ Close Customizer
                </button>
              </div>
              <MixAndMatchBundle
                bundle={selectedMixMatch}
                cartId={cartId}
                onAdded={() => setSelectedMixMatch(null)}
              />
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bundles-loading-grid">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bundle-card-skeleton animate-pulse" />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bundles-error-card">
            <AlertCircle size={28} />
            <p>{error}</p>
            <button
              type="button"
              onClick={fetchBundles}
              className="bundles-retry-btn"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredBundles.length === 0 && (
          <div className="bundles-empty-state">
            <Layers size={36} />
            <h3>No bundles match your selection</h3>
            <p>
              {searchQuery
                ? `No results found for "${searchQuery}". Try a different keyword.`
                : "Check back soon for new curated seasonal sets."}
            </p>
            {(searchQuery || activeFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setActiveFilter("all");
                  setSearchQuery("");
                }}
                className="bundles-reset-btn"
              >
                View all collections
              </button>
            )}
          </div>
        )}

        {/* Bundles Grid */}
        {!loading && !error && filteredBundles.length > 0 && (
          <div className="bundles-grid">
            {filteredBundles.map((bundle) => {
              if (bundle.bundleType === "mix_and_match") {
                return (
                  <div key={bundle.id} className="bundle-grid-item">
                    <BundleCard
                      bundle={bundle}
                      cartId={cartId}
                      onAdded={fetchBundles}
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedMixMatch(bundle)}
                      className="bundle-customize-overlay-btn"
                    >
                      <Sparkles size={14} /> Customize This Set
                    </button>
                  </div>
                );
              }

              return (
                <div key={bundle.id} className="bundle-grid-item">
                  <BundleCard
                    bundle={bundle}
                    cartId={cartId}
                    onAdded={fetchBundles}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
