/**
 * Route code prefetching.
 *
 * Pages are split into separate files so the first load stays small, but that
 * means a click has to wait for a download before anything renders. Fetching
 * the file when a shopper hovers (or touches) a link removes that wait: by the
 * time the click lands, the code is usually already in the browser cache.
 */

const loaders = new Map();
const started = new Set();

/** Registers the import function for a path pattern, e.g. "/product/". */
export function registerRoute(prefix, loader) {
  loaders.set(prefix, loader);
}

function loaderFor(path) {
  if (loaders.has(path)) return loaders.get(path);
  // Longest matching prefix wins, so "/account/login" beats "/account".
  let match = null;
  let matchLength = -1;
  for (const [prefix, loader] of loaders) {
    if (prefix.endsWith("/") && path.startsWith(prefix) && prefix.length > matchLength) {
      match = loader;
      matchLength = prefix.length;
    }
  }
  return match;
}

/** Downloads the code for a path, at most once. */
export function prefetchRoute(path) {
  if (!path || started.has(path)) return;
  const loader = loaderFor(path);
  if (!loader) return;
  started.add(path);
  // Failures are ignored: this is only a head start, the real navigation retries.
  loader().catch(() => started.delete(path));
}

function pathFromEvent(event) {
  const anchor = event.target?.closest?.("a[href]");
  if (!anchor) return null;
  const href = anchor.getAttribute("href");
  if (!href || !href.startsWith("/") || anchor.target === "_blank") return null;
  return href.split("?")[0].split("#")[0];
}

/**
 * Watches for hover and touch on internal links. One listener on the document
 * covers every link on the site, including ones added later.
 */
export function startRoutePrefetching() {
  if (typeof document === "undefined") return;

  const onIntent = (event) => {
    const path = pathFromEvent(event);
    if (path) prefetchRoute(path);
  };

  // pointerenter does not bubble, so it is caught on the way down; pointerover
  // is a bubbling fallback for browsers that treat the first one differently.
  document.addEventListener("pointerenter", onIntent, { capture: true, passive: true });
  document.addEventListener("pointerover", onIntent, { passive: true });
  document.addEventListener("touchstart", onIntent, { capture: true, passive: true });
  document.addEventListener("focusin", onIntent, { passive: true });

  // The pages nearly everyone opens, fetched once the browser is idle.
  const warmCommonRoutes = () => {
    ["/shop", "/product/", "/cart"].forEach(prefetchRoute);
  };
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(warmCommonRoutes, { timeout: 4000 });
  } else {
    setTimeout(warmCommonRoutes, 2500);
  }
}
