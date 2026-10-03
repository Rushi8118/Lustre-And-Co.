import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Facebook,
  Instagram,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Truck,
  Youtube
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import { useSettings } from "../context/SettingsContext";
import { formatPrice } from "../data/products";
import api, { getErrorMessage } from "../services/api";

export default function Footer() {
  const { showToast } = useStore();
  const { settings, categories } = useSettings();
  const { store, social, commerce, newsletter, payments } = settings;

  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  async function handleSubscribe(event) {
    event.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      await api.post("/newsletter/subscribe", { email: email.trim(), source: "footer" });
      setSubscribed(true);
    } catch (err) {
      showToast(getErrorMessage(err, "Could not subscribe right now."), "error");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopyPromo() {
    if (navigator.clipboard && newsletter.couponCode) {
      navigator.clipboard.writeText(newsletter.couponCode);
      setCopiedCode(true);
      showToast(`Coupon code ${newsletter.couponCode} copied to clipboard!`, "success");
      setTimeout(() => setCopiedCode(false), 3000);
    }
  }

  const socialLinks = [
    [social.instagram, Instagram, "Instagram"],
    [social.facebook, Facebook, "Facebook"],
    [social.youtube, Youtube, "YouTube"],
    [social.whatsapp, MessageCircle, "WhatsApp"]
  ].filter(([href]) => href);

  const year = new Date().getFullYear();

  return (
    <footer className="luxury-footer" role="contentinfo">
      {newsletter.enabled && (
        <div className="footer-newsletter-section">
          <div className="footer-container">
            <div className="footer-newsletter-card">
              <div className="newsletter-glow" aria-hidden="true" />

              <div className="newsletter-text-col">
                <span className="newsletter-kicker">
                  <Sparkles size={13} />
                  {newsletter.kicker}
                </span>
                <h2 className="newsletter-heading">{newsletter.heading}</h2>
                <p className="newsletter-description">{newsletter.description}</p>
              </div>

              <div className="newsletter-form-col">
                {!subscribed ? (
                  <form className="newsletter-form" onSubmit={handleSubscribe}>
                    <div className="newsletter-input-group">
                      <Mail size={18} className="newsletter-mail-icon" />
                      <input
                        type="email"
                        required
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        aria-label="Email address for newsletter"
                      />
                      <button type="submit" className="newsletter-submit-btn" disabled={submitting}>
                        <span>{submitting ? "Joining…" : "Subscribe"}</span>
                        <ArrowRight size={15} />
                      </button>
                    </div>
                    <span className="newsletter-disclaimer">
                      By signing up, you agree to our{" "}
                      <Link to="/privacy" className="footer-inline-link">
                        Privacy Policy
                      </Link>
                      . Unsubscribe anytime.
                    </span>
                  </form>
                ) : (
                  <div className="newsletter-success-box">
                    <div className="success-icon-wrap">
                      <CheckCircle2 size={24} />
                    </div>
                    <div className="success-text">
                      <strong>You’re on the list!</strong>
                      {newsletter.couponCode ? (
                        <p>
                          Use code{" "}
                          <button
                            type="button"
                            className="promo-copy-tag"
                            onClick={handleCopyPromo}
                            title="Click to copy promo code"
                          >
                            {newsletter.couponCode} {copiedCode ? "✓ Copied" : "Copy"}
                          </button>{" "}
                          at checkout.
                        </p>
                      ) : (
                        <p>Thanks for subscribing.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="footer-main-section">
        <div className="footer-container">
          <div className="footer-columns-grid">
            <div className="footer-col footer-col-brand">
              <Link to="/" className="footer-brand-logo" aria-label={`${store.name} home`}>
                {store.name.includes("&") ? (
                  <>
                    <span className="logo-word">{store.name.split("&")[0].trim()}</span>
                    <span className="logo-amp">&amp;</span>
                    <span className="logo-word">{store.name.split("&")[1].trim()}</span>
                  </>
                ) : (
                  <span className="logo-word">{store.name}</span>
                )}
              </Link>

              <p className="footer-brand-bio">{store.description}</p>

              {socialLinks.length > 0 && (
                <div className="footer-social-wrapper">
                  <span className="social-label">Follow Our Journey</span>
                  <div className="footer-social-links">
                    {socialLinks.map(([href, Icon, label]) => (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${store.name} on ${label}`}
                        className="social-icon-btn"
                      >
                        <Icon size={17} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="footer-col">
              <h3 className="footer-col-title">Shopping</h3>
              <ul className="footer-links-list">
                <li>
                  <Link to="/shop">Shop All Jewelry</Link>
                </li>
                <li>
                  <Link to="/new-arrivals">New Arrivals</Link>
                </li>
                <li>
                  <Link to="/best-sellers">Best Sellers</Link>
                </li>
                {categories.map((category) => (
                  <li key={category.slug}>
                    <Link to={`/category/${category.slug}`}>{category.name}</Link>
                  </li>
                ))}
                <li>
                  <Link to="/collections/bridal">Bridal &amp; Festive Edit</Link>
                </li>
                <li>
                  <Link to="/collections/sale" className="footer-sale-link">
                    Sale &amp; Special Offers
                  </Link>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <h3 className="footer-col-title">Customer Service</h3>
              <ul className="footer-links-list">
                <li>
                  <Link to="/track-order">Track Your Order</Link>
                </li>
                <li>
                  <Link to="/shipping-returns">Shipping &amp; Returns</Link>
                </li>
                <li>
                  <Link to="/jewelry-care">Jewelry Care Guide</Link>
                </li>
                <li>
                  <Link to="/faq">Frequently Asked Questions</Link>
                </li>
                <li>
                  <Link to="/account">My Account &amp; Orders</Link>
                </li>
                <li>
                  <Link to="/wishlist">Saved Wishlist</Link>
                </li>
                <li>
                  <Link to="/contact">Help &amp; Support</Link>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <h3 className="footer-col-title">About the Brand</h3>
              <ul className="footer-links-list">
                <li>
                  <Link to="/about">Our Story</Link>
                </li>
                <li>
                  <Link to="/contact">Contact Us</Link>
                </li>
                <li>
                  <Link to="/privacy">Privacy Policy</Link>
                </li>
                <li>
                  <Link to="/terms">Terms &amp; Conditions</Link>
                </li>
              </ul>
            </div>

            <div className="footer-col footer-col-contact">
              <h3 className="footer-col-title">Contact Us</h3>
              <div className="footer-contact-list">
                {store.supportEmail && (
                  <div className="footer-contact-item">
                    <Mail size={16} className="contact-icon" />
                    <div>
                      <span className="contact-sub">Email</span>
                      <a href={`mailto:${store.supportEmail}`} className="contact-main">
                        {store.supportEmail}
                      </a>
                    </div>
                  </div>
                )}

                {store.supportPhone && (
                  <div className="footer-contact-item">
                    <Phone size={16} className="contact-icon" />
                    <div>
                      <span className="contact-sub">Phone Support</span>
                      <a href={`tel:${store.supportPhone.replace(/[^\d+]/g, "")}`} className="contact-main">
                        {store.supportPhone}
                      </a>
                    </div>
                  </div>
                )}

                {store.address && (
                  <div className="footer-contact-item">
                    <MapPin size={16} className="contact-icon" />
                    <div>
                      <span className="contact-sub">Studio</span>
                      <address className="contact-address">{store.address}</address>
                    </div>
                  </div>
                )}

                {store.hours && (
                  <div className="footer-contact-item">
                    <Clock size={16} className="contact-icon" />
                    <div>
                      <span className="contact-sub">Support Hours</span>
                      <span className="contact-hours">{store.hours}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="footer-trust-row">
            <div className="footer-trust-security">
              <div className="trust-security-badge">
                <Lock size={15} />
                <span>Secure checkout</span>
              </div>
              <div className="trust-security-badge">
                <ShieldCheck size={15} />
                <span>Quality checked before dispatch</span>
              </div>
              <div className="trust-security-badge">
                <Truck size={15} />
                <span>Free delivery over {formatPrice(commerce.freeShippingThreshold)}</span>
              </div>
              <div className="trust-security-badge">
                <RotateCcw size={15} />
                <span>{commerce.returnWindowDays}-day returns</span>
              </div>
            </div>

            <div className="footer-payment-methods" aria-label="Accepted payment methods">
              {payments.onlineEnabled && (
                <div className="payment-badge" title="Online payments">
                  <span className="payment-text">UPI / Cards / NetBanking</span>
                </div>
              )}
              {payments.codEnabled && (
                <div className="payment-badge" title="Cash on delivery">
                  <span className="payment-text">Cash on Delivery</span>
                </div>
              )}
            </div>
          </div>

          <div className="footer-bottom-bar">
            <div className="footer-copyright">
              © {year} {store.name} All rights reserved.
            </div>

            <div className="footer-tagline">{store.tagline}</div>

            <div className="footer-legal-links">
              <Link to="/privacy" className="legal-link">
                Privacy Policy
              </Link>
              <span className="legal-dot">•</span>
              <Link to="/terms" className="legal-link">
                Terms and Conditions
              </Link>
              <span className="legal-dot">•</span>
              <Link to="/shipping-returns" className="legal-link">
                Shipping Policy
              </Link>
              <span className="legal-dot">•</span>
              <Link to="/faq" className="legal-link">
                Help &amp; FAQ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
