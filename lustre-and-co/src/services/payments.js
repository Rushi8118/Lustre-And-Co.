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
 * Opens Razorpay Checkout for an order placed with paymentMethod "razorpay".
 * Resolves to "paid" once the server has verified the signature, or "dismissed".
 */
export async function payOrderOnline(order, storeName) {
  const { data: intent } = await api.post("/payments/create-intent", { orderId: order.orderId });
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
        name: intent.customer?.name,
        email: intent.customer?.email,
        contact: intent.customer?.phone
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
        ondismiss: () => resolve("dismissed")
      }
    });
    checkout.open();
  });
}
