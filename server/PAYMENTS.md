# Payments (Razorpay)

The store uses **Razorpay** for online payments, alongside cash on delivery.
There is no signup fee and no monthly fee; Razorpay keeps a percentage of each
successful payment. It covers UPI, cards, net banking and wallets, and settles
to an Indian bank account, which fits a store priced in INR.

Until real keys are set the checkout automatically hides online payment and
offers cash on delivery only, so the store keeps working without an account.

## 1. Get your keys

1. Create an account at <https://dashboard.razorpay.com> and complete KYC
   (PAN, bank account, business details). Test mode works before KYC.
2. Go to **Account & Settings → API Keys → Generate Key**.
3. Copy the **Key ID** (`rzp_test_…` or `rzp_live_…`) and **Key Secret**.
   The secret is shown once.

## 2. Add the keys to the server

Set these on Render (**Environment → Add Environment Variable**) and in your
local `server/.env`:

```
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=a-long-random-string-you-choose
```

Never put the key secret or the webhook secret in the frontend. The browser
only receives the Key ID, from `GET /api/payments/key`.

## 3. Add the webhook

In the Razorpay dashboard, **Account & Settings → Webhooks → Add New Webhook**:

- **URL**: `https://lustre-and-co.onrender.com/api/payments/webhook`
- **Secret**: the same value as `RAZORPAY_WEBHOOK_SECRET`
- **Active events**: `payment.captured`

The webhook marks the order paid even if the customer closes the browser before
the confirmation page loads. Without it, such payments stay "pending" in the
admin while the money has actually been taken.

## How a payment flows

1. Checkout creates the order, then calls `POST /api/payments/create-intent`,
   which creates a matching Razorpay order for the exact total.
2. The Razorpay window opens in the browser. Card details never reach this server.
3. On success the browser calls `POST /api/payments/verify`. The server checks
   the HMAC-SHA256 signature before marking the order paid.
4. Independently, Razorpay calls the webhook. Marking an order paid is safe to
   run twice, so whichever arrives first wins and the other is ignored.

## Going live

1. Finish KYC, then switch the dashboard to **Live mode** and generate live keys.
2. Replace the `rzp_test_…` values on Render with the `rzp_live_…` ones.
3. Add a second webhook for live mode with the same URL and secret.
4. Place one small real order and refund it from the dashboard to confirm the
   full flow.
