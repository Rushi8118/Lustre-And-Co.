import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import ScrollToTop from "./components/ScrollToTop";
import PageLoader from "./components/PageLoader";

// The landing page loads eagerly so first paint is not delayed by an extra request.
import Home from "./pages/Home";

// Everything else is split into its own chunk and fetched on first visit.
const CatalogPage = lazy(() => import("./pages/CatalogPage"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const Auth = lazy(() => import("./pages/Auth"));
const OAuthCallback = lazy(() => import("./pages/OAuthCallback"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Account = lazy(() => import("./pages/Account"));
const TrackOrder = lazy(() => import("./pages/TrackOrder"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQ = lazy(() => import("./pages/FAQ"));
const ShippingReturns = lazy(() => import("./pages/ShippingReturns"));
const JewelryCare = lazy(() => import("./pages/JewelryCare"));
const Legal = lazy(() => import("./pages/Legal"));

// Shoppers never download the admin panel.
const AdminApp = lazy(() => import("./admin/AdminApp"));

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageLoader fullScreen />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />

            <Route path="/shop" element={<CatalogPage type="shop" />} />
            <Route path="/new-arrivals" element={<CatalogPage type="new" />} />
            <Route path="/best-sellers" element={<CatalogPage type="bestsellers" />} />
            <Route path="/category/:slug" element={<CatalogPage type="category" />} />
            <Route path="/collections/bridal" element={<CatalogPage type="bridal" />} />
            <Route path="/collections/sale" element={<CatalogPage type="sale" />} />

            <Route path="/product/:slug" element={<ProductDetails />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />

            <Route path="/account/login" element={<Auth mode="login" />} />
            <Route path="/account/signup" element={<Auth mode="signup" />} />
            <Route path="/account/oauth" element={<OAuthCallback />} />
            <Route path="/account/forgot-password" element={<ForgotPassword />} />
            <Route path="/account/reset-password" element={<ResetPassword />} />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <Account />
                </ProtectedRoute>
              }
            />
            <Route path="/track-order" element={<TrackOrder />} />

            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/shipping-returns" element={<ShippingReturns />} />
            <Route path="/jewelry-care" element={<JewelryCare />} />
            <Route path="/privacy" element={<Legal tab="privacy" />} />
            <Route path="/terms" element={<Legal tab="terms" />} />
          </Route>

          <Route path="/admin/*" element={<AdminApp />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
