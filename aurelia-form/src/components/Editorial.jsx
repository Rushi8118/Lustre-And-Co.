import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { JOURNAL, TESTIMONIALS } from "../data/products";
import Reveal from "./Reveal";

/** A calm, one-at-a-time testimonial carousel. Pauses on hover and focus; reduced motion stops auto-advance. */
export function Testimonials() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const count = TESTIMONIALS.length;

  useEffect(() => {
    if (reduce || paused) return undefined;
    const timer = setInterval(() => setIndex((current) => (current + 1) % count), 7000);
    return () => clearInterval(timer);
  }, [count, paused, reduce]);

  const item = TESTIMONIALS[index];
  const go = (next) => setIndex((next + count) % count);

  return (
    <section className="testimonials" aria-labelledby="testimonials-title" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="container testimonials-inner">
        <h2 id="testimonials-title" className="visually-hidden">What clients say</h2>
        <AnimatePresence mode="wait">
          <motion.figure
            key={index}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <blockquote>“{item.quote}”</blockquote>
            <figcaption>
              {item.name}, <span>{item.place}</span>
            </figcaption>
          </motion.figure>
        </AnimatePresence>
        <div className="testimonial-controls">
          <button type="button" className="icon-button" aria-label="Previous testimonial" onClick={() => go(index - 1)}>
            <ChevronLeft size={18} />
          </button>
          <div className="testimonial-dots">
            {TESTIMONIALS.map((_, i) => (
              <button key={i} type="button" aria-label={`Show testimonial ${i + 1}`} aria-current={i === index} className={i === index ? "is-on" : ""} onClick={() => go(i)} />
            ))}
          </div>
          <button type="button" className="icon-button" aria-label="Next testimonial" onClick={() => go(index + 1)}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}

/** Email signup under the heading "Letters from the light". Stores nothing remote; it confirms locally. */
export function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const inputRef = useRef(null);

  function submit(event) {
    event.preventDefault();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!valid) {
      setStatus("invalid");
      inputRef.current?.focus();
      return;
    }
    setStatus("done");
    setEmail("");
  }

  return (
    <section className="newsletter" aria-labelledby="newsletter-title">
      <div className="container newsletter-inner">
        <Reveal>
          <span className="eyebrow">Newsletter</span>
          <h2 id="newsletter-title">Letters from the light</h2>
          <p>New pieces, studio notes and the occasional invitation. No more than once a month.</p>
          {status === "done" ? (
            <p className="form-success" role="status">Thank you. Your first letter is on its way.</p>
          ) : (
            <form className="newsletter-form" onSubmit={submit} noValidate>
              <label htmlFor="newsletter-email" className="visually-hidden">Email address</label>
              <input
                ref={inputRef}
                id="newsletter-email"
                type="email"
                autoComplete="email"
                placeholder="Your email address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={status === "invalid"}
                aria-describedby={status === "invalid" ? "newsletter-error" : undefined}
              />
              <button type="submit" className="btn">Subscribe</button>
              {status === "invalid" && (
                <p id="newsletter-error" className="form-error" role="alert">Please enter a valid email address.</p>
              )}
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}

/** The three editorial articles. Each links to the Journal page. */
export function JournalCards() {
  return (
    <div className="journal-cards">
      {JOURNAL.map((article, i) => (
        <Reveal key={article.slug} delay={i * 0.08} as="article" className="journal-card">
          <h3>{article.title}</h3>
          <p>{article.excerpt}</p>
          <Link to="/journal" className="text-link">
            Read the article <span aria-hidden="true">→</span>
          </Link>
        </Reveal>
      ))}
    </div>
  );
}
