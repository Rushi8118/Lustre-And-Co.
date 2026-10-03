// lustre-and-co/src/services/recommendations.js
import api from "./api";

// ── Session ID (persisted per browser tab) ─────────────────
let _sessionId = null;
export function getSessionId() {
  if (_sessionId) return _sessionId;
  try {
    _sessionId = sessionStorage.getItem("rec_session_id");
    if (!_sessionId) {
      _sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem("rec_session_id", _sessionId);
    }
  } catch {
    _sessionId = `s_${Date.now()}`;
  }
  return _sessionId;
}

// ── Recommendation sections for a product page ─────────────
export async function getProductRecommendations(productId, types, limit = 6) {
  const params = { session: getSessionId(), limit };
  if (types && types.length > 0) params.types = types.join(",");
  const { data } = await api.get(`/recommendations/product/${productId}`, { params });
  return data; // Array of { type, label, products[] }
}

// ── Individual recommendation sections ────────────────────
export async function getYouMayAlsoLike(productId, limit = 8) {
  const { data } = await api.get(
    `/recommendations/product/${productId}/you-may-also-like`,
    { params: { limit } }
  );
  return data;
}

export async function getFrequentlyBoughtTogether(productId, limit = 6) {
  const { data } = await api.get(
    `/recommendations/product/${productId}/frequently-bought-together`,
    { params: { limit } }
  );
  return data;
}

export async function getSimilarProducts(productId, limit = 8) {
  const { data } = await api.get(
    `/recommendations/product/${productId}/similar`,
    { params: { limit } }
  );
  return data;
}

export async function getCompleteTheLook(productId, limit = 6) {
  const { data } = await api.get(
    `/recommendations/product/${productId}/complete-the-look`,
    { params: { limit } }
  );
  return data;
}

export async function getRecentlyViewed(limit = 8) {
  const { data } = await api.get("/recommendations/recently-viewed", {
    params: { session: getSessionId(), limit },
  });
  return data;
}

export async function getCartRecommendations(productIds, limit = 6) {
  const { data } = await api.post(
    "/recommendations/cart",
    { productIds, sessionId: getSessionId() },
    { params: { limit } }
  );
  return data;
}

export async function getForYou(limit = 8) {
  const { data } = await api.get("/recommendations/for-you", { params: { limit } });
  return data;
}

// ── Tracking ───────────────────────────────────────────────
export function trackView(productId, extras = {}) {
  api
    .post("/recommendations/track/view", {
      productId,
      sessionId: getSessionId(),
      ...extras,
    })
    .catch(() => null);
}

export function trackRecommendationEvent({
  sourceProductId,
  recommendedProductId,
  recommendationType,
  eventType,
  position,
}) {
  api
    .post("/recommendations/track/event", {
      sessionId: getSessionId(),
      sourceProductId,
      recommendedProductId,
      recommendationType,
      eventType,
      position,
    })
    .catch(() => null);
}
