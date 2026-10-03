import { useCallback, useEffect, useRef, useState } from "react";
import {
  releaseInventoryReservation,
  reserveInventory,
} from "../services/inventory";

function createToken() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Manages a server-side inventory reservation during checkout.
 *
 * The token is generated client-side but the reservation itself
 * is created and validated entirely on the server. The frontend
 * never reads or controls the actual stock numbers.
 *
 * @param {object} options
 * @param {string}  [options.cartId]
 * @param {string}  [options.userId]
 * @param {Array}   options.items - [{ productId, quantity }]
 * @param {boolean} [options.enabled=true]
 * @param {number}  [options.durationMinutes=15]
 */
export default function useInventoryReservation({
  cartId,
  userId,
  items,
  enabled = true,
  durationMinutes = 15,
}) {
  const [reservation, setReservation] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const tokenRef = useRef(null);
  const releasedRef = useRef(false);

  const reserve = useCallback(async () => {
    if (!enabled || !items?.length) return null;

    setLoading(true);
    setError("");
    releasedRef.current = false;

    if (!tokenRef.current) {
      tokenRef.current = createToken();
    }

    try {
      const result = await reserveInventory({
        reservationToken: tokenRef.current,
        cartId: cartId || null,
        userId: userId || null,
        durationMinutes,
        items: items.map((item) => ({
          productId: item.productId || item.product || item.id,
          quantity: Number(item.quantity || 1),
        })),
      });

      setReservation(result);
      return result;
    } catch (err) {
      const raw = err?.response?.data?.message || "Some products may be out of stock. Please check your bag.";
      const message = Array.isArray(raw) ? raw.join(" ") : raw;
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [cartId, userId, items, enabled, durationMinutes]);

  const release = useCallback(async (status = "released") => {
    if (!tokenRef.current || releasedRef.current) return;
    releasedRef.current = true;

    try {
      await releaseInventoryReservation(tokenRef.current, status);
    } catch {
      // Best-effort — the scheduler will clean up expired reservations
    } finally {
      setReservation(null);
      tokenRef.current = null;
    }
  }, []);

  // Release on unmount (e.g. user navigates away from checkout)
  useEffect(() => {
    return () => {
      if (tokenRef.current && !releasedRef.current) {
        void releaseInventoryReservation(tokenRef.current, "released").catch(() => null);
      }
    };
  }, []);

  // Auto-release when the server-side timer fires
  useEffect(() => {
    if (!reservation?.expiresAt) return;

    const expiresAt = new Date(reservation.expiresAt).getTime();
    const remaining = Math.max(1000, expiresAt - Date.now());

    const timer = window.setTimeout(() => {
      void release("expired");
      setError("Your reservation has expired. Please try again.");
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [reservation, release]);

  return {
    reservation,
    loading,
    error,
    reserve,
    release,
    reservationToken: tokenRef.current,
    isReserved: Boolean(reservation && reservation.status === "active"),
    expiresAt: reservation?.expiresAt || null,
  };
}
