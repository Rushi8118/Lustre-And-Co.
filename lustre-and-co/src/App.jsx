import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import ScrollToTop from "./components/ScrollToTop";

const Home = lazy(() => import("./pages/Home"));
const CatalogPage = lazy(() => import("./pages/CatalogPage"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const Bundles = lazy(() => import("./pages/Bundles"));
const BundleDetails = lazy(() => import("./pages/BundleDetails"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const Auth = lazy(() => import("./pages/Auth"));
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

const AdminApp = lazy(() => import("./admin/AdminApp"));
import useReferralTracking from "./hooks/useReferralTracking";
import useAnalyticsTracking from "./hooks/useAnalyticsTracking";

export default function App() {
  useReferralTracking();
  useAnalyticsTracking();
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<div className="route-loading" aria-busy="true" />}>
      <Routes>
        <Route element={<Layout />}>
        <Route path="/" element={<Home />} />

        <Route path="/shop" element={<CatalogPage type="shop" />} />
        <Route path="/new-arrivals" element={<CatalogPage type="new" />} />
        <Route path="/best-sellers" element={<CatalogPage type="bestsellers" />} />
        <Route path="/category/:slug" element={<CatalogPage type="category" />} />
        <Route path="/collections/bridal" element={<CatalogPage type="bridal" />} />
        <Route path="/collections/sale" element={<CatalogPage type="sale" />} />
        <Route path="/bundles" element={<Bundles />} />
        <Route path="/bundles/:slug" element={<BundleDetails />} />

        <Route path="/product/:slug" element={<ProductDetails />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />

        <Route path="/account/login" element={<Auth mode="login" />} />
        <Route path="/account/signup" element={<Auth mode="signup" />} />
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
