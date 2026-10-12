import { useEffect, useState } from "react";
import { imageUrl } from "../utils/image";

export const IMAGE_FALLBACK = "/images/placeholder.svg";

/**
 * The single <img> used across the storefront.
 *
 * It exists because three things were being forgotten per call site:
 *  - `imageUrl()` was skipped, so 1200px originals were downloaded into 80px thumbnails;
 *  - a dead URL rendered the browser's broken-image icon instead of anything on-brand;
 *  - `loading`/`decoding` were set inconsistently, so above-the-fold art was deferred
 *    while off-screen art was not.
 *
 * Pass `width` as the widest CSS pixel size the image is actually painted at.
 * Pass `priority` for anything above the fold (it opts out of lazy loading).
 */
export default function SmartImage({
  src,
  alt = "",
  width = 800,
  priority = false,
  fallback = IMAGE_FALLBACK,
  className = "",
  ...rest
}) {
  const [failed, setFailed] = useState(false);

  // A new src deserves a fresh attempt, otherwise one bad URL poisons the slot
  // for every product that later reuses this component instance.
  useEffect(() => {
    setFailed(false);
  }, [src]);

  const resolved = !src || failed ? fallback : imageUrl(src, width);

  // React 18 does not map the camelCase `fetchPriority` prop onto the element, so
  // the lowercase HTML attribute is passed instead; React 19 accepts both.
  const priorityAttrs = priority ? { fetchpriority: "high" } : null;

  return (
    <img
      src={resolved}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      {...priorityAttrs}
      onError={() => setFailed(true)}
      className={`${className} ${failed || !src ? "is-image-fallback" : ""}`.trim()}
      {...rest}
    />
  );
}
