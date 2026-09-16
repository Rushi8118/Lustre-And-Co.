import { Suspense, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Header from "./Header";
import Footer from "./Footer";
import BottomNav from "./BottomNav";
import PageLoader from "./PageLoader";

export default function Layout() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname]);

  const isAuthPage =
    location.pathname === "/account/login" ||
    location.pathname === "/account/signup" ||
    location.pathname === "/account/forgot-password" ||
    location.pathname === "/account/reset-password";

  if (isAuthPage) {
    return (
      <Suspense fallback={<PageLoader fullScreen />}>
        <Outlet />
      </Suspense>
    );
  }

  return (
    <div className="app-shell">
      <Header />

      {/* Short transitions: with mode="wait" the next page cannot start until the old one exits. */}
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          className="page-shell"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14, ease: "easeOut" }}
        >
          {/* Keeps the header and footer on screen while a page chunk loads. */}
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </motion.main>
      </AnimatePresence>

      <Footer />
      <BottomNav />
    </div>
  );
}
