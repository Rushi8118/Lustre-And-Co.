import api from './api';

export async function identifyCart(cartId, email, customerName) {
  const { data } = await api.post('/abandoned-carts/identify', {
    cartId,
    email,
    customerName,
  });

  return data;
}

export async function getRecoverySettings() {
  const { data } = await api.get('/admin/abandoned-carts/settings');
  return data;
}

export async function updateRecoverySettings(settings) {
  const { data } = await api.put('/admin/abandoned-carts/settings', settings);
  return data;
}

export async function getAbandonedCarts(params = {}) {
  const { data } = await api.get('/admin/abandoned-carts', { params });
  return data;
}

export async function processAbandonedCarts() {
  const { data } = await api.post('/admin/abandoned-carts/process');
  return data;
}

export async function sendRecoveryEmail(cartId, reminderNumber = 1, customMessage = '') {
  const { data } = await api.post(`/admin/abandoned-carts/${cartId}/send-recovery`, {
    reminderNumber,
    customMessage: customMessage || undefined,
  });
  return data;
}

export async function getAbandonedCartById(cartId) {
  const { data } = await api.get(`/admin/abandoned-carts/${cartId}`);
  return data;
}
