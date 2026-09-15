import { useSearchParams } from "react-router-dom";
import { Package, Check, Truck, Home, XCircle } from "lucide-react";
import { useState } from "react";
import PageIntro from "../components/PageIntro";
import { useStore } from "../context/StoreContext";
import { useSettings } from "../context/SettingsContext";
import { formatPrice } from "../data/products";
import api, { getErrorMessage } from "../services/api";

const stages = [
  { status: "Confirmed", title: "Order placed", icon: Check },
  { status: "Processing", title: "Processing", icon: Package },
  { status: "In Transit", title: "Shipped", icon: Truck },
  { status: "Delivered", title: "Delivered", icon: Home }
];

export default function TrackOrder() {
  const [searchParams] = useSearchParams();
  const { user, lastOrder } = useStore();
  const { settings } = useSettings();

  const [orderNumber, setOrderNumber] = useState(searchParams.get("order") || "");
  const [email, setEmail] = useState(user?.email || lastOrder?.email || "");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setIsSearching(true);
    setError("");
    setResult(null);
    try {
      const { data } = await api.get("/orders/track", {
        params: { orderId: orderNumber.trim(), email: email.trim() }
      });
      setResult(data);
    } catch (err) {
      setError(getErrorMessage(err, "We could not find that order."));
    } finally {
      setIsSearching(false);
    }
  }

  const isCancelled = result?.status === "Cancelled";
  const currentStage = result ? stages.findIndex((stage) => stage.status === result.status) : -1;
  const currentTitle = isCancelled ? "Cancelled" : stages[currentStage]?.title || result?.status;

  return (
    <>
      <PageIntro
        eyebrow="Order updates"
        title="Track your order"
        description="Enter your order number and the email used at checkout to see the latest status."
        breadcrumbs={[{ label: "Order Tracking" }]}
      />

      <section className="section tracking-section">
        <div className="container">
          <div className="tracking-search-card">
            <form onSubmit={submit} className="tracking-form">
              <label>
                Order number
                <input
                  value={orderNumber}
                  onChange={(event) => setOrderNumber(event.target.value)}
                  placeholder="Example: LST-12345678"
                  required
                />
              </label>

              <label>
                Email address
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>

              <button type="submit" className="button button-dark" disabled={isSearching}>
                {isSearching ? "Searching…" : "Track order"}
              </button>
            </form>
            {error && <p className="inline-alert inline-alert-error">{error}</p>}
          </div>

          {result && (
            <div className="tracking-result">
              <div className="tracking-result-header">
                <div>
                  <span className="eyebrow">Order found</span>
                  <h2>{result.orderId}</h2>
                </div>
                <span className="status-pill">{currentTitle}</span>
              </div>

              {isCancelled ? (
                <p className="inline-alert inline-alert-error">
                  <XCircle size={16} /> This order was cancelled. Contact us if you have questions.
                </p>
              ) : (
                <div className="tracking-timeline">
                  {stages.map((stage, index) => {
                    const Icon = stage.icon;
                    return (
                      <div className={`tracking-stage ${index <= currentStage ? "is-active" : ""}`} key={stage.status}>
                        <div className="tracking-stage-icon">
                          <Icon size={17} />
                        </div>
                        <span>{stage.title}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="tracking-details-grid">
                <div>
                  <span>Placed</span>
                  <strong>{new Date(result.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</strong>
                </div>
                <div>
                  <span>Estimated delivery</span>
                  <strong>{result.estimatedDeliveryDate}</strong>
                </div>
                <div>
                  <span>Carrier</span>
                  <strong>{result.carrier}</strong>
                </div>
                <div>
                  <span>Tracking number</span>
                  <strong>{result.trackingNumber || "Shared once shipped"}</strong>
                </div>
                <div>
                  <span>Total</span>
                  <strong>{formatPrice(result.total)}</strong>
                </div>
                <div>
                  <span>Payment</span>
                  <strong>
                    {result.payment?.method === "cod" ? "Cash on delivery" : "Online"} · {result.payment?.status}
                  </strong>
                </div>
              </div>

              {result.statusHistory?.length > 0 && (
                <ol className="tracking-history">
                  {[...result.statusHistory].reverse().map((entry, index) => (
                    <li key={`${entry.at}-${index}`}>
                      <strong>{entry.status}</strong>
                      {entry.note && <span> — {entry.note}</span>}
                      <time>{new Date(entry.at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</time>
                    </li>
                  ))}
                </ol>
              )}

              <div className="tracking-help">
                <p>Questions about this order? We’re happy to help.</p>
                <a href={`mailto:${settings.store.supportEmail}?subject=Order ${result.orderId}`} className="text-link">
                  Contact support
                </a>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
