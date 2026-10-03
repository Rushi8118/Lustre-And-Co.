import api from "./api";

// ─── Checkout Reservation (public endpoints) ─────────────────────────────────

export async function reserveInventory(payload) {
  const { data } = await api.post("/inventory/reservations", payload);
  return data;
}

export async function releaseInventoryReservation(reservationToken, status = "released") {
  const { data } = await api.post(
    `/inventory/reservations/${reservationToken}/release`,
    { status },
  );
  return data;
}

export async function commitInventoryReservation(reservationToken, orderId) {
  const { data } = await api.post(
    `/inventory/reservations/${reservationToken}/commit`,
    { orderId },
  );
  return data;
}

// ─── Admin: Products ─────────────────────────────────────────────────────────

export async function getInventory(params = {}) {
  const { data } = await api.get("/admin/inventory", { params });
  return data;
}

export async function getProductInventory(productId) {
  const { data } = await api.get(`/admin/inventory/${productId}`);
  return data;
}

export async function updateProductInventory(productId, payload) {
  const { data } = await api.put(`/admin/inventory/${productId}`, payload);
  return data;
}

export async function adjustInventory(payload) {
  const { data } = await api.post("/admin/inventory/adjust", payload);
  return data;
}

// ─── Admin: Movements ────────────────────────────────────────────────────────

export async function getInventoryMovements(params = {}) {
  const { data } = await api.get("/admin/inventory-movements", { params });
  return data;
}

// ─── Admin: Alerts ───────────────────────────────────────────────────────────

export async function getInventoryAlerts(params = {}) {
  const { data } = await api.get("/admin/inventory-alerts", { params });
  return data;
}

export async function acknowledgeInventoryAlert(id) {
  const { data } = await api.post(`/admin/inventory-alerts/${id}/acknowledge`);
  return data;
}

export async function refreshInventoryAlerts() {
  const { data } = await api.post("/admin/inventory-alerts/refresh");
  return data;
}

// ─── Admin: Suppliers ────────────────────────────────────────────────────────

export async function getSuppliers() {
  const { data } = await api.get("/admin/suppliers");
  return data;
}

export async function createSupplier(payload) {
  const { data } = await api.post("/admin/suppliers", payload);
  return data;
}

// ─── Admin: Purchase Orders ──────────────────────────────────────────────────

export async function getPurchaseOrders() {
  const { data } = await api.get("/admin/purchase-orders");
  return data;
}

export async function getPurchaseOrder(id) {
  const { data } = await api.get(`/admin/purchase-orders/${id}`);
  return data;
}

export async function createPurchaseOrder(payload) {
  const { data } = await api.post("/admin/purchase-orders", payload);
  return data;
}

export async function receivePurchaseOrder(id, payload) {
  const { data } = await api.post(`/admin/purchase-orders/${id}/receive`, payload);
  return data;
}
