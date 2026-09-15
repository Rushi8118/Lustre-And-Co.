# Lustre & Co. database & admin guide

The API (NestJS) stores everything in Supabase (Postgres) through `@supabase/supabase-js`, using the service-role key on the server only. The storefront and admin panel (Vite + React) read and write only through the API — there is no mock or offline data.

## Configuration

`server/.env`

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role key from Supabase → Settings → API>
JWT_SECRET=<long random string>
JWT_EXPIRATION=7d
FRONTEND_URL=http://localhost:5177
# Optional: online payments are only offered when real keys are set
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
# Optional: first admin account created by the seed
ADMIN_EMAIL=admin@lustre.com
ADMIN_PASSWORD=Admin@123
```

`lustre-and-co/.env`

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## Database setup

Create a Supabase project, then run [`supabase/schema.sql`](supabase/schema.sql) once in the dashboard SQL Editor. It creates every table, index, `updatedAt` trigger, and the SQL functions the API calls (atomic stock reservation, coupon usage, dashboard aggregates). Row Level Security is enabled with no policies, so the tables are only reachable through the API.

## Tables

| Table | Purpose | Managed from admin |
| --- | --- | --- |
| `users` | Customers and admins: bcrypt password hash, role, active flag, saved addresses, wishlist, password-reset token hash | Customers |
| `products` | Catalog, pricing, stock, sales count, visibility, denormalized rating | Products |
| `categories` | Categories used for navigation, homepage tiles, and catalog filters | Categories |
| `reviews` | Customer reviews with moderation status; approved reviews drive product ratings | Reviews |
| `carts` | One bag per signed-in customer (guests use browser storage until sign-in) | — |
| `orders` | Order snapshot, totals, status history, tracking, payment state | Orders |
| `payments` | Payment ledger per order (COD or Razorpay) | Payments |
| `coupons` | Promo codes with minimum spend, usage limit, and expiry | Discounts |
| `settings` | Single document: store profile, social links, shipping/tax rules, COD, announcement bar, homepage content, newsletter block, SEO | Settings, Homepage & Banners |
| `pages` | Editable content pages: about, shipping-returns, jewelry-care, privacy, terms | Pages |
| `faqs` | FAQ entries grouped by topic | FAQs |
| `contact_messages` | Contact-form enquiries and return requests | Messages |
| `subscribers` | Newsletter sign-ups | Subscribers |

Card numbers and CVVs are never collected or stored.

## Run the application

From `server/`:

```bash
npm install
npm run seed
npm run start:dev
```

From `lustre-and-co/` in another terminal:

```bash
npm install
npm run dev
```

- Storefront: http://localhost:5177
- Admin panel: http://localhost:5177/admin (sign in with an admin account)
- API: http://localhost:5000/api — Swagger docs at http://localhost:5000/api/docs

## Seeding

`npm run seed` is idempotent and **insert-only**: it creates missing categories, products, coupons, content pages, FAQs, and the first admin account, but never overwrites anything already edited in the admin panel. It also imports the catalog's sample reviews into the `reviews` table and recalculates ratings from approved reviews. Change the seeded admin password after first sign-in.

## Notes

- **Password reset:** no email service is configured yet. Reset links are written to the API log (`Password reset requested for …`). Connect an email provider in `AuthService.forgotPassword` before going live.
- **Online payments:** checkout offers Razorpay only when real `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` values are set; otherwise cash on delivery only (if enabled in Settings).
- **Stock:** stock is reserved atomically when an order is placed and returned when an admin cancels the order. Refunds for paid orders must be issued in the payment gateway, then marked "refunded" on the order.
