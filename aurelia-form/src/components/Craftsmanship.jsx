import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/** Three details. Hover, focus or tap one to read about it and watch its fine gold line draw. */
const DETAILS = [
  {
    id: "sculpted",
    title: "Sculpted form",
    text: "Each curve is drawn by hand before it is modelled. The line is kept continuous, so the piece reads as one gesture.",
    path: "M8 60 C 40 8, 80 8, 112 60 S 184 112, 216 60",
  },
  {
    id: "hand-finished",
    title: "Hand-finished surface",
    text: "After casting, every surface is polished and brushed by hand. The finish is tuned until light moves across it without glare.",
    path: "M8 40 L 60 40 Q 80 40 80 60 Q 80 80 100 80 L 216 80",
  },
  {
    id: "daily-wear",
    title: "Designed for daily wear",
    text: "Clasps are secure, edges are soft and weight is balanced, so a piece can be worn from morning to evening.",
    path: "M8 70 Q 60 20 112 70 T 216 70",
  },
];

export default function Craftsmanship() {
  const [active, setActive] = useState(DETAILS[0].id);
  const reduce = useReducedMotion();

  return (
    <section className="craft" aria-labelledby="craft-title">
      <div className="container">
        <span className="eyebrow">Craft</span>
        <h2 id="craft-title">Made to catch the light</h2>

        <ul className="craft-list">
          {DETAILS.map((detail) => {
            const isActive = active === detail.id;
            return (
              <li key={detail.id}>
                <div
                  className={`craft-item ${isActive ? "is-active" : ""}`}
                  onMouseEnter={() => setActive(detail.id)}
                  onFocus={() => setActive(detail.id)}
                >
                  <button
                    type="button"
                    className="craft-trigger"
                    aria-expanded={isActive}
                    aria-controls={`craft-${detail.id}`}
                    onClick={() => setActive(detail.id)}
                  >
                    <span className="craft-title">{detail.title}</span>
                  </button>
                  <svg viewBox="0 0 224 120" aria-hidden="true" focusable="false" className="craft-line">
                    <motion.path
                      d={detail.path}
                      fill="none"
                      stroke="#c8a45d"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      initial={false}
                      animate={{ pathLength: isActive ? 1 : 0.35, opacity: isActive ? 1 : 0.5 }}
                      transition={reduce ? { duration: 0 } : { duration: 1.1, ease: [0.2, 0.75, 0.25, 1] }}
                    />
                  </svg>
                  <motion.p
                    id={`craft-${detail.id}`}
                    initial={false}
                    animate={{ opacity: isActive ? 1 : 0 }}
                    transition={{ duration: reduce ? 0 : 0.4 }}
                    className="craft-text"
                  >
                    {detail.text}
                  </motion.p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
