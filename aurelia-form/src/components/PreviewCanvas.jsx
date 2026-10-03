import { lazy, Suspense, useMemo, useRef } from "react";
import { ViewerFallback } from "./Viewer";
import { hasWebGL, prefersReducedMotion } from "../lib/helpers";
import { useLatchedInView } from "../hooks/useInteraction";

// The 3D code is split into its own chunk, so pages without 3D stay small.
const LazyPreview = lazy(() => import("./PreviewScene"));

/**
 * A small, slowly turning 3D piece for cards. It mounts only when the card is near the
 * viewport and stays mounted afterwards, so off-screen cards do not render at all.
 */
export default function PreviewCanvas({ kind = "ring", finish = "warm", label }) {
  const ref = useRef(null);
  const seen = useLatchedInView(ref);
  const webgl = useMemo(() => hasWebGL(), []);

  if (!webgl) return <ViewerFallback label={label || "3D preview is not available in this browser."} />;

  return (
    <div className="preview-canvas" ref={ref}>
      {seen ? (
        <Suspense fallback={<div className="viewer viewer-loading" aria-hidden="true" />}>
          <LazyPreview kind={kind} finish={finish} still={prefersReducedMotion()} label={label} />
        </Suspense>
      ) : (
        <div className="viewer viewer-loading" aria-hidden="true" />
      )}
    </div>
  );
}
