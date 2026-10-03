import api from "./api";

export async function calculateShippingRates(payload) {
  const { data } = await api.post(
    "/shipping/rates",
    payload,
  );

  return data;
}

export async function checkShippingServiceability(optionsOrPostalCode, destinationOrProvider) {
  if (typeof optionsOrPostalCode === 'object' && optionsOrPostalCode !== null) {
    const { provider, originPincode, destinationPincode } = optionsOrPostalCode;
    const { data } = await api.get("/shipping/serviceability", {
      params: { provider, originPincode, destinationPincode },
    });
    return data;
  }

  // Backwards compatibility
  const { data } = await api.get("/shipping/serviceability", {
    params: {
      originPincode: optionsOrPostalCode,
      destinationPincode: destinationOrProvider,
    },
  });
  return data;
}

export async function getShippingProviders() {
  const { data } = await api.get("/shipping/providers");
  return data;
}

export async function getShippingSettings() {
  const { data } = await api.get(
    "/admin/shipping/settings",
  );

  return data;
}

export async function updateShippingSettings(payload) {
  const { data } = await api.put(
    "/admin/shipping/settings",
    payload,
  );

  return data;
}

export async function createShipment(payload) {
  const { data } = await api.post(
    "/admin/shipping/shipments",
    payload,
  );

  return data;
}

export async function getShipment(id) {
  const { data } = await api.get(
    `/admin/shipping/shipments/${id}`,
  );

  return data;
}

export async function trackShipment(id) {
  const { data } = await api.post(
    `/admin/shipping/shipments/${id}/track`,
  );

  return data;
}

export async function cancelShipment(id) {
  const { data } = await api.post(
    `/admin/shipping/shipments/${id}/cancel`,
  );

  return data;
}

export async function createReturnShipment(payloadOrOrderId, possiblePayload) {
  if (typeof payloadOrOrderId === "string") {
    const { data } = await api.post("/admin/shipping/returns", {
      orderId: payloadOrOrderId,
      ...(possiblePayload || {}),
    });
    return data;
  }
  const { data } = await api.post(
    "/admin/shipping/returns",
    payloadOrOrderId,
  );

  return data;
}

export async function getOrderShipments(orderId) {
  try {
    const { data } = await api.get(
      `/admin/orders/${orderId}/shipments`,
    );
    return data;
  } catch {
    const { data } = await api.get(
      `/shipping/orders/${orderId}/shipments`,
    );
    return data;
  }
}

// Backwards compatibility helpers
export async function createShipmentForOrder(orderId, payload = {}) {
  const { data } = await api.post("/admin/shipping/shipments", {
    orderId,
    ...payload,
  });
  return data;
}

export async function generateShippingLabel(shipmentIdOrOrderId) {
  const { data } = await api.get(`/documents/shipping-labels/order/${encodeURIComponent(shipmentIdOrOrderId)}`);
  return data;
}

export async function getShipmentEvents(shipmentId) {
  try {
    const { data } = await api.get(`/admin/shipping/shipments/${shipmentId}`);
    return data?.trackingEvents || [];
  } catch {
    return [];
  }
}

export async function syncShipments() {
  const { data } = await api.post("/admin/shipping/sync");
  return data;
}

export async function updateShippingProvider(idOrProvider, payload) {
  const { data } = await api.put("/admin/shipping/settings", payload);
  return data;
}

export async function getPublicTracking(orderIdOrTracking) {
  try {
    const { data } = await api.get(`/shipping/orders/${encodeURIComponent(orderIdOrTracking)}/shipments`);
    return Array.isArray(data) ? data[0] : data;
  } catch {
    return null;
  }
}

export async function getShipments(params = {}) {
  try {
    const { data } = await api.get("/admin/shipping/shipments", { params });
    return data?.shipments || data || [];
  } catch {
    try {
      const { data } = await api.get("/admin/orders", { params });
      return data?.orders || data || [];
    } catch {
      return [];
    }
  }
}
