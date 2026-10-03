// lustre-and-co/src/services/loyalty.js
import api from "./api";

// ── Customer endpoints ─────────────────────────────────────

export async function getLoyaltyAccount() {
  const { data } = await api.get("/loyalty/account");
  return data;
}

export async function getLoyaltyLedger(params = {}) {
  const { data } = await api.get("/loyalty/ledger", { params });
  return data;
}

export async function getLoyaltyTiers() {
  const { data } = await api.get("/loyalty/tiers");
  return data;
}

export async function updateBirthday({ month, day, year }) {
  const { data } = await api.put("/loyalty/birthday", { month, day, year });
  return data;
}

export async function redeemPoints(points, idempotencyKey) {
  const { data } = await api.post("/loyalty/redeem", { points, idempotencyKey });
  return data;
}

export async function applyReferralCode(code) {
  const { data } = await api.post("/loyalty/referral/apply", { code });
  return data;
}

export async function getReferralSummary() {
  const { data } = await api.get("/loyalty/referrals");
  return data;
}

export async function trackReferral(code, { email, sessionId, landingPage } = {}) {
  const { data } = await api.post("/referrals/track", { code, email, sessionId, landingPage });
  return data;
}

// ── Admin endpoints ────────────────────────────────────────

export async function getLoyaltySettings() {
  const { data } = await api.get("/loyalty/admin/settings");
  return data;
}

export async function updateLoyaltySettings(payload) {
  const { data } = await api.put("/loyalty/admin/settings", payload);
  return data;
}

export async function getAdminLoyaltyTiers() {
  const { data } = await api.get("/loyalty/admin/tiers");
  return data;
}

export async function updateLoyaltyTier(id, payload) {
  const { data } = await api.put(`/loyalty/admin/tiers/${id}`, payload);
  return data;
}

export async function adjustCustomerPoints(payload) {
  const { data } = await api.post("/loyalty/admin/adjust", payload);
  return data;
}
