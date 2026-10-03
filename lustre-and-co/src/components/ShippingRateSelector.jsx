import { useEffect, useState } from "react";
import { Truck, Store, Plane, Package, CheckCircle2, Clock } from "lucide-react";
import { calculateShippingRates } from "../services/shipping";

export default function ShippingRateSelector({
  origin,
  destination,
  packages,
  items,
  orderValue,
  paymentMethod = "prepaid",
  value,
  selectedRate,
  onChange,
  onSelect,
}) {
  const currentRate = value || selectedRate;
  const handleSelectRate = onChange || onSelect;

  const [rates, setRates] = useState([]);
  const [deliveryMethod, setDeliveryMethod] = useState("shipping");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const resolvedOrigin = origin || {
    postalCode: "400051",
    addressLine1: "Plot 42, Bandra-Kurla Complex",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
  };

  const resolvedPackages = packages && packages.length
    ? packages
    : (items && items.length
      ? items.map((it) => ({
          lengthCm: 20,
          widthCm: 15,
          heightCm: 8,
          weightKg: Math.max(0.1, (it.weightGrams || 250) / 1000),
          quantity: Number(it.quantity || 1),
          description: it.name || "Jewellery",
        }))
      : [
          {
            lengthCm: 20,
            widthCm: 15,
            heightCm: 8,
            weightKg: 0.5,
            quantity: 1,
            description: "Fine Jewelry Box",
          },
        ]);

  useEffect(() => {
    if (
      !resolvedOrigin?.postalCode ||
      !destination?.postalCode ||
      !resolvedPackages?.length
    ) {
      return;
    }

    let active = true;

    setLoading(true);
    setMessage("");

    calculateShippingRates({
      origin: resolvedOrigin,
      destination,
      packages: resolvedPackages,
      orderValue: Number(orderValue || 0),
      paymentMethod,
      deliveryMethod,
    })
      .then((result) => {
        if (!active) return;

        const fetchedQuotes = result.quotes || [];
        setRates(fetchedQuotes);

        if (fetchedQuotes.length > 0) {
          // Keep current if still present, or pick first
          const stillValid = fetchedQuotes.find(
            (q) => q.quoteToken === currentRate?.quoteToken
          );
          if (stillValid) {
            handleSelectRate?.(stillValid);
          } else {
            handleSelectRate?.(fetchedQuotes[0]);
          }
        }
      })
      .catch((error) => {
        if (!active) return;

        setRates([]);
        setMessage(
          error.response?.data?.message ||
            "Shipping rates are unavailable for this address.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    destination?.postalCode,
    destination?.state,
    orderValue,
    paymentMethod,
    deliveryMethod,
  ]);

  return (
    <section className="shipping-rate-selector">
      <div className="shipping-selector-header">
        <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem", fontWeight: 600 }}>
          Delivery Options &amp; Speed
        </h4>
        <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
          Calculated based on your pincode ({destination?.postalCode || "..."})
        </p>
      </div>

      <div className="shipping-method-options" style={{ display: "flex", gap: "0.5rem", margin: "0.8rem 0" }}>
        <button
          type="button"
          className={`shipping-tab-btn ${deliveryMethod === "shipping" ? "active" : ""}`}
          onClick={() => setDeliveryMethod("shipping")}
          style={{
            flex: 1,
            padding: "0.5rem 0.75rem",
            fontSize: "0.82rem",
            fontWeight: 500,
            borderRadius: "6px",
            border: deliveryMethod === "shipping" ? "1px solid var(--color-gold, #c5a059)" : "1px solid #e2e8f0",
            background: deliveryMethod === "shipping" ? "#fdfbf7" : "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
          }}
        >
          <Plane size={15} /> Standard Shipping
        </button>

        <button
          type="button"
          className={`shipping-tab-btn ${deliveryMethod === "local_delivery" ? "active" : ""}`}
          onClick={() => setDeliveryMethod("local_delivery")}
          style={{
            flex: 1,
            padding: "0.5rem 0.75rem",
            fontSize: "0.82rem",
            fontWeight: 500,
            borderRadius: "6px",
            border: deliveryMethod === "local_delivery" ? "1px solid var(--color-gold, #c5a059)" : "1px solid #e2e8f0",
            background: deliveryMethod === "local_delivery" ? "#fdfbf7" : "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
          }}
        >
          <Truck size={15} /> Local Delivery
        </button>

        <button
          type="button"
          className={`shipping-tab-btn ${deliveryMethod === "store_pickup" ? "active" : ""}`}
          onClick={() => setDeliveryMethod("store_pickup")}
          style={{
            flex: 1,
            padding: "0.5rem 0.75rem",
            fontSize: "0.82rem",
            fontWeight: 500,
            borderRadius: "6px",
            border: deliveryMethod === "store_pickup" ? "1px solid var(--color-gold, #c5a059)" : "1px solid #e2e8f0",
            background: deliveryMethod === "store_pickup" ? "#fdfbf7" : "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
          }}
        >
          <Store size={15} /> Store Pickup
        </button>
      </div>

      {loading ? (
        <div style={{ padding: "0.75rem", textAlign: "center", fontSize: "0.82rem", color: "#64748b" }}>
          Calculating real-time delivery quotes…
        </div>
      ) : null}

      {!loading && rates.length > 0 ? (
        <div className="shipping-rate-list" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {rates.map((rate) => {
            const selected = currentRate?.quoteToken === rate.quoteToken;

            return (
              <label
                key={rate.quoteToken}
                className={`shipping-rate-option ${selected ? "is-selected" : ""}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  border: selected ? "1.5px solid #b8860b" : "1px solid #e2e8f0",
                  backgroundColor: selected ? "#faf8f5" : "#fff",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <input
                    type="radio"
                    name="shipping-rate"
                    checked={selected}
                    onChange={() => handleSelectRate?.(rate)}
                    style={{ accentColor: "#b8860b" }}
                  />

                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      {rate.serviceName}
                      {rate.provider && (
                        <span style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "4px", background: "#f1f5f9", color: "#475569", textTransform: "capitalize" }}>
                          {rate.provider.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "2px" }}>
                      <Clock size={12} />
                      {rate.estimatedDays
                        ? `${rate.estimatedDays} day(s) transit time`
                        : "Express insured carrier"}
                    </div>
                  </div>
                </div>

                <div style={{ fontWeight: 700, fontSize: "0.92rem", color: rate.amount === 0 ? "#16a34a" : "#1e293b" }}>
                  {rate.amount === 0 ? "FREE" : `₹${Number(rate.amount).toFixed(2)}`}
                </div>
              </label>
            );
          })}
        </div>
      ) : null}

      {message ? (
        <div style={{ marginTop: "0.5rem", padding: "0.5rem 0.75rem", borderRadius: "6px", backgroundColor: "#fef2f2", color: "#991b1b", fontSize: "0.8rem" }}>
          {message}
        </div>
      ) : null}
    </section>
  );
}
