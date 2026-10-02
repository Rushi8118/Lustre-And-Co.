import { Link } from "react-router-dom";
import { ArrowRight, Truck, RotateCcw, ShieldCheck, Sparkles, Gift } from "lucide-react";
import { motion } from "framer-motion";
import { useSettings } from "../context/SettingsContext";
import { formatPrice } from "../data/products";

export default function PromotionalBanner({ className = "" }) {
  const { settings } = useSettings();
  const promo = settings.homepage.promo;
  const { commerce } = settings;

  if (!promo?.enabled) return null;

  return (
    <section className={`promo-banner-section ${className}`}>
      <div className="container">
        <motion.div
          className="promo-banner-container"
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="promo-gold-glow promo-glow-left" aria-hidden="true" />
          <div className="promo-gold-glow promo-glow-right" aria-hidden="true" />

          <div className="promo-banner-split">
            <div className="promo-banner-content">
              {promo.eyebrow && (
                <div className="promo-badge-pill">
                  <Sparkles size={13} className="promo-sparkle-icon" />
                  <span>{promo.eyebrow}</span>
                </div>
              )}

              <h2 className="promo-banner-heading">
                {promo.heading} {promo.highlight && <em>{promo.highlight}</em>}
              </h2>

              <p className="promo-banner-text">{promo.text}</p>

              <div className="promo-banner-cta">
                {promo.ctaLabel && (
                  <Link to={promo.ctaLink || "/shop"} className="button promo-cta-btn">
                    <span>{promo.ctaLabel}</span>
                    <ArrowRight size={16} />
                  </Link>
                )}
                {promo.tagTitle && (
                  <span className="promo-cta-hint">
                    <Gift size={14} />
                    <span>Enter the code at checkout</span>
                  </span>
                )}
              </div>

              <div className="promo-perks-grid">
                <div className="promo-perk-item">
                  <div className="perk-icon-circle">
                    <Truck size={17} />
                  </div>
                  <div className="perk-text-group">
                    <strong>Free shipping</strong>
                    <span>On orders above {formatPrice(commerce.freeShippingThreshold)}</span>
                  </div>
                </div>

                <div className="promo-perk-item">
                  <div className="perk-icon-circle">
                    <RotateCcw size={17} />
                  </div>
                  <div className="perk-text-group">
                    <strong>Easy returns</strong>
                    <span>{commerce.returnWindowDays}-day returns</span>
                  </div>
                </div>

                <div className="promo-perk-item">
                  <div className="perk-icon-circle">
                    <ShieldCheck size={17} />
                  </div>
                  <div className="perk-text-group">
                    <strong>Secure checkout</strong>
                    <span>{settings.payments.codEnabled ? "Cash on delivery available" : "Protected payments"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="promo-banner-visual">
              <div className="promo-image-wrapper">
                <img src={promo.image} alt={promo.heading} className="promo-image" loading="lazy" />

                {promo.tagTitle && (
                  <div className="promo-floating-tag">
                    <span className="floating-tag-badge">Offer</span>
                    <strong>{promo.tagTitle}</strong>
                    {promo.tagText && <small>{promo.tagText}</small>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
