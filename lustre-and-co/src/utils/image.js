const UNSPLASH_HOST = "images.unsplash.com";

/**
 * Asks Unsplash for a sharper rendition at the width the image is shown at.
 * Other URLs are returned unchanged, so uploaded images are never altered.
 */
export function imageUrl(url, width = 1200, quality = 85) {
  if (!url || !url.includes(UNSPLASH_HOST)) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("auto", "format");
    parsed.searchParams.set("fit", "crop");
    parsed.searchParams.set("w", String(width));
    parsed.searchParams.set("q", String(quality));
    return parsed.toString();
  } catch {
    return url;
  }
}
