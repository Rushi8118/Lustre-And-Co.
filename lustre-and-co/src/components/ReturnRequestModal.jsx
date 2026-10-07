import { useState, useEffect } from "react";
import {
  X,
  Upload,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Gift,
  ArrowRight,
  ShieldCheck,
  Package,
} from "lucide-react";
import { checkReturnEligibility, createReturnRequest } from "../services/returns";
import { formatPrice } from "../data/products";
import SmartImage from "./SmartImage";

export default function ReturnRequestModal({
  orderId,
  isOpen,
  onClose,
  onSuccess,
}) {
  const [loading, setLoading] = useState(true);
  const [eligibility, setEligibility] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [requestType, setRequestType] = useState("return");
  const [reason, setReason] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [refundPreference, setRefundPreference] = useState("original_payment");
  const [selectedItems, setSelectedItems] = useState({});
  const [photos, setPhotos] = useState([]);
  const [pickupAddress, setPickupAddress] = useState({
    fullName: "",
    phone: "",
    addressLine1: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  });

  useEffect(() => {
    if (!isOpen || !orderId) return;

    let active = true;
    setLoading(true);
    setError("");

    checkReturnEligibility(orderId)
      .then((data) => {
        if (!active) return;
        setEligibility(data);
        if (data.allowedReasons?.length) {
          setReason(data.allowedReasons[0]);
        }

        // Initialize selected items (default to first item)
        const initialMap = {};
        data.items?.forEach((item, idx) => {
          initialMap[item.productId] = {
            selected: idx === 0,
            quantity: 1,
            maxQuantity: item.quantity,
            exchangeColor: item.color || "",
            exchangeSize: item.size || "",
            reason: "",
          };
        });
        setSelectedItems(initialMap);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err.response?.data?.message ||
            "Unable to verify return eligibility for this order.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, orderId]);

  if (!isOpen) return null;

  function toggleItemSelection(productId) {
    setSelectedItems((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        selected: !prev[productId]?.selected,
      },
    }));
  }

  function updateItemField(productId, field, value) {
    setSelectedItems((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value,
      },
    }));
  }

  function handlePhotoUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.slice(0, 4).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setPhotos((prev) => [...prev, uploadEvent.target.result].slice(0, 4));
      };
      reader.readAsDataURL(file);
    });
  }

  function removePhoto(index) {
    setPhotos((prev) => prev.filter((_, idx) => idx !== index));
  }

  // Calculate estimated refund
  const itemsToSubmit = (eligibility?.items || []).filter(
    (item) => selectedItems[item.productId]?.selected,
  );

  const calculatedSubtotal = itemsToSubmit.reduce((sum, item) => {
    const state = selectedItems[item.productId];
    const qty = state ? Number(state.quantity || 1) : 1;
    return sum + item.price * qty;
  }, 0);

  const storeCreditBonus =
    refundPreference === "store_credit"
      ? (calculatedSubtotal * (eligibility?.storeCreditBonusPercent || 5)) / 100
      : 0;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!itemsToSubmit.length) {
      setError("Please select at least one piece to return or exchange.");
      return;
    }
    if (!reason) {
      setError("Please select a return reason.");
      return;
    }

    setSubmitting(true);
    setError("");

    const payload = {
      orderIdentifier: orderId,
      requestType,
      reason,
      customerNotes: customerNotes.trim() || undefined,
      refundPreference,
      items: itemsToSubmit.map((item) => {
        const state = selectedItems[item.productId];
        return {
          productId: item.productId,
          name: item.name,
          color: item.color,
          size: item.size,
          quantity: state.quantity || 1,
          reason: state.reason || reason,
          exchangeColor:
            requestType === "exchange" ? state.exchangeColor : undefined,
          exchangeSize:
            requestType === "exchange" ? state.exchangeSize : undefined,
        };
      }),
      photos,
      pickupAddress: pickupAddress.addressLine1
        ? pickupAddress
        : undefined,
    };

    try {
      const result = await createReturnRequest(payload);
      if (onSuccess) onSuccess(result);
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to submit return request. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(10, 8, 6, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "680px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          border: "1px solid #e5ded2",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #eee",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            background: "#fff",
            zIndex: 10,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                fontFamily: "Cinzel, Georgia, serif",
                color: "#1a1714",
              }}
            >
              Request Return or Exchange
            </h2>
            <span style={{ fontSize: "12px", color: "#777" }}>
              Order #{orderId} • {eligibility?.windowDays || 7}-Day Hassle-Free Returns
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#888",
              padding: "4px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "24px" }}>
          {loading && (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <RefreshCw
                size={28}
                className="spin"
                style={{ color: "#d4af37", marginBottom: "12px" }}
              />
              <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
                Verifying return eligibility…
              </p>
            </div>
          )}

          {!loading && error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                padding: "12px 16px",
                borderRadius: "8px",
                marginBottom: "20px",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}

          {!loading && eligibility && (
            <form onSubmit={handleSubmit}>
              {/* Type Switcher */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  marginBottom: "24px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setRequestType("return")}
                  style={{
                    padding: "14px",
                    borderRadius: "8px",
                    border:
                      requestType === "return"
                        ? "2px solid #1a1714"
                        : "1px solid #ddd",
                    background:
                      requestType === "return" ? "#faf8f5" : "#fff",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <strong style={{ display: "block", fontSize: "14px", color: "#1a1714" }}>
                    Standard Return
                  </strong>
                  <span style={{ fontSize: "12px", color: "#666" }}>
                    Refund to original payment or store credit
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRequestType("exchange")}
                  style={{
                    padding: "14px",
                    borderRadius: "8px",
                    border:
                      requestType === "exchange"
                        ? "2px solid #8a6d3b"
                        : "1px solid #ddd",
                    background:
                      requestType === "exchange" ? "#fbf6ee" : "#fff",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <strong style={{ display: "block", fontSize: "14px", color: "#8a6d3b" }}>
                    Exchange Piece
                  </strong>
                  <span style={{ fontSize: "12px", color: "#666" }}>
                    Swap size, tone, or replacement piece
                  </span>
                </button>
              </div>

              {/* Items Selection */}
              <div style={{ marginBottom: "24px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "#555",
                    marginBottom: "10px",
                  }}
                >
                  Select Pieces to {requestType === "return" ? "Return" : "Exchange"}
                </label>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {eligibility.items?.map((item) => {
                    const state = selectedItems[item.productId] || {};
                    return (
                      <div
                        key={item.productId}
                        style={{
                          border: state.selected
                            ? "1px solid #8a6d3b"
                            : "1px solid #e5e5e5",
                          borderRadius: "8px",
                          padding: "12px",
                          background: state.selected ? "#faf8f5" : "#fff",
                          display: "flex",
                          gap: "14px",
                          alignItems: "flex-start",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(state.selected)}
                          onChange={() => toggleItemSelection(item.productId)}
                          style={{ marginTop: "4px", width: "16px", height: "16px", cursor: "pointer" }}
                        />

                        {item.image && (
                          <SmartImage
                            src={item.image}
                            alt={item.name}
                            width={120}
                            style={{
                              width: "56px",
                              height: "56px",
                              objectFit: "cover",
                              borderRadius: "6px",
                              border: "1px solid #eee",
                            }}
                          />
                        )}

                        <div style={{ flex: 1 }}>
                          <strong style={{ fontSize: "14px", color: "#1a1714" }}>
                            {item.name}
                          </strong>
                          <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
                            {item.color} {item.size ? `• Size: ${item.size}` : ""} • {formatPrice(item.price)}
                          </div>

                          {state.selected && (
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "12px",
                                marginTop: "10px",
                                paddingTop: "10px",
                                borderTop: "1px dashed #e2dcd2",
                              }}
                            >
                              <div>
                                <label style={{ fontSize: "11px", color: "#666", display: "block" }}>
                                  Qty to Return
                                </label>
                                <select
                                  value={state.quantity}
                                  onChange={(e) =>
                                    updateItemField(
                                      item.productId,
                                      "quantity",
                                      Number(e.target.value),
                                    )
                                  }
                                  style={{
                                    padding: "4px 8px",
                                    fontSize: "12px",
                                    borderRadius: "4px",
                                    border: "1px solid #ccc",
                                  }}
                                >
                                  {Array.from(
                                    { length: state.maxQuantity || 1 },
                                    (_, i) => (
                                      <option key={i + 1} value={i + 1}>
                                        {i + 1}
                                      </option>
                                    ),
                                  )}
                                </select>
                              </div>

                              {requestType === "exchange" && (
                                <>
                                  <div>
                                    <label style={{ fontSize: "11px", color: "#666", display: "block" }}>
                                      Preferred Color/Finish
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="e.g. Rose Gold"
                                      value={state.exchangeColor}
                                      onChange={(e) =>
                                        updateItemField(
                                          item.productId,
                                          "exchangeColor",
                                          e.target.value,
                                        )
                                      }
                                      style={{
                                        padding: "4px 8px",
                                        fontSize: "12px",
                                        borderRadius: "4px",
                                        border: "1px solid #ccc",
                                        width: "120px",
                                      }}
                                    />
                                  </div>

                                  <div>
                                    <label style={{ fontSize: "11px", color: "#666", display: "block" }}>
                                      Preferred Size
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="e.g. Size 7"
                                      value={state.exchangeSize}
                                      onChange={(e) =>
                                        updateItemField(
                                          item.productId,
                                          "exchangeSize",
                                          e.target.value,
                                        )
                                      }
                                      style={{
                                        padding: "4px 8px",
                                        fontSize: "12px",
                                        borderRadius: "4px",
                                        border: "1px solid #ccc",
                                        width: "90px",
                                      }}
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Return Reason */}
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "#555",
                    marginBottom: "6px",
                  }}
                >
                  Primary Reason
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                    fontSize: "13px",
                  }}
                >
                  {eligibility.allowedReasons?.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Photo Proof Upload */}
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "#555",
                    marginBottom: "6px",
                  }}
                >
                  Upload Photos (Recommended for Faster Approval)
                </label>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <label
                    style={{
                      border: "2px dashed #d1c7b7",
                      borderRadius: "8px",
                      padding: "14px 18px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "13px",
                      color: "#666",
                      background: "#faf9f7",
                    }}
                  >
                    <Upload size={16} />
                    <span>Choose Photos</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      style={{ display: "none" }}
                    />
                  </label>
                  <span style={{ fontSize: "11px", color: "#888" }}>
                    Upload up to 4 clear photos of the item &amp; packaging.
                  </span>
                </div>

                {photos.length > 0 && (
                  <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                    {photos.map((src, idx) => (
                      <div
                        key={idx}
                        style={{
                          position: "relative",
                          width: "60px",
                          height: "60px",
                          borderRadius: "6px",
                          overflow: "hidden",
                          border: "1px solid #ddd",
                        }}
                      >
                        <img
                          src={src}
                          alt={`Uploaded photo ${idx + 1} supporting this return`}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          style={{
                            position: "absolute",
                            top: 2,
                            right: 2,
                            background: "rgba(0,0,0,0.6)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "50%",
                            width: "16px",
                            height: "16px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "10px",
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Refund Method Preference */}
              {requestType === "return" && (
                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      color: "#555",
                      marginBottom: "8px",
                    }}
                  >
                    Refund Preference
                  </label>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <label
                      style={{
                        border:
                          refundPreference === "store_credit"
                            ? "2px solid #8a6d3b"
                            : "1px solid #ddd",
                        borderRadius: "8px",
                        padding: "12px",
                        cursor: "pointer",
                        background:
                          refundPreference === "store_credit" ? "#fbf6ee" : "#fff",
                        display: "flex",
                        gap: "10px",
                        alignItems: "flex-start",
                      }}
                    >
                      <input
                        type="radio"
                        name="refundPref"
                        checked={refundPreference === "store_credit"}
                        onChange={() => setRefundPreference("store_credit")}
                        style={{ marginTop: "3px" }}
                      />
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <strong style={{ fontSize: "13px", color: "#1a1714" }}>
                            Store Credit
                          </strong>
                          <span
                            style={{
                              background: "#d4af37",
                              color: "#fff",
                              fontSize: "10px",
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: "4px",
                            }}
                          >
                            +5% BONUS
                          </span>
                        </div>
                        <span style={{ fontSize: "11px", color: "#666" }}>
                          Instant wallet credit on return inspection with 5% bonus value.
                        </span>
                      </div>
                    </label>

                    <label
                      style={{
                        border:
                          refundPreference === "original_payment"
                            ? "2px solid #1a1714"
                            : "1px solid #ddd",
                        borderRadius: "8px",
                        padding: "12px",
                        cursor: "pointer",
                        background:
                          refundPreference === "original_payment" ? "#faf8f5" : "#fff",
                        display: "flex",
                        gap: "10px",
                        alignItems: "flex-start",
                      }}
                    >
                      <input
                        type="radio"
                        name="refundPref"
                        checked={refundPreference === "original_payment"}
                        onChange={() => setRefundPreference("original_payment")}
                        style={{ marginTop: "3px" }}
                      />
                      <div>
                        <strong style={{ fontSize: "13px", color: "#1a1714" }}>
                          Original Payment
                        </strong>
                        <span style={{ fontSize: "11px", color: "#666", display: "block" }}>
                          Refunded to source account / card within 5–7 business days.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Customer Notes */}
              <div style={{ marginBottom: "24px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "#555",
                    marginBottom: "6px",
                  }}
                >
                  Additional Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Tell our concierge team any additional specifics..."
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                    fontSize: "13px",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Refund Summary Strip */}
              <div
                style={{
                  background: "#fdfbf7",
                  border: "1px solid #ede4d3",
                  borderRadius: "8px",
                  padding: "16px",
                  marginBottom: "24px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px" }}>
                  <span style={{ color: "#666" }}>Items Selected for Return:</span>
                  <strong>{itemsToSubmit.length} piece(s)</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px" }}>
                  <span style={{ color: "#666" }}>Calculated Item Refund:</span>
                  <strong>{formatPrice(calculatedSubtotal)}</strong>
                </div>
                {storeCreditBonus > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px", color: "#15803d" }}>
                    <span>Store Credit Bonus (+5%):</span>
                    <strong>+{formatPrice(storeCreditBonus)}</strong>
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderTop: "1px solid #e5ded2",
                    paddingTop: "8px",
                    marginTop: "6px",
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "#1a1714",
                  }}
                >
                  <span>Total Estimated Credit:</span>
                  <span style={{ color: "#8a6d3b" }}>
                    {formatPrice(calculatedSubtotal + storeCreditBonus)}
                  </span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                    background: "#fff",
                    color: "#333",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !itemsToSubmit.length}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "6px",
                    border: "none",
                    background: "#1a1714",
                    color: "#fff",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: submitting || !itemsToSubmit.length ? "not-allowed" : "pointer",
                    opacity: submitting || !itemsToSubmit.length ? 0.6 : 1,
                  }}
                >
                  {submitting ? "Submitting Request…" : "Confirm Request"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
