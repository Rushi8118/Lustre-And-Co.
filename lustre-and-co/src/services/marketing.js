import api from "./api";

export async function subscribeBackInStock(payload) {
  const { data } = await api.post("/back-in-stock", payload);
  return data;
}

export async function cancelBackInStock(token) {
  const { data } = await api.delete(`/back-in-stock/${token}`);
  return data;
}

export async function notifyBackInStockAdmin(productId) {
  const { data } = await api.post(`/admin/back-in-stock/${productId}/notify`);
  return data;
}

export async function trackAnalyticsEvent(payload) {
  const { data } = await api.post("/marketing/events", payload);
  return data;
}

export async function unsubscribeMarketing(payload) {
  const { data } = await api.post("/marketing/unsubscribe", payload);
  return data;
}

export async function getMarketingTemplates() {
  const { data } = await api.get("/admin/marketing/templates");
  return data;
}

export async function createMarketingTemplate(payload) {
  const { data } = await api.post("/admin/marketing/templates", payload);
  return data;
}

export async function updateMarketingTemplate(id, payload) {
  const { data } = await api.put(`/admin/marketing/templates/${id}`, payload);
  return data;
}

export async function getMarketingCampaigns() {
  const { data } = await api.get("/admin/marketing/campaigns");
  return data;
}

export async function createMarketingCampaign(payload) {
  const { data } = await api.post("/admin/marketing/campaigns", payload);
  return data;
}

export async function sendMarketingCampaign(id) {
  const { data } = await api.post(`/admin/marketing/campaigns/${id}/send`);
  return data;
}
