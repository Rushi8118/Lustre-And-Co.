import { useState } from "react";

export const FALLBACK_JEWELRY_SVG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'><defs><linearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%2324201b'/><stop offset='100%25' stop-color='%23141210'/></linearGradient><linearGradient id='gold' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%23dfbe76'/><stop offset='100%25' stop-color='%23c5a059'/></linearGradient></defs><rect width='400' height='400' fill='url(%23g)'/><circle cx='200' cy='200' r='90' fill='none' stroke='url(%23gold)' stroke-width='1.5' stroke-dasharray='4 4' opacity='0.4'/><polygon points='200,140 245,175 228,235 172,235 155,175' fill='none' stroke='url(%23gold)' stroke-width='2.5'/><polygon points='200,140 245,175 155,175' fill='none' stroke='url(%23gold)' stroke-width='1.5' opacity='0.6'/><polygon points='172,235 200,260 228,235' fill='none' stroke='url(%23gold)' stroke-width='2'/><text x='200' y='295' font-family='serif' font-size='13' fill='%23dfbe76' text-anchor='middle' letter-spacing='3' opacity='0.85'>LUSTRE &amp; CO.</text></svg>";

const CATEGORY_FALLBACKS = {
  necklaces: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80",
  earrings: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80",
  rings: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80",
  bracelets: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=800&q=80",
  bangles: "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=800&q=80",
};

export function getSafeImageUrl(src, category = "necklaces") {
  if (!src || typeof src !== "string" || src.trim() === "") {
    return CATEGORY_FALLBACKS[category?.toLowerCase()] || FALLBACK_JEWELRY_SVG;
  }
  return src;
}

export default function SafeImage({
  src,
  alt = "",
  className = "",
  category = "necklaces",
  loading = "lazy",
  style = {},
  ...props
}) {
  const [errorStage, setErrorStage] = useState(0);

  const primarySrc = src && typeof src === "string" && src.trim() !== "" ? src : null;
  const categoryFallback = CATEGORY_FALLBACKS[category?.toLowerCase()] || CATEGORY_FALLBACKS.necklaces;

  let currentSrc = primarySrc;
  if (errorStage === 0) {
    currentSrc = primarySrc || categoryFallback;
  } else if (errorStage === 1) {
    currentSrc = categoryFallback;
  } else {
    currentSrc = FALLBACK_JEWELRY_SVG;
  }

  const handleError = () => {
    if (errorStage === 0 && currentSrc !== categoryFallback) {
      setErrorStage(1);
    } else {
      setErrorStage(2);
    }
  };

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      loading={loading}
      style={{
        objectFit: "cover",
        ...style,
      }}
      onError={handleError}
      {...props}
    />
  );
}
