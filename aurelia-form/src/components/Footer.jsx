import { Link } from "react-router-dom";
import { Instagram, Mail, MapPin, Phone, Youtube } from "lucide-react";
import { SHIPPING_NOTE } from "../data/products";

const SHOP_LINKS = [
  { to: "/collections", label: "Collections" },
  { to: "/shop/rings", label: "Rings" },
  { to: "/shop/necklaces", label: "Necklaces" },
  { to: "/shop/earrings", label: "Earrings" },
  { to: "/shop/bracelets", label: "Bracelets" },
];

const HOUSE_LINKS = [
  { to: "/story", label: "Our Story" },
  { to: "/journal", label: "Journal" },
  { to: "/account", label: "Account" },
  { to: "/wishlist", label: "Wishlist" },
];

const PAYMENTS = ["UPI", "Visa", "Mastercard", "RuPay", "Net Banking"];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <section className="footer-brand" aria-labelledby="footer-brand-title">
          <h2 id="footer-brand-title" className="footer-title">Aurelia Form</h2>
          <p className="footer-tagline">Jewellery with a story in every curve.</p>
          <div className="footer-social" aria-label="Social media">
            <a href="https://example.com/instagram" aria-label="Instagram" rel="noopener noreferrer"><Instagram size={18} /></a>
            <a href="https://example.com/youtube" aria-label="YouTube" rel="noopener noreferrer"><Youtube size={18} /></a>
          </div>
        </section>

        <nav className="footer-col" aria-label="Shop">
          <h3>Shop</h3>
          <ul>
            {SHOP_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="footer-col" aria-label="The house">
          <h3>The house</h3>
          <ul>
            {HOUSE_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <section className="footer-col" aria-labelledby="footer-contact">
          <h3 id="footer-contact">Contact</h3>
          <ul className="footer-contact">
            <li><Mail size={15} aria-hidden="true" /><a href="mailto:hello@aureliaform.example">hello@aureliaform.example</a></li>
            <li><Phone size={15} aria-hidden="true" /><a href="tel:+910000000000">+91 00000 00000</a></li>
            <li><MapPin size={15} aria-hidden="true" /><span>Studio address on request</span></li>
          </ul>
          <p className="footer-note">{SHIPPING_NOTE}</p>
        </section>
      </div>

      <div className="container footer-bottom">
        <ul className="payment-list" aria-label="Accepted payment methods">
          {PAYMENTS.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
        <p>© {new Date().getFullYear()} Aurelia Form. All rights reserved.</p>
        <nav aria-label="Legal" className="legal-links">
          <a href="#privacy">Privacy</a>
          <a href="#terms">Terms</a>
          <a href="#care">Care</a>
        </nav>
      </div>
    </footer>
  );
}
