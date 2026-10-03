import { motion, useReducedMotion } from "framer-motion";

/** Fades and lifts content into view once, when it first enters the viewport. Off when reduced motion is requested. */
export default function Reveal({ children, delay = 0, y = 24, as = "div", className = "" }) {
  const reduce = useReducedMotion();
  const Component = motion[as] || motion.div;
  return (
    <Component
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8, delay, ease: [0.2, 0.75, 0.25, 1] }}
    >
      {children}
    </Component>
  );
}
