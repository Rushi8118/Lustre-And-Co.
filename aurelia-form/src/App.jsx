import { lazy, Suspense, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Header from "./components/Header";
import Footer from "./components/Footer";

const Home = lazy(() => import("./pages/Home"));
const Shop = lazy(() => import("./pages/Shop"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Story = lazy(() => import("./pages/Story"));
const Journal = lazy(() => import("./pages/Journal"));
const Bag = lazy(() => import("./pages/Bag"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const Account = lazy(() => import("./pages/Account"));
const NotFound = lazy(() => import("./pages/NotFound"));

function RouteFallback() {
  return <div className="page-loading" aria-live="polite">Loading…</div>;
}

/** Scroll to the top on each page change, so a new page never opens mid-scroll. */
function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

export default function App() {
  const location = useLocation();
  const reduce = useReducedMotion();

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <Header />
      <ScrollReset />
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          id="main"
          key={location.pathname.split("/")[1] || "home"}
          tabIndex={-1}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease: [0.2, 0.75, 0.25, 1] }}
        >
          <Suspense fallback={<RouteFallback />}>
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/collections" element={<Shop />} />
              <Route path="/collections/:slug" element={<Shop />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/shop/:category" element={<Shop />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/story" element={<Story />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/bag" element={<Bag />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/account" element={<Account />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </motion.main>
      </AnimatePresence>
      <Footer />
    </>
  );
}
