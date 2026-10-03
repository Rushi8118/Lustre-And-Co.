import { useState } from "react";
import { subscribeBackInStock } from "../services/marketing";

export default function BackInStockForm({ productId, productName = "this item" }) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState("email");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setIsSuccess(false);

    try {
      const res = await subscribeBackInStock({
        productId,
        email: channel === "email" ? email : undefined,
        phone: channel !== "email" ? phone : undefined,
        channel,
      });

      setEmail("");
      setPhone("");
      setIsSuccess(true);
      setMessage(
        res?.message || "You will be notified as soon as this exquisite piece returns to stock.",
      );
    } catch (error) {
      setIsSuccess(false);
      setMessage(
        error.response?.data?.message ||
          "We could not save your notification request. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="back-in-stock-box">
      <div className="back-in-stock-header">
        <span className="back-in-stock-badge">Sold Out</span>
        <h4>Notify Me When Available</h4>
        <p>
          Be the first to know when {productName} is back in our atelier.
        </p>
      </div>

      <form className="back-in-stock-form" onSubmit={submit}>
        <div className="back-in-stock-field">
          <label htmlFor="bis-channel">Preferred channel</label>
          <select
            id="bis-channel"
            value={channel}
            onChange={(event) => {
              setChannel(event.target.value);
              setMessage("");
            }}
          >
            <option value="email">Email notification</option>
            <option value="sms">SMS text alert</option>
            <option value="whatsapp">WhatsApp alert</option>
          </select>
        </div>

        {channel === "email" ? (
          <div className="back-in-stock-field">
            <label htmlFor="bis-email">Email address</label>
            <input
              id="bis-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
        ) : (
          <div className="back-in-stock-field">
            <label htmlFor="bis-phone">Phone number</label>
            <input
              id="bis-phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
            />
          </div>
        )}

        <button
          type="submit"
          className="back-in-stock-submit"
          disabled={saving}
        >
          {saving ? "Registering…" : "Alert Me On Restock"}
        </button>

        {message && (
          <div
            className={`back-in-stock-message ${
              isSuccess ? "back-in-stock-success" : "back-in-stock-error"
            }`}
            role="status"
          >
            {message}
          </div>
        )}
      </form>
    </div>
  );
}
