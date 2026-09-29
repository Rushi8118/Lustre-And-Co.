import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { formatPrice } from "../data/products";
import { useStore } from "../context/StoreContext";
import { useSettings } from "../context/SettingsContext";
import api from "../services/api";

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";

const PAYMENT_LABELS = { cod: "Cash on delivery", razorpay: "Paid online (Razorpay)" };

/**
 * A printable bill for one order. "Print" uses the browser's own dialog, which
 * also offers "Save as PDF", so no extra library or server rendering is needed.
 */
export default function Invoice() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const { lastOrder, authReady } = useStore();
  const { settings } = useSettings();

  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState("loading");

  // Guests reach their invoice with the email they ordered with, the same rule
  // the order page uses.
  const email =
    searchParams.get("email") ||
    (lastOrder?.orderId === orderId ? lastOrder.email || lastOrder.customer?.email : undefined);

  const fetchOrder = useCallback(async () => {
    try {
      const { data } = await api.get(`/orders/${encodeURIComponent(orderId)}`, {
        params: email ? { email } : {}
      });
      setOrder(data);
      setStatus("ready");
    } catch {
      setStatus("not-found");
    }
  }, [orderId, email]);

  useEffect(() => {
    if (!authReady) return;
    fetchOrder();
  }, [authReady, fetchOrder]);

  useEffect(() => {
    if (order?.orderId) document.title = `Invoice ${order.orderId} · ${settings.store.name}`;
  }, [order, settings.store.name]);

  if (status === "loading") {
    return (
      <section className="section">
        <div className="container">
          <p className="catalog-loading">Loading your invoice…</p>
        </div>
      </section>
    );
  }

  if (status === "not-found" || !order) {
    return (
      <section className="section">
        <div className="container empty-state">
          <span className="empty-icon">✦</span>
          <h1>We couldn’t open this invoice</h1>
          <p>
            Invoices are only shown to the account that placed the order. You can look up order{" "}
            <strong>{orderId}</strong> with the email used at checkout.
          </p>
          <Link to={`/track-order?order=${encodeURIComponent(orderId)}`} className="button button-dark">
            Track this order
          </Link>
        </div>
      </section>
    );
  }

  const store = settings.store || {};
  const commerce = settings.commerce || {};
  const customer = order.customer || {};
  const address = order.shippingAddress || {};
  const payment = order.payment || {};
  const shippingTotal = Number(order.shippingFee || 0) + Number(order.deliverySurcharge || 0);

  return (
    <div className="invoice-page">
      <div className="container invoice-toolbar no-print">
        <Link to={`/order-confirmation/${encodeURIComponent(order.orderId)}`} className="text-link">
          <ArrowLeft size={15} /> Back to order
        </Link>
        <button type="button" className="button button-dark" onClick={() => window.print()}>
          <Printer size={15} /> Print or save as PDF
        </button>
      </div>

      <article className="invoice-sheet container">
        <header className="invoice-head">
          <div>
            <p className="invoice-brand">{store.name}</p>
            {store.address && <p className="invoice-muted">{store.address}</p>}
            {store.supportEmail && <p className="invoice-muted">{store.supportEmail}</p>}
            {store.supportPhone && <p className="invoice-muted">{store.supportPhone}</p>}
            {store.gstin && (
              <p className="invoice-muted">
                <strong>GSTIN:</strong> {store.gstin}
              </p>
            )}
          </div>
          <div className="invoice-meta">
            <h1>Invoice</h1>
            <p>
              <span className="invoice-muted">Invoice no.</span> <strong>{order.orderId}</strong>
            </p>
            <p>
              <span className="invoice-muted">Date</span> <strong>{formatDate(order.createdAt)}</strong>
            </p>
            <p>
              <span className="invoice-muted">Payment</span>{" "}
              <strong>{PAYMENT_LABELS[payment.method] || payment.method || "—"}</strong>
            </p>
            <p>
              <span className="invoice-muted">Status</span>{" "}
              <strong>{payment.status === "paid" ? "Paid" : "Payment pending"}</strong>
            </p>
          </div>
        </header>

        <section className="invoice-parties">
          <div>
            <h2>Billed to</h2>
            <p>
              <strong>{customer.fullName || address.fullName}</strong>
            </p>
            {customer.email && <p className="invoice-muted">{customer.email}</p>}
            {customer.phone && <p className="invoice-muted">{customer.phone}</p>}
          </div>
          <div>
            <h2>Shipped to</h2>
            <p>{address.fullName || customer.fullName}</p>
            <p className="invoice-muted">
              {[address.addressLine1, address.addressLine2, address.landmark].filter(Boolean).join(", ")}
            </p>
            <p className="invoice-muted">
              {[address.city, address.state, address.postalCode].filter(Boolean).join(", ")}
            </p>
            {address.country && <p className="invoice-muted">{address.country}</p>}
          </div>
        </section>

        <table className="invoice-table">
          <thead>
            <tr>
              <th>Item</th>
              <th className="invoice-num">Price</th>
              <th className="invoice-num">Qty</th>
              <th className="invoice-num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map((item, index) => (
              <tr key={`${item.productId || item.slug || index}`}>
                <td>
                  {item.name}
                  {(item.selectedColor || item.selectedSize) && (
                    <span className="invoice-muted">
                      {" "}
                      ({[item.selectedColor, item.selectedSize].filter(Boolean).join(" · ")})
                    </span>
                  )}
                </td>
                <td className="invoice-num">{formatPrice(item.price)}</td>
                <td className="invoice-num">{item.quantity}</td>
                <td className="invoice-num">{formatPrice(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="invoice-totals">
          <div>
            <span>Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          {Number(order.discount) > 0 && (
            <div>
              <span>Discount{order.promoCode ? ` (${order.promoCode})` : ""}</span>
              <span>−{formatPrice(order.discount)}</span>
            </div>
          )}
          <div>
            <span>Shipping</span>
            <span>{shippingTotal > 0 ? formatPrice(shippingTotal) : "Free"}</span>
          </div>
          {Number(order.tax) > 0 && (
            <div>
              <span>GST{commerce.taxPercent ? ` (${commerce.taxPercent}%)` : ""}</span>
              <span>{formatPrice(order.tax)}</span>
            </div>
          )}
          <div className="invoice-grand">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>

        <footer className="invoice-foot">
          <p>
            {payment.status === "paid"
              ? "Payment received. Thank you for shopping with us."
              : "This invoice is not a receipt of payment until the amount is settled."}
          </p>
          {store.gstin ? (
            <p className="invoice-muted">Tax shown above is charged under GSTIN {store.gstin}.</p>
          ) : (
            <p className="invoice-muted">
              Amounts are inclusive of the tax rate configured for this store.
            </p>
          )}
          <p className="invoice-muted">
            Returns accepted within {commerce.returnWindowDays || 7} days of delivery.
          </p>
        </footer>
      </article>
    </div>
  );
}
