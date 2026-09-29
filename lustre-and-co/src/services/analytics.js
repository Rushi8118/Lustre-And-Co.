/**
 * Google Analytics 4.
 *
 * Nothing loads and nothing is sent unless VITE_GA_MEASUREMENT_ID is set, so
 * local development and preview builds stay out of the reports.
 */

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || "";

let loaded = false;

export const analyticsEnabled = Boolean(MEASUREMENT_ID);

function gtag(...args) {
  if (!window.dataLayer) return;
  window.dataLayer.push(args);
}

/** Injects the GA script once. Safe to call repeatedly. */
export function initAnalytics() {
  if (!analyticsEnabled || loaded || typeof document === "undefined") return;
  loaded = true;

  window.dataLayer = window.dataLayer || [];
  gtag("js", new Date());
  // GA sends the first page view itself, so a visitor who leaves while the
  // store is still loading is still counted. Later route changes are reported
  // by AnalyticsTracker.
  gtag("config", MEASUREMENT_ID);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

export function trackPageView(path, title) {
  if (!analyticsEnabled) return;
  gtag("event", "page_view", {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href
  });
}

export function trackEvent(name, params = {}) {
  if (!analyticsEnabled) return;
  gtag("event", name, params);
}

/** GA4 expects money as a number plus a currency code. */
function toItem(product, quantity = 1) {
  return {
    item_id: product?.slug || product?.id,
    item_name: product?.name,
    item_category: product?.category,
    price: Number(product?.price) || 0,
    quantity
  };
}

export function trackViewItem(product, currency = "INR") {
  if (!product) return;
  trackEvent("view_item", {
    currency,
    value: Number(product.price) || 0,
    items: [toItem(product)]
  });
}

export function trackAddToCart(product, quantity = 1, currency = "INR") {
  if (!product) return;
  trackEvent("add_to_cart", {
    currency,
    value: (Number(product.price) || 0) * quantity,
    items: [toItem(product, quantity)]
  });
}

export function trackBeginCheckout(items, value, currency = "INR") {
  trackEvent("begin_checkout", {
    currency,
    value: Number(value) || 0,
    items: (items || []).map((item) => toItem(item, item.quantity))
  });
}

export function trackPurchase(order, currency = "INR") {
  if (!order) return;
  trackEvent("purchase", {
    transaction_id: order.orderId,
    currency,
    value: Number(order.total) || 0,
    shipping: Number(order.shippingFee || 0) + Number(order.deliverySurcharge || 0),
    tax: Number(order.tax) || 0,
    coupon: order.promoCode || undefined,
    items: (order.items || []).map((item) => ({
      item_id: item.slug || item.productId,
      item_name: item.name,
      price: Number(item.price) || 0,
      quantity: item.quantity
    }))
  });
}

export function trackSearch(term) {
  if (!term) return;
  trackEvent("search", { search_term: term });
}
