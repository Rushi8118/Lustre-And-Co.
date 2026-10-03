import { lazy, Suspense, useId, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FINISHES, FINISH_LIST } from "../lib/materials";
import { hasWebGL, prefersReducedMotion } from "../lib/helpers";
import { ViewerFallback, ViewerLoading } from "./Viewer";

const LazyFinishViewer = lazy(() => import("./FinishViewer"));

/**
 * "Choose your light": pick a finish and the piece, the background tint and the description
 * all change. The selected finish lives in React state; the 3D metal eases toward it.
 */
export default function ChooseLight() {
  const [finishId, setFinishId] = useState("warm");
  const finish = FINISHES[finishId];
  const groupId = useId();
  const webgl = useMemo(() => hasWebGL(), []);
  const reduce = prefersReducedMotion();
  const index = FINISH_LIST.findIndex((item) => item.id === finishId);

  return (
    <section className="choose-light" style={{ backgroundColor: finish.tint }} aria-labelledby={`${groupId}-title`}>
      <div className="container choose-light-grid">
        <div className="choose-light-viewer">
          {webgl ? (
            <Suspense fallback={<ViewerLoading />}>
              <LazyFinishViewer finish={finishId} still={reduce} />
            </Suspense>
          ) : (
            <ViewerFallback label="The finish preview needs WebGL, which this browser does not support." />
          )}
        </div>

        <div className="choose-light-copy">
          <span className="eyebrow">Finish</span>
          <h2 id={`${groupId}-title`}>Choose your light</h2>

          <div role="radiogroup" aria-label="Metal finish" className="finish-options">
            {FINISH_LIST.map((item) => {
              const selected = item.id === finishId;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`finish-option ${selected ? "is-selected" : ""}`}
                  onClick={() => setFinishId(item.id)}
                >
                  <span className="swatch" style={{ background: item.color }} aria-hidden="true" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>

          <div className="finish-indicator" aria-hidden="true">
            {FINISH_LIST.map((item, i) => (
              <span key={item.id} className={i <= index ? "is-on" : ""} />
            ))}
          </div>
          <p className="finish-current">
            Current finish: <strong>{finish.name}</strong>
          </p>

          <AnimatePresence mode="wait">
            <motion.p
              key={finish.id}
              className="finish-note"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              {finish.note}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
