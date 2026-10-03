import { lazy, Suspense, useMemo } from "react";
import { Link } from "react-router-dom";
import Reveal from "../components/Reveal";
import { ViewerLoading } from "../components/Viewer";
import { hasWebGL } from "../lib/helpers";

const FinishViewer = lazy(() => import("../components/FinishViewer"));

/** Our Story: a split layout with the text on one side and a turning piece on the other. */
export default function Story() {
  const webgl = useMemo(() => hasWebGL(), []);
  return (
    <section className="container story">
      <div className="story-copy">
        <Reveal>
          <p className="eyebrow">Our story</p>
          <h1>Jewellery with a story in every curve.</h1>
          <p>
            Aurelia Form began with a simple question: why should fine jewellery feel formal when it is worn every day?
            We design sculptural pieces that keep the drama of light and metal but sit easily on a working day.
          </p>
          <p>
            Each collection starts as a line drawn by hand. We model it, cast it, and finish it in small batches, so the
            proportions stay true from sketch to skin.
          </p>
          <p>
            Our three finishes, Warm Gold, Moon Silver and Rose Gold, are chosen to flatter a range of skin tones and to
            age gracefully.
          </p>
          <Link to="/collections" className="btn">Explore the collections</Link>
        </Reveal>
      </div>
      <div className="story-visual">
        {webgl ? (
          <Suspense fallback={<ViewerLoading />}>
            <FinishViewer finish="rose" still={false} />
          </Suspense>
        ) : (
          <p className="empty">The 3D piece needs WebGL, which this browser does not support.</p>
        )}
      </div>
    </section>
  );
}
