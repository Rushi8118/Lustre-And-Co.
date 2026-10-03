import api from "./api";

export async function createReturnRequest(payload) {
  const { data } = await api.post("/returns/request", payload);
  return data;
}

export async function getMyReturns() {
  const { data } = await api.get("/returns/my-returns");
  return data;
}

export async function checkReturnEligibility(orderId) {
  const { data } = await api.get(`/returns/eligibility/${encodeURIComponent(orderId)}`);
  return data;
}

export async function getReturnDetails(id) {
  const { data } = await api.get(`/returns/${id}`);
  return data;
}

export async function cancelReturnRequest(id) {
  const { data } = await api.post(`/returns/${id}/cancel`);
  return data;
}

// Admin APIs
export async function adminGetReturns(params = {}) {
  const { data } = await api.get("/admin/returns", { params });
  return data;
}

export async function adminGetReturn(id) {
  const { data } = await api.get(`/admin/returns/${id}`);
  return data;
}

export async function adminApproveReturn(id, payload = {}) {
  const { data } = await api.post(`/admin/returns/${id}/approve`, payload);
  return data;
}

export async function adminSchedulePickup(id, payload = {}) {
  const { data } = await api.post(`/admin/returns/${id}/schedule-pickup`, payload);
  return data;
}

export async function adminMarkReceived(id) {
  const { data } = await api.post(`/admin/returns/${id}/mark-received`);
  return data;
}

export async function adminInspectReturn(id, payload) {
  const { data } = await api.post(`/admin/returns/${id}/inspect`, payload);
  return data;
}

export async function adminProcessRefund(id, payload = {}) {
  const { data } = await api.post(`/admin/returns/${id}/process-refund`, payload);
  return data;
}

export async function adminCompleteExchange(id, payload = {}) {
  const { data } = await api.post(`/admin/returns/${id}/complete-exchange`, payload);
  return data;
}

export async function adminRejectReturn(id, payload) {
  const { data } = await api.post(`/admin/returns/${id}/reject`, payload);
  return data;
}
