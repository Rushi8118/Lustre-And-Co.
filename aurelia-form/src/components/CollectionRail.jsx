import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { COLLECTIONS, PRODUCTS } from "../data/products";
import { formatPrice } from "../lib/helpers";
import PreviewCanvas from "./PreviewCanvas";

/** Each collection is previewed by one signature piece and finish. */
const SIGNATURE = {
  solis: { kind: "ring", finish: "warm" },
  tidal: { kind: "bracelet", finish: "moon" },
  arc: { kind: "earring", finish: "rose" },
  nocturne: { kind: "pendant", finish: "warm" },
};

/** A horizontal rail of collections. Cards animate in as they enter, and the art drifts slightly as the rail scrolls. */
export default function CollectionRail() {
  const railRef = useRef(null);
  const reduce = useReducedMotion();
  const { scrollXProgress } = useScroll({ container: railRef });
  const drift = useTransform(scrollXProgress, [0, 1], [-18, 18]);

  return (
    <div className="rail" ref={railRef} role="list" aria-label="Collections">
      {COLLECTIONS.map((collection, index) => {
        const pieces = PRODUCTS.filter((product) => product.collection === collection.slug);
        const from = Math.min(...pieces.map((product) => product.price));
        const signature = SIGNATURE[collection.slug];
        return (
          <motion.article
            key={collection.slug}
            role="listitem"
            className="rail-card"
            style={{ background: collection.background }}
            initial={reduce ? false : { opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, delay: index * 0.08, ease: [0.2, 0.75, 0.25, 1] }}
          >
            <motion.div className="rail-art" style={reduce ? undefined : { x: drift }}>
              <PreviewCanvas kind={signature.kind} finish={signature.finish} label={`${collection.name} signature piece`} />
            </motion.div>
            <div className="rail-meta">
              <span className="rail-mood">{collection.mood}</span>
              <h3>{collection.name}</h3>
              <p>{collection.description}</p>
              <p className="rail-price">From {formatPrice(from)}</p>
              <Link to={`/collections/${collection.slug}`} className="text-link">
                Explore {collection.name} <span aria-hidden="true">→</span>
              </Link>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}
