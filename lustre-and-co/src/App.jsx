import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import ScrollToTop from "./components/ScrollToTop";

import Home from "./pages/Home";
import CatalogPage from "./pages/CatalogPage";
import ProductDetails from "./pages/ProductDetails";
import Wishlist from "./pages/Wishlist";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Account from "./pages/Account";
import TrackOrder from "./pages/TrackOrder";
import About from "./pages/About";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import ShippingReturns from "./pages/ShippingReturns";
import JewelryCare from "./pages/JewelryCare";
import Legal from "./pages/Legal";

import AdminApp from "./admin/AdminApp";

export default function App() {
  return (
    <>
      <ScrollToTop />
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
    </>
  );
}
