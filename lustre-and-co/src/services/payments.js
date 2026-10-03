import api from "./api";

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT;
    script.onload = () => resolve();
    script.onerror = () => {
      const error = new Error("Razorpay failed to load");
      error.userMessage = "The payment window could not be loaded. Please check your connection and try again.";
      reject(error);
    };
    document.body.appendChild(script);
  });
}

/**
 * Development-only stand-in for the Razorpay window. The server only returns mode "mock"
 * when MOCK_PAYMENT_MODE is on in development, so this never runs in production.
 */
async function completeMockPayment(order) {
  const answer = window.prompt("MOCK payment (development only). Outcome: success, failed or cancelled", "success");
  const outcome = (answer || "cancelled").trim().toLowerCase();

  if (outcome === "failed") {
    await api.post("/payments/mock/complete", { orderId: order.orderId, outcome: "failed" });
    const error = new Error("Mock payment declined");
    error.userMessage = "The mock payment was declined. You can retry from the confirmation page.";
    throw error;
  }

  if (outcome === "success") {
    await api.post("/payments/mock/complete", { orderId: order.orderId, outcome: "success" });
    return "paid";
  }

  await api.post("/payments/mock/complete", { orderId: order.orderId, outcome: "cancelled" });
  return "dismissed";
}

/**
 * Starts an online payment for an order placed with paymentMethod "razorpay".
 * Resolves to "paid" once the server has verified it, or "dismissed" if the customer closed the window.
 */
export async function payOrderOnline(order, storeName) {
  const { data: intent } = await api.post("/payments/create-intent", { orderId: order.orderId });

  if (intent.mode === "mock") {
    return completeMockPayment(order);
  }

  await loadRazorpay();

  return new Promise((resolve, reject) => {
    const checkout = new window.Razorpay({
      key: intent.keyId,
      amount: intent.amount,
      currency: intent.currency,
      name: storeName,
      description: `Order ${order.orderId}`,
      order_id: intent.razorpayOrderId,
      prefill: {
        name: order.customer?.fullName,
        email: order.customer?.email,
        contact: order.customer?.phone
      },
      handler: async (response) => {
        try {
          await api.post("/payments/verify", {
            orderId: order.orderId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature
          });
          resolve("paid");
        } catch (err) {
          reject(err);
        }
      },
      modal: {
        ondismiss: () => {
          // Record the closed window on the server. Failures here are not shown to the customer.
          api.post("/payments/cancel", { orderId: order.orderId }).catch(() => null);
          resolve("dismissed");
        }
      }
    });
    checkout.open();
  });
}
