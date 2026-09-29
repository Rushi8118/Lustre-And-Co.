import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import ScrollToTop from "./components/ScrollToTop";
import AnalyticsTracker from "./components/AnalyticsTracker";
import PageLoader from "./components/PageLoader";
import { registerRoute, startRoutePrefetching } from "./services/prefetch";

// The landing page loads eagerly so first paint is not delayed by an extra request.
import Home from "./pages/Home";

// Everything else is split into its own chunk and fetched on first visit.
// Each import is registered so hovering a link can fetch it ahead of the click.
const load = {
  catalog: () => import("./pages/CatalogPage"),
  product: () => import("./pages/ProductDetails"),
  wishlist: () => import("./pages/Wishlist"),
  cart: () => import("./pages/Cart"),
  checkout: () => import("./pages/Checkout"),
  orderConfirmation: () => import("./pages/OrderConfirmation"),
  invoice: () => import("./pages/Invoice"),
  auth: () => import("./pages/Auth"),
  oauthCallback: () => import("./pages/OAuthCallback"),
  forgotPassword: () => import("./pages/ForgotPassword"),
  resetPassword: () => import("./pages/ResetPassword"),
  account: () => import("./pages/Account"),
  trackOrder: () => import("./pages/TrackOrder"),
  about: () => import("./pages/About"),
  contact: () => import("./pages/Contact"),
  faq: () => import("./pages/FAQ"),
  shippingReturns: () => import("./pages/ShippingReturns"),
  jewelryCare: () => import("./pages/JewelryCare"),
  legal: () => import("./pages/Legal")
};

const CatalogPage = lazy(load.catalog);
const ProductDetails = lazy(load.product);
const Wishlist = lazy(load.wishlist);
const Cart = lazy(load.cart);
const Checkout = lazy(load.checkout);
const OrderConfirmation = lazy(load.orderConfirmation);
const Invoice = lazy(load.invoice);
const Auth = lazy(load.auth);
const OAuthCallback = lazy(load.oauthCallback);
const ForgotPassword = lazy(load.forgotPassword);
const ResetPassword = lazy(load.resetPassword);
const Account = lazy(load.account);
const TrackOrder = lazy(load.trackOrder);
const About = lazy(load.about);
const Contact = lazy(load.contact);
const FAQ = lazy(load.faq);
const ShippingReturns = lazy(load.shippingReturns);
const JewelryCare = lazy(load.jewelryCare);
const Legal = lazy(load.legal);

// Paths a shopper can click, mapped to the code behind them. Trailing slashes
// mark a prefix, so every /product/<slug> uses the same entry.
[
  ["/shop", load.catalog],
  ["/new-arrivals", load.catalog],
  ["/best-sellers", load.catalog],
  ["/category/", load.catalog],
  ["/collections/", load.catalog],
  ["/product/", load.product],
  ["/wishlist", load.wishlist],
  ["/cart", load.cart],
  ["/checkout", load.checkout],
  ["/order-confirmation/", load.orderConfirmation],
  ["/invoice/", load.invoice],
  ["/account/login", load.auth],
  ["/account/signup", load.auth],
  ["/account/forgot-password", load.forgotPassword],
  ["/account/reset-password", load.resetPassword],
  ["/account", load.account],
  ["/track-order", load.trackOrder],
  ["/about", load.about],
  ["/contact", load.contact],
  ["/faq", load.faq],
  ["/shipping-returns", load.shippingReturns],
  ["/jewelry-care", load.jewelryCare],
  ["/privacy", load.legal],
  ["/terms", load.legal]
].forEach(([path, loader]) => registerRoute(path, loader));

startRoutePrefetching();

// Shoppers never download the admin panel.
const AdminApp = lazy(() => import("./admin/AdminApp"));

export default function App() {
  return (
    <>
      <ScrollToTop />
      <AnalyticsTracker />
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
            <Route path="/invoice/:orderId" element={<Invoice />} />

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
