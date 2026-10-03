import { useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Facebook, Instagram, Mail, MapPin, MessageCircle, Phone, Youtube } from "lucide-react";
import { useStore } from "../context/StoreContext";
import { useSettings } from "../context/SettingsContext";
import { formatPrice } from "../data/products";
import api, { getErrorMessage } from "../services/api";

const HELP_LINKS = [
  { to: "/track-order", label: "Track your order" },
  { to: "/shipping-returns", label: "Shipping & returns" },
  { to: "/jewelry-care", label: "Jewellery care" },
  { to: "/faq", label: "FAQs" },
  { to: "/contact", label: "Contact us" },
];

const COMPANY_LINKS = [
  { to: "/about", label: "Our story" },
  { to: "/account", label: "My account" },
  { to: "/wishlist", label: "Wishlist" },
  { to: "/privacy", label: "Privacy policy" },
  { to: "/terms", label: "Terms & conditions" },
];

/** Site footer: newsletter band, four link columns, and a legal bottom bar. Every value comes from store settings. */
export default function SiteFooter() {
  const { showToast } = useStore();
  const { settings, categories } = useSettings();
  const { store, social, commerce, newsletter, payments } = settings;
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const socialLinks = [
    [social.instagram, Instagram, "Instagram"],
    [social.facebook, Facebook, "Facebook"],
    [social.youtube, Youtube, "YouTube"],
    [social.whatsapp, MessageCircle, "WhatsApp"],
  ].filter(([href]) => href);

  const paymentLabels = [payments.onlineEnabled && "UPI, cards & net banking", payments.codEnabled && "Cash on delivery"].filter(Boolean);

  return (
    <footer className="sf" role="contentinfo">
      {newsletter.enabled && (
        <div className="sf-news">
          <div className="sf-container sf-news-inner">
            <div>
              <h2 className="sf-news-title">{newsletter.heading}</h2>
              <p className="sf-news-text">{newsletter.description}</p>
            </div>
            {subscribed ? (
              <p className="sf-news-done" role="status">
                Thank you. You are subscribed.
                {newsletter.couponCode && <> Use <strong>{newsletter.couponCode}</strong> at checkout.</>}
              </p>
            ) : (
              <form className="sf-news-form" onSubmit={handleSubscribe}>
                <label htmlFor="sf-email" className="sf-visually-hidden">Email address</label>
                <input id="sf-email" type="email" required placeholder="Email address" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <button type="submit" disabled={submitting}>{submitting ? "Subscribing…" : "Subscribe"}</button>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="sf-container sf-grid">
        <section className="sf-brand" aria-labelledby="sf-brand-name">
          <Link to="/" className="sf-logo" id="sf-brand-name">{store.name}</Link>
          <p>{store.description}</p>
          {socialLinks.length > 0 && (
            <ul className="sf-social" aria-label="Social media">
              {socialLinks.map(([href, Icon, label]) => (
                <li key={label}>
                  <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${store.name} on ${label}`}>
                    <Icon size={17} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <nav className="sf-col" aria-label="Shop">
          <h3>Shop</h3>
          <ul>
            <li><Link to="/shop">All jewellery</Link></li>
            <li><Link to="/new-arrivals">New arrivals</Link></li>
            <li><Link to="/best-sellers">Best sellers</Link></li>
            {categories.slice(0, 6).map((category) => (
              <li key={category.slug}><Link to={`/category/${category.slug}`}>{category.name}</Link></li>
            ))}
            <li><Link to="/collections/sale">Sale</Link></li>
          </ul>
        </nav>

        <nav className="sf-col" aria-label="Help">
          <h3>Help</h3>
          <ul>
            {HELP_LINKS.map((link) => (
              <li key={link.to}><Link to={link.to}>{link.label}</Link></li>
            ))}
          </ul>
        </nav>

        <nav className="sf-col" aria-label="Company">
          <h3>Company</h3>
          <ul>
            {COMPANY_LINKS.map((link) => (
              <li key={link.to}><Link to={link.to}>{link.label}</Link></li>
            ))}
          </ul>
        </nav>

        <section className="sf-col sf-contact" aria-labelledby="sf-contact-title">
          <h3 id="sf-contact-title">Contact</h3>
          <ul>
            {store.supportEmail && (
              <li><Mail size={15} aria-hidden="true" /><a href={`mailto:${store.supportEmail}`}>{store.supportEmail}</a></li>
            )}
            {store.supportPhone && (
              <li><Phone size={15} aria-hidden="true" /><a href={`tel:${store.supportPhone.replace(/[^\d+]/g, "")}`}>{store.supportPhone}</a></li>
            )}
            {store.address && (
              <li><MapPin size={15} aria-hidden="true" /><span>{store.address}</span></li>
            )}
            {store.hours && (
              <li><Clock size={15} aria-hidden="true" /><span>{store.hours}</span></li>
            )}
          </ul>
          {commerce.freeShippingThreshold > 0 && (
            <p className="sf-note">Free delivery on orders over {formatPrice(commerce.freeShippingThreshold)}. Returns within {commerce.returnWindowDays} days.</p>
          )}
        </section>
      </div>

      <div className="sf-container sf-bottom">
        <p className="sf-copy">© {new Date().getFullYear()} {store.name}. All rights reserved.</p>
        {paymentLabels.length > 0 && <p className="sf-pay">{paymentLabels.join(" · ")}</p>}
        {store.tagline && <p className="sf-tagline">{store.tagline}</p>}
      </div>
    </footer>
  );
}
