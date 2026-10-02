// Catalog helpers. Product data itself is loaded from the API (see StoreContext).

let activeCurrency = "INR";

export function setCurrency(currency) {
  activeCurrency = currency || "INR";
}

export function formatPrice(value) {
  return new Intl.NumberFormat(activeCurrency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency: activeCurrency,
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

export const COLOR_SWATCHES = {
  Gold: "#D4AF37",
  "Rose gold": "#E6A89B",
  "Rose Gold": "#E6A89B",
  Silver: "#C4C8CC",
  "Antique gold": "#B5944B"
};

/** Shapes an API product for the storefront components. */
export function normalizeProduct(product) {
  if (!product) return product;
  return {
    ...product,
    id: product.slug || product._id,
    color: product.availableColors?.[0] || "Gold",
    collection: product.collectionName || "everyday",
    popularity: product.salesCount || 0,
    dateAdded: product.createdAt,
    tags: product.tags || [],
    gallery: product.gallery?.length ? product.gallery : [product.image],
    rating: product.rating || 0,
    reviews: product.reviews || 0
  };
}

const toKey = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Same composite key the API uses for bag lines. */
export function cartItemId(slug, color, size) {
  return `${slug}-${toKey(color)}-${toKey(size)}`;
}

export function isInStock(product) {
  return Boolean(product) && product.stockQuantity > 0 && product.availability !== "out-of-stock";
}
