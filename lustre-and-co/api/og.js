/**
 * Link previews for product pages.
 *
 * The storefront is a single-page app, so a crawler that does not run
 * JavaScript only ever sees the generic tags in index.html. vercel.json routes
 * known preview crawlers here instead, and this function answers with the same
 * page plus that product's own title, description, image, and price.
 *
 * Real visitors never reach this function.
 */

const API_BASE = process.env.VITE_API_BASE_URL || "https://lustre-and-co.onrender.com/api";
const SITE = process.env.SITE_URL || "https://lustre-and-co.vercel.app";

/** Escapes text for use inside an HTML attribute. */
function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Cuts a description to a length link previews actually display. */
function shorten(text, limit = 200) {
  const clean = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit - 1).trimEnd()}…`;
}

function sizedImage(url) {
  if (!url) return "";
  // Unsplash URLs already carry sizing params; ask for a preview-shaped crop.
  if (url.includes("images.unsplash.com")) {
    return `${url.split("?")[0]}?auto=format&fit=crop&w=1200&h=630&q=80`;
  }
  return url;
}

export default async function handler(request, response) {
  const slug = String(request.query?.slug || "").trim();
  const pageUrl = `${SITE}/product/${encodeURIComponent(slug)}`;

  let product = null;
  try {
    const apiResponse = await fetch(`${API_BASE}/products/${encodeURIComponent(slug)}`, {
      headers: { accept: "application/json" }
    });
    if (apiResponse.ok) {
      product = await apiResponse.json();
    }
  } catch {
    // The API may be waking up. Fall through to the generic store preview.
  }

  const title = product ? `${product.name} · Lustre & Co.` : "Lustre & Co. | Everyday elegance, made to shine";
  const description = product
    ? shorten(
        product.shortDescription ||
          product.description ||
          `${product.category || "Jewellery"} from Lustre & Co.`
      )
    : "Gold-plated necklaces, earrings, rings, bracelets, and bridal jewelry — hypoallergenic, and made to last.";
  const image = sizedImage(
    product?.image ||
      "https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?auto=format&fit=crop&w=1200&h=630&q=80"
  );

  const priceTags = product?.price
    ? `
    <meta property="product:price:amount" content="${escapeAttr(product.price)}" />
    <meta property="product:price:currency" content="INR" />
    <meta property="og:price:amount" content="${escapeAttr(product.price)}" />
    <meta property="og:price:currency" content="INR" />`
    : "";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeAttr(title)}</title>
    <meta name="description" content="${escapeAttr(description)}" />
    <link rel="canonical" href="${escapeAttr(pageUrl)}" />
    <meta property="og:type" content="${product ? "product" : "website"}" />
    <meta property="og:site_name" content="Lustre &amp; Co." />
    <meta property="og:title" content="${escapeAttr(title)}" />
    <meta property="og:description" content="${escapeAttr(description)}" />
    <meta property="og:url" content="${escapeAttr(pageUrl)}" />
    <meta property="og:image" content="${escapeAttr(image)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escapeAttr(product?.name || "Lustre & Co. jewelry")}" />
    <meta property="og:locale" content="en_IN" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeAttr(title)}" />
    <meta name="twitter:description" content="${escapeAttr(description)}" />
    <meta name="twitter:image" content="${escapeAttr(image)}" />${priceTags}
  </head>
  <body>
    <h1>${escapeAttr(product?.name || "Lustre & Co.")}</h1>
    <p>${escapeAttr(description)}</p>
    <p><a href="${escapeAttr(pageUrl)}">View this piece at Lustre &amp; Co.</a></p>
  </body>
</html>`;

  response.setHeader("content-type", "text/html; charset=utf-8");
  // Previews are cached by the chat apps anyway; a short cache keeps the
  // sleeping API from being hit on every share.
  response.setHeader("cache-control", "public, max-age=300, s-maxage=3600");
  response.status(200).send(html);
}
