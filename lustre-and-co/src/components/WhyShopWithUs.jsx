import { motion } from "framer-motion";
import {
  Gem,
  Feather,
  Lock,
  Truck,
  RotateCcw
} from "lucide-react";

export const benefitsData = [
  {
    id: "premium-quality",
    title: "Premium Quality",
    text: "Carefully selected materials and detailed finishing.",
    icon: Gem
  },
  {
    id: "skin-friendly",
    title: "Skin-Friendly Materials",
    text: "Comfortable jewelry designed for everyday wear.",
    icon: Feather
  },
  {
    id: "secure-payments",
    title: "Secure Payments",
    text: "Your payment information is protected.",
    icon: Lock
  },
  {
    id: "fast-delivery",
    title: "Fast Delivery",
    text: "Reliable delivery to your doorstep.",
    icon: Truck
  },
  {
    id: "easy-returns",
    title: "Easy Returns",
    text: "Simple returns for a worry-free experience.",
    icon: RotateCcw
  }
];

export default function WhyShopWithUs({
  eyebrow = "The Lustre Standard",
  title = "Why Shop With Us?",
  description = "Thoughtful craftsmanship, trusted service, and everyday luxury designed to delight.",
  className = ""
}) {
  return (
    <section
      className={`why-shop-section ${className}`}
      aria-labelledby="why-shop-heading"
    >
      <div className="container">
        <div className="why-shop-header text-center">
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2 id="why-shop-heading" className="why-shop-title">
            {title}
          </h2>
          {description && (
            <p className="why-shop-subtitle">{description}</p>
          )}
        </div>

        <div className="why-shop-grid" role="list">
          {benefitsData.map((benefit, index) => {
            const IconComponent = benefit.icon;
            return (
              <motion.article
                key={benefit.id}
                className="benefit-card"
                role="listitem"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  duration: 0.45,
                  delay: Math.min(index * 0.08, 0.35),
                  ease: [0.16, 1, 0.3, 1]
                }}
              >
                <div className="benefit-icon-wrapper" aria-hidden="true">
                  <IconComponent size={24} strokeWidth={1.5} className="benefit-icon" />
                </div>

                <div className="benefit-content">
                  <h3 className="benefit-card-title">{benefit.title}</h3>
                  <p className="benefit-card-text">{benefit.text}</p>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
