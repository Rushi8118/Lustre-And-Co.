import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Header from "./Header";
import Footer from "./Footer";
import BottomNav from "./BottomNav";

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
    return <Outlet />;
  }

  return (
    <div className="app-shell">
      <Header />

      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          className="page-shell"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>

      <Footer />
      <BottomNav />
    </div>
  );
}