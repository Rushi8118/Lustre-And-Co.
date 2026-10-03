/**
 * Payment status transitions, kept pure so every payment path (signature verify,
 * Razorpay webhook, cancel, mock) follows the same rules and can be unit-tested.
 */
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled';

/** What happened: the gateway captured money, the attempt failed, or the customer closed the window. */
export type PaymentEvent = 'captured' | 'failed' | 'cancelled';

export class InvalidPaymentTransitionError extends Error {}

export interface PaymentTransition {
  status: PaymentStatus;
  /** True when the event repeats a state already reached, so nothing should be written. */
  duplicate: boolean;
}

const RULES: Record<PaymentEvent, Partial<Record<PaymentStatus, PaymentStatus>>> = {
  // A paid order stays paid. Retrying after a failure or a closed window can still succeed.
  captured: { pending: 'paid', failed: 'paid', cancelled: 'paid', paid: 'paid' },
  // A failure never overwrites a payment that already succeeded.
  failed: { pending: 'failed', failed: 'failed' },
  cancelled: { pending: 'cancelled', cancelled: 'cancelled' },
};

export function nextPaymentStatus(current: string | null | undefined, event: PaymentEvent): PaymentTransition {
  const from = (current || 'pending') as PaymentStatus;
  const to = RULES[event][from];
  if (!to) {
    throw new InvalidPaymentTransitionError(`Cannot apply '${event}' to a payment that is '${from}'.`);
  }
  return { status: to, duplicate: to === from };
}
