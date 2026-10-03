import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { imageUrl } from "../utils/image";

const AUTOPLAY_MS = 6000;

/**
 * Full-width banner carousel for the home page. Each slide has an image, a headline and a link.
 * Autoplay pauses while the pointer is over the banner or focus is inside it.
 */
export default function HeroCarousel({ slides }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  useEffect(() => {
    if (count < 2 || paused) return undefined;
    const timer = setInterval(() => setIndex((current) => (current + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [count, paused]);

  if (count === 0) return null;

  const go = (next) => setIndex(((next % count) + count) % count);

  return (
    <section
      className="hero-carousel"
      aria-roledescription="carousel"
      aria-label="Featured collections"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="hero-carousel-track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((slide, slideIndex) => (
          <div
            key={slide.key}
            className="hero-slide"
            role="group"
            aria-roledescription="slide"
            aria-label={`${slideIndex + 1} of ${count}`}
            aria-hidden={slideIndex !== index}
          >
            {slide.image && <img src={imageUrl(slide.image, 2000, 88)} alt="" loading={slideIndex === 0 ? "eager" : "lazy"} />}
            <div className="hero-slide-shade" />
            <div className="hero-slide-copy container">
              {slide.eyebrow && <span className="hero-slide-eyebrow">{slide.eyebrow}</span>}
              <h2>{slide.title}</h2>
              {slide.text && <p>{slide.text}</p>}
              <Link className="hero-slide-cta" to={slide.to} tabIndex={slideIndex === index ? 0 : -1}>
                {slide.cta}
              </Link>
            </div>
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            className="hero-carousel-arrow is-prev"
            aria-label="Previous slide"
            onClick={() => go(index - 1)}
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            className="hero-carousel-arrow is-next"
            aria-label="Next slide"
            onClick={() => go(index + 1)}
          >
            <ChevronRight size={22} />
          </button>

          <div className="hero-carousel-dots" role="tablist" aria-label="Choose slide">
            {slides.map((slide, slideIndex) => (
              <button
                key={slide.key}
                type="button"
                role="tab"
                aria-selected={slideIndex === index}
                aria-label={`Show slide ${slideIndex + 1}`}
                className={`hero-carousel-dot ${slideIndex === index ? "is-active" : ""}`}
                onClick={() => go(slideIndex)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
