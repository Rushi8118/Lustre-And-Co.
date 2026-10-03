import { useEffect, useState } from "react";
import { getOrderShipments } from "../services/shipping";
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

const labels = {
  pending: "Preparing shipment",
  booked: "Shipment booked",
  pickup_scheduled: "Pickup scheduled",
  picked_up: "Picked up",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  failed: "Shipping failed",
  returned: "Returned",
  exception: "Delivery exception",
};

export default function ShipmentTracking({
  orderId,
}) {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    let active = true;
    getOrderShipments(orderId)
      .then((data) => {
        if (active) setShipments(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setShipments([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [orderId]);

  if (loading) {
    return (
      <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--color-text-muted)" }}>
        <p>Loading shipment details…</p>
      </div>
    );
  }

  if (!shipments.length) {
    return (
      <div style={{ padding: "1.2rem", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: "0.9rem", color: "#64748b" }}>
          Shipment details are not available yet. Your order is being carefully packaged in our vault.
        </p>
      </div>
    );
  }

  return (
    <section className="shipment-tracking-container" style={{ margin: "1.5rem 0" }}>
      <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Truck size={18} color="var(--color-gold, #c5a059)" /> Delivery tracking
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
        {shipments.map((shipment) => {
          const isReturn = shipment.shipment_type === "return";
          const isDelivered = shipment.status === "delivered";

          return (
            <article
              key={shipment.id}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "1.2rem",
                backgroundColor: "#ffffff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                  borderBottom: "1px solid #f1f5f9",
                  paddingBottom: "0.8rem",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {isReturn ? (
                    <RotateCcw size={16} color="#d97706" />
                  ) : (
                    <Package size={16} color="var(--color-gold, #c5a059)" />
                  )}
                  <strong style={{ fontSize: "0.95rem" }}>
                    {isReturn ? "Return Shipment" : "Outbound Shipment"}
                  </strong>
                  <span style={{ fontSize: "0.78rem", color: "#64748b", textTransform: "capitalize" }}>
                    • {shipment.provider?.replace(/_/g, " ")}
                  </span>
                </div>

                <span
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: "9999px",
                    backgroundColor: isDelivered ? "#dcfce7" : "#fef3c7",
                    color: isDelivered ? "#166534" : "#92400e",
                  }}
                >
                  {labels[shipment.status] || shipment.status}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.8rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
                {shipment.tracking_number && (
                  <div>
                    <span style={{ color: "#64748b" }}>Tracking Number: </span>
                    <strong style={{ fontFamily: "monospace", letterSpacing: "0.5px" }}>
                      {shipment.tracking_number}
                    </strong>
                  </div>
                )}

                {shipment.estimated_delivery_date && (
                  <div>
                    <span style={{ color: "#64748b" }}>Estimated Delivery: </span>
                    <strong>{new Date(shipment.estimated_delivery_date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</strong>
                  </div>
                )}

                {shipment.label_url && (
                  <div>
                    <a
                      href={shipment.label_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#b8860b", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                    >
                      View shipping label <ExternalLink size={13} />
                    </a>
                  </div>
                )}
              </div>

              {shipment.trackingEvents?.length > 0 && (
                <div style={{ marginTop: "1rem", paddingTop: "0.8rem", borderTop: "1px solid #f8fafc" }}>
                  <h4 style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.6rem" }}>
                    Milestones &amp; Scans
                  </h4>
                  <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {shipment.trackingEvents
                      .slice()
                      .sort(
                        (a, b) =>
                          new Date(b.event_time) -
                          new Date(a.event_time),
                      )
                      .map((event) => (
                        <li
                          key={event.id}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "0.6rem",
                            fontSize: "0.82rem",
                            borderLeft: "2px solid #cbd5e1",
                            paddingLeft: "0.8rem",
                            position: "relative",
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, color: "#1e293b" }}>
                              {labels[event.status] || event.status}
                            </div>
                            {event.location && (
                              <div style={{ color: "#64748b", display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "1px" }}>
                                <MapPin size={11} /> {event.location}
                              </div>
                            )}
                            {event.description && event.description !== event.status && (
                              <div style={{ color: "#475569", marginTop: "2px", fontSize: "0.8rem" }}>
                                {event.description}
                              </div>
                            )}
                            <small style={{ color: "#94a3b8", display: "block", marginTop: "2px" }}>
                              {new Date(event.event_time).toLocaleString("en-IN")}
                            </small>
                          </div>
                        </li>
                      ))}
                  </ol>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
