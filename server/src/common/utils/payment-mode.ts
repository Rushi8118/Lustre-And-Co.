/**
 * MOCK_PAYMENT_MODE simulates payments without contacting Razorpay. It exists so
 * development and tests can run while Razorpay merchant onboarding is pending.
 *
 * It is refused unless NODE_ENV is 'development' or 'test'. An unset NODE_ENV also
 * refuses, so a misconfigured production server fails closed instead of open.
 */
const MOCK_ALLOWED_ENVS = ['development', 'test'];

export function isMockPaymentMode(): boolean {
  return process.env.MOCK_PAYMENT_MODE === 'true';
}

/** Throws when mock payments are requested outside development/test. Call at startup. */
export function assertMockPaymentAllowed(): void {
  if (!isMockPaymentMode()) return;
  const env = process.env.NODE_ENV || '';
  if (!MOCK_ALLOWED_ENVS.includes(env)) {
    throw new Error(
      `MOCK_PAYMENT_MODE=true is only allowed when NODE_ENV is 'development' or 'test' (current: '${env || 'unset'}'). Refusing to start.`,
    );
  }
}
