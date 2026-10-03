import { useEffect, useRef, useState } from "react";

/** Tracks the page scroll as a 0..1 value (0 at the top, 1 after about one screen). Stored in a ref, so 3D frames can read it without re-rendering. */
export function useScrollRef() {
  const progress = useRef(0);
  useEffect(() => {
    const update = () => {
      progress.current = Math.min(1, window.scrollY / Math.max(1, window.innerHeight * 0.9));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return progress;
}

/** Pointer position in -1..1 across the viewport, stored in a ref for the same reason. */
export function usePointerRef() {
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const move = (event) => {
      pointer.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: (event.clientY / window.innerHeight) * 2 - 1,
      };
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);
  return pointer;
}

/** True once the page has scrolled past `threshold` pixels. Drives the header background change. */
export function useScrolled(threshold = 12) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > threshold);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [threshold]);
  return scrolled;
}

/** Checks whether an element is on screen, and stays true once it has been. Lets us mount 3D lazily. */
export function useLatchedInView(ref, rootMargin = "200px") {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (seen || !ref.current || typeof IntersectionObserver === "undefined") {
      if (!seen && typeof IntersectionObserver === "undefined") setSeen(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, rootMargin, seen]);
  return seen;
}
