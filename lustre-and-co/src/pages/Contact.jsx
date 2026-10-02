import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageIntro from "../components/PageIntro";
import { useSettings } from "../context/SettingsContext";
import { useStore } from "../context/StoreContext";
import api, { getErrorMessage } from "../services/api";

const REASONS = ["Order status", "Product question", "Returns and exchanges", "Payment issue", "Other"];

export default function Contact() {
  const [searchParams] = useSearchParams();
  const { settings } = useSettings();
  const { user } = useStore();
  const { store } = settings;

  const initialReason = REASONS.includes(searchParams.get("reason")) ? searchParams.get("reason") : "Order status";
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    reason: initialReason,
    orderId: searchParams.get("order") || "",
    message: ""
  });
  const [status, setStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);
    try {
      const { data } = await api.post("/contact", {
        ...form,
        phone: form.phone || undefined,
        orderId: form.orderId || undefined
      });
      setStatus({ success: true, text: data.message });
      setForm((current) => ({ ...current, message: "", orderId: "" }));
    } catch (err) {
      setStatus({ success: false, text: getErrorMessage(err, "Your message could not be sent.") });
    } finally {
      setIsSubmitting(false);
    }
  }

  const whatsappHref = store.whatsappNumber ? `https://wa.me/${store.whatsappNumber.replace(/\D/g, "")}` : null;

  return (
    <>
      <PageIntro
        eyebrow="We’re here to help"
        title="Contact us"
        description="Have a question about an order, a piece, or choosing the perfect gift? We would love to hear from you."
        breadcrumbs={[{ label: "Contact Us" }]}
      />

      <section className="section contact-section">
        <div className="container contact-grid">
          <div className="contact-details">
            <span className="eyebrow">Get in touch</span>
            <h2>Let’s make your experience feel as beautiful as your jewelry.</h2>

            {store.supportEmail && (
              <div className="contact-detail-item">
                <Mail size={20} />
                <div>
                  <strong>Email us</strong>
                  <a href={`mailto:${store.supportEmail}`}>{store.supportEmail}</a>
                </div>
              </div>
            )}

            {store.supportPhone && (
              <div className="contact-detail-item">
                <Phone size={20} />
                <div>
                  <strong>Call us</strong>
                  <a href={`tel:${store.supportPhone.replace(/[^\d+]/g, "")}`}>{store.supportPhone}</a>
                </div>
              </div>
            )}

            {whatsappHref && (
              <div className="contact-detail-item">
                <MessageCircle size={20} />
                <div>
                  <strong>WhatsApp support</strong>
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                    Message us on WhatsApp
                  </a>
                </div>
              </div>
            )}

            {store.hours && (
              <div className="contact-detail-item">
                <Clock size={20} />
                <div>
                  <strong>Support hours</strong>
                  <span>{store.hours}</span>
                </div>
              </div>
            )}

            {store.address && (
              <div className="contact-detail-item">
                <MapPin size={20} />
                <div>
                  <strong>Studio</strong>
                  <span>{store.address}</span>
                </div>
              </div>
            )}
          </div>

          <form className="contact-form" onSubmit={submit}>
            <label>
              Name
              <input name="name" required value={form.name} onChange={update} placeholder="Your name" autoComplete="name" />
            </label>

            <label>
              Email address
              <input name="email" type="email" required value={form.email} onChange={update} placeholder="you@example.com" autoComplete="email" />
            </label>

            <label>
              Phone (optional)
              <input name="phone" type="tel" value={form.phone} onChange={update} autoComplete="tel" />
            </label>

            <label>
              Reason for contact
              <select name="reason" value={form.reason} onChange={update}>
                {REASONS.map((reason) => (
                  <option key={reason}>{reason}</option>
                ))}
              </select>
            </label>

            <label>
              Order number (optional)
              <input name="orderId" value={form.orderId} onChange={update} placeholder="LST-12345678" />
            </label>

            <label>
              Message
              <textarea name="message" required value={form.message} onChange={update} placeholder="How can we help?" />
            </label>

            <button className="button button-dark" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending…" : "Send message"}
            </button>

            {status && <p className={status.success ? "form-success" : "form-error"}>{status.text}</p>}
          </form>
        </div>
      </section>
    </>
  );
}
