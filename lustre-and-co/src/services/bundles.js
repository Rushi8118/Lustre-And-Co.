import api from "./api";

export async function getBundles(params = {}) {
  const { data } = await api.get("/bundles", { params });
  return data;
}

export async function getBundle(idOrSlug) {
  const { data } = await api.get(`/bundles/${idOrSlug}`);
  return data;
}

export async function validateBundle({
  bundleId,
  quantity = 1,
  selectedItems,
}) {
  const { data } = await api.post("/bundles/validate", {
    bundleId,
    quantity,
    selectedItems,
  });

  return data;
}

export async function calculateBundlePrice({
  bundleId,
  quantity = 1,
  selectedItems,
}) {
  const { data } = await api.post("/bundles/calculate-price", {
    bundleId,
    quantity,
    selectedItems,
  });

  return data;
}

export async function addBundleToCart(cartId, payload) {
  const { data } = await api.post(`/cart/${cartId}/bundles`, payload);
  return data;
}

export async function removeBundleFromCart(cartId, bundleId) {
  const { data } = await api.delete(
    `/cart/${cartId}/bundles/${bundleId}`,
  );

  return data;
}

export async function validateCartBundles(cartId) {
  const { data } = await api.post(`/cart/${cartId}/bundles/validate`);
  return data;
}

export async function getAdminBundles(params = {}) {
  const { data } = await api.get("/bundles/admin/all", { params });
  return data;
}

export async function createBundle(payload) {
  const { data } = await api.post("/bundles/admin", payload);
  return data;
}

export async function updateBundle(id, payload) {
  const { data } = await api.put(`/bundles/admin/${id}`, payload);
  return data;
}

export async function deleteBundle(id) {
  const { data } = await api.delete(`/bundles/admin/${id}`);
  return data;
}
