# ✨ Lustre & Co. — Enterprise Luxury E-Commerce Platform

[![NestJS](https://img.shields.io/badge/Backend-NestJS%2011-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Razorpay](https://img.shields.io/badge/Payments-Razorpay%20Verified-0C2340?style=for-the-badge&logo=razorpay&logoColor=blue)](https://razorpay.com/)
[![Swagger](https://img.shields.io/badge/API%20Docs-Swagger%20OpenAPI%203.0-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)](http://localhost:5000/api/docs)
[![Tests](https://img.shields.io/badge/Tests-Vitest%20%7C%20100%25%20Passing-brightgreen?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)

---

## 📖 Executive Summary

**Lustre & Co.** is a commercial-grade, multi-channel e-commerce platform specifically architected for fine and high-end imitation jewelry brands. Engineered with a **Zero-Trust Backend** in **NestJS**, a hyper-scalable **Supabase PostgreSQL** database, and a luxury **Vite + React** storefront, the system delivers an end-to-end retail experience encompassing 3D product visualization, automated marketing funnels, multi-carrier logistics, returns management (RMA), and executive business intelligence.

---

## 🏛️ System Architecture

```
                                  ┌──────────────────────────────────────────────┐
                                  │             CLIENTS & CHANNELS               │
                                  │  React 18 Storefront  │  Admin Control Suite │
                                  └──────────────────────┬───────────────────────┘
                                                         │ HTTPS / JSON / REST
                                                         ▼
                                  ┌──────────────────────────────────────────────┐
                                  │           SECURITY & REVERSE PROXY           │
                                  │  Nginx / Helmet Headers / CORS / Rate Limiter│
                                  └──────────────────────┬───────────────────────┘
                                                         │
                                                         ▼
                                  ┌──────────────────────────────────────────────┐
                                  │             NESTJS CORE SERVICES             │
                                  │  ┌────────────────────┬────────────────────┐ │
                                  │  │ Authentication     │ Orders & Bag       │ │
                                  │  │ (2FA, JWT, RBAC)   │ (Zero-Trust Calc)  │ │
                                  │  ├────────────────────┼────────────────────┤ │
                                  │  │ Payments & Webhook │ Shipping Logistics │ │
                                  │  │ (HMAC SHA-256)     │ (Multi-Provider)   │ │
                                  │  ├────────────────────┼────────────────────┤ │
                                  │  │ Marketing Engine   │ Executive BI       │ │
                                  │  │ (Merge Templates)  │ (Revenue, Exports) │ │
                                  │  ├────────────────────┼────────────────────┤ │
                                  │  │ Cloud Storage      │ Typo-Search Engine │ │
                                  │  │ (WebP, CDN)        │ (Levenshtein Dist) │ │
                                  │  └────────────────────┴────────────────────┘ │
                                  └──────────────────────┬───────────────────────┘
                                                         │
                     ┌───────────────────────────────────┼───────────────────────────────────┐
                     ▼                                   ▼                                   ▼
       ┌───────────────────────────┐       ┌───────────────────────────┐       ┌───────────────────────────┐
       │   SUPABASE POSTGRESQL     │       │     EXTERNAL PAYMENT      │       │     LOGISTICS & EMAIL     │
       │   - Relational Tables     │       │   - Razorpay Orders API   │       │   - Shiprocket / Delhivery│
       │   - Row Level Security    │       │   - Cryptographic Webhooks│       │   - SMTP Transactional    │
       │   - Audit Trail Logs      │       │   - Instant Refunds       │       │   - Supabase CDN Storage  │
       └───────────────────────────┘       └───────────────────────────┘       └───────────────────────────┘
```

---

## 🛠️ Technology Stack Breakdown: What We Use & Why

### 1. Backend Architecture: NestJS (v11)
- **Why NestJS?** Unlike standard Express setups which often degrade into chaotic architectures, NestJS enforces an enterprise-grade modular design using Controllers, Services, Dependency Injection, and DTOs.
- **Key Modules**:
  - `AuthModule`: Manages authentication, Argon2/Bcrypt password hashing, token rotation, and 2FA TOTP RFC 6238.
  - `OrdersModule`: Enforces zero-trust recalculation where all prices, discounts, line items, and taxes are retrieved from the database.
  - `PaymentsModule`: Handles Razorpay order initialization, captured payment verification, and constant-time webhook signature verification.
  - `ShippingModule`: Implements a provider abstraction supporting Shiprocket, Delhivery, Blue Dart, and hyper-local delivery.
  - `ReturnsModule`: Complete RMA (Return Merchandise Authorization) lifecycle with photo evidence, inspection stages, and store credit issuance.
  - `DocumentsModule`: Generates official PDF tax invoices, packing slips, and credit notes with GSTIN compliance.
  - `MarketingModule`: Reusable template compiler with variable interpolation (`{{customerName}}`, `{{trackingLink}}`), automated cron schedulers, and back-in-stock alerts.
  - `AnalyticsModule`: Computes Gross/Net revenue, AOV, Cart Abandonment, CLV, and streams native CSV and Excel exports.
  - `StorageModule`: Interacts with Supabase Cloud Storage to store high-res images, thumbnails, and WebP transformations.
  - `SearchModule`: Delivers typo-tolerant catalog search with suggestions autocompletion and search analytics.

### 2. Database Layer: Supabase (PostgreSQL 15+)
- **Why Supabase/PostgreSQL?** High-value jewelry purchases require ACID transactions, strict relational consistency, foreign key constraints, and reliable connection pooling.
- **Security Features**:
  - Row Level Security (RLS) protects sensitive tables.
  - Automated triggers handle `updated_at` timestamps across all entities.
  - Comprehensive relational schemas with cascading constraints prevent orphan records.

### 3. Frontend Architecture: Vite + React 18
- **Why Vite + React?** Lightning-fast hot-module replacement (HMR), sub-second build times, and an optimized production bundle size.
- **Key Client Features**:
  - **Dynamic 3D Hero Rendering**: Powered by Three.js / React Three Fiber for luxury brand elevation.
  - **Fluid Page Transitions**: Framer Motion for graceful micro-animations.
  - **Interactive Sizing & Fit Suite**: Custom ring circumference calculator (in mm), bangle sizing charts, and necklace collarbone visual guide.
  - **Typo-Tolerant Search Overlay**: Live autocompletion, "Did you mean?" suggestions, instant product cards, recent search memory, and popular search chips.
  - **Executive Admin Suite**: Full administrative dashboard with date filtering, sales breakdowns, inventory controls, order tracking, and RMA processing.

---

## 🔒 Deep Dive: How the Core Features Work

### 1. Zero-Trust Commerce & Price Verification
Client-side pricing or discount calculations are **never trusted**. When a customer submits an order:
1. The frontend transmits only product IDs and requested quantities: `{ items: [{ productId, quantity }] }`.
2. `OrdersService` queries Supabase directly to pull verified unit prices and stock levels.
3. The server recalculates subtotals, applies validated server coupons, verifies minimum spend thresholds, adds verified shipping charges, and computes tax.
4. Any mismatch causes an immediate rejection (`400 Bad Request`).

### 2. Cryptographic Payment Webhooks (Razorpay)
To prevent unauthorized order status forgery:
1. Razorpay dispatches webhook events (`order.paid`, `payment.failed`, `refund.processed`).
2. The server extracts the `x-razorpay-signature` header and recalculates the HMAC SHA-256 signature using the secret key in `server/.env`.
3. Signatures are compared using `crypto.timingSafeEqual` to eliminate timing attack vectors.
4. Failed payment webhook events (`payment.failed`) are safely isolated and **never** mark an order as paid.

### 3. Two-Factor Authentication (2FA) & Replay Attack Defense
1. Admins generate a secret key formatted into a standard TOTP QR code compatible with Google Authenticator or 1Password.
2. During login, after password verification, the server issues a temporary 2FA token. The user must provide a 6-digit TOTP code to receive the final JWT access token.
3. **Token Rotation & Replay Detection**: Refresh tokens are rotated on every use. If a previously consumed refresh token is presented (indicating a stolen token replay attack), the system automatically revokes **all** active user sessions.

### 4. Omnichannel Shipping Provider Abstraction
The `ShippingProvider` interface decouples commercial business logic from specific delivery vendors:
```typescript
export interface ShippingProvider {
  calculateRate(input: ShippingRateInput): Promise<ShippingRate[]>;
  createShipment(order: Order): Promise<ShipmentResult>;
  trackShipment(trackingNumber: string): Promise<TrackingResult>;
  cancelShipment(shipmentId: string): Promise<void>;
}
```
Switch between Shiprocket, Delhivery, or in-house couriers via environment variables without altering the core checkout flow.

### 5. Returns, Refunds & Store Credit (RMA)
A complete post-purchase workflow protects both customer and merchant:
- Customers initiate returns via their account portal, attaching photographic evidence and reasons.
- Statuses flow through: `Requested` ➔ `Approved` ➔ `Pickup Scheduled` ➔ `Received` ➔ `Inspected` ➔ `Refund Initiated` / `Store Credit Issued` ➔ `Completed`.
- Automated store credit ledgers allow customers to spend refund balances immediately on future purchases.

### 6. Automated Marketing & Back-in-Stock Alerts
- **Template Compiler**: Supports dynamic placeholders: `{{customerName}}`, `{{orderNumber}}`, `{{trackingLink}}`, `{{storeName}}`, and `{{productUrl}}`.
- **Back-in-Stock Engine**: Customers subscribe to notifications when an item sells out. When an administrator restocks the item via the Inventory tab, the server automatically fires personalized email and SMS notices to queued subscribers.

### 7. Executive Business Intelligence & Streaming Exports
- **Metrics Tracked**: Gross Revenue, Net Revenue, Refunds, Average Order Value (AOV), Conversion Rate, Cart Abandonment Rate, Returning Customer Rate, Customer Lifetime Value (CLV), device heatmaps, location breakdown, and payment split (COD vs. Online).
- **Date Presets**: `Today`, `Last 7 Days`, `Last 30 Days`, `This Month`, `Last Month`, and `Custom Range`.
- **Streaming Exports**: Exports Orders, Customers, Products, Revenue, and Inventory directly to `.csv` or native `.xlsx` files.

---

## 📋 Directory Structure

```text
Lustre-And-Co/
├── README.md                          # Project Documentation
├── docker-compose.prod.yml            # Production Multi-Container Orchestration
├── lustre-and-co/                     # Frontend Application (React 18 + Vite)
│   ├── index.html                     # HTML Entry Point
│   ├── vite.config.js                 # Vite Bundler Configuration
│   ├── src/
│   │   ├── main.jsx                   # React Bootstrap
│   │   ├── App.jsx                    # Root Router & Providers
│   │   ├── components/                # UI Components
│   │   │   ├── Header.jsx             # Site Header & Typo-Search Overlay
│   │   │   ├── BackInStockForm.jsx    # Back-in-Stock Notification Form
│   │   │   ├── SizeGuideModal.jsx     # Interactive Ring/Bangle/Necklace Sizer
│   │   │   ├── ReturnRequestModal.jsx # Customer RMA Form with Photo Upload
│   │   │   └── ProductCard.jsx        # Product Catalog Display Card
│   │   ├── pages/                     # Storefront Views
│   │   │   ├── ProductDetails.jsx     # PDP with Gallery, Sizer, & Guarantee
│   │   │   ├── CatalogPage.jsx        # Faceted Browsing & Filter Grid
│   │   │   ├── Checkout.jsx           # Zero-Trust Bag & Address Collection
│   │   │   ├── Account.jsx            # Orders, Addresses, & Security (2FA)
│   │   │   └── TrackOrder.jsx         # Live Carrier Shipment Tracking
│   │   ├── admin/                     # Comprehensive Admin Suite
│   │   │   ├── AdminApp.jsx           # Admin Routing & Security Wrapper
│   │   │   └── pages/                 # Admin Sub-pages
│   │   │       ├── AdminDashboard.jsx # Executive High-Level KPI Summary
│   │   │       ├── AdminAnalytics.jsx # Comprehensive BI & Data Exports
│   │   │       ├── AdminMarketing.jsx # Template Editor & Campaign Center
│   │   │       ├── AdminOrders.jsx    # Order Processing & Shipping Labels
│   │   │       ├── AdminInventory.jsx # Stock Adjustments & Low Stock Alerts
│   │   │       └── AdminReturns.jsx   # RMA Approval & Refund Inspection
│   │   └── services/                  # Client API Services (Axios)
│   │       ├── api.js                 # Interceptors & JWT Refresh Loop
│   │       ├── analytics.js           # BI & Export Endpoints
│   │       ├── marketing.js           # Campaign & Template Operations
│   │       └── shipping.js            # Carrier Tracking & Rates
└── server/                            # Backend Application (NestJS 11)
    ├── package.json                   # Backend Dependencies
    ├── tsconfig.json                  # TypeScript Compiler Configuration
    ├── sql/                           # Database Schema Migrations (Supabase)
    │   ├── schema.sql                 # Core E-Commerce Relational Tables
    │   ├── shipping-logistics.sql     # Shipping Providers & Rates
    │   ├── returns-invoices.sql       # RMA Workflow & Tax Invoices
    │   ├── marketing-analytics.sql    # Marketing Funnels & BI Snapshots
    │   ├── security-improvements.sql  # 2FA Columns, Permissions, & Tokens
    │   └── storage-and-search.sql     # Image Galleries & Search Analytics
    ├── test/                          # Automated Vitest Testing Suite
    │   └── unit/                      # Unit & Security Test Suites
    │       ├── discounts.service.spec.ts
    │       ├── orders.service.spec.ts
    │       ├── payments.service.spec.ts
    │       ├── security-guards.spec.ts
    │       └── auth.service.spec.ts
    └── src/                           # NestJS Architecture
        ├── main.ts                    # Bootstrap with Helmet, CORS & Pipes
        ├── app.module.ts              # Root Module
        ├── database/                  # Supabase Client Provider
        └── modules/                   # Domain Modules
            ├── auth/                  # Authentication, 2FA, & SMTP
            ├── products/              # Catalog & Category Management
            ├── orders/                # Zero-Trust Checkout Logic
            ├── payments/              # Razorpay Gateway & Webhooks
            ├── shipping/              # Logistics Provider Abstraction
            ├── returns/               # RMA & Store Credit Management
            ├── documents/             # PDF Invoice & Packing Slip Engine
            ├── marketing/             # Email Campaigns & Schedulers
            ├── analytics/             # Executive BI & Excel/CSV Exports
            ├── storage/               # Supabase Cloud Image Pipeline
            └── search/                # Typo Tolerance & Suggestion Search
```

---

## ⚙️ Environment Variables Reference

### Backend Configuration (`server/.env`)

```ini
# Application
PORT=5000
NODE_ENV=development
API_PREFIX=api
STOREFRONT_URL=http://localhost:5173
ADMIN_URL=http://localhost:5173/admin
STORE_NAME="Lustre & Co."

# Supabase PostgreSQL
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJh... (Your Supabase Service Role Key)
SUPABASE_ANON_KEY=eyJh... (Your Supabase Anon Key)
SUPABASE_STORAGE_BUCKET=products

# JWT & Cryptographic Security
JWT_SECRET=super_secret_jwt_key_at_least_32_characters_long
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=super_secret_refresh_jwt_key_different_from_access
JWT_REFRESH_EXPIRES_IN=7d
ENCRYPTION_KEY=32_character_hex_encryption_key_for_2fa_and_pii

# Razorpay Payment Gateway
RAZORPAY_KEY_ID=rzp_test_YourKeyIdHere
RAZORPAY_KEY_SECRET=YourRazorpaySecretHere
RAZORPAY_WEBHOOK_SECRET=YourWebhookSecretConfiguredInRazorpayDashboard

# SMTP Email Gateway
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM="Lustre & Co. <no-reply@lustreandco.com>"

# Shipping Logistics Providers
DEFAULT_SHIPPING_PROVIDER=shiprocket
SHIPROCKET_EMAIL=logistics@lustreandco.com
SHIPROCKET_PASSWORD=your_shiprocket_password
DELHIVERY_API_KEY=your_delhivery_api_token

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

### Frontend Configuration (`lustre-and-co/.env`)

```ini
VITE_API_BASE_URL=http://localhost:5000/api
VITE_RAZORPAY_KEY_ID=rzp_test_YourKeyIdHere
VITE_STORE_NAME="Lustre & Co."
VITE_CURRENCY_SYMBOL=₹
VITE_SUPABASE_URL=https://your-project.supabase.co
```

---

## 🚀 Step-by-Step Setup Guide

### 1. Database Setup (Supabase)
1. Create a new project in [Supabase](https://supabase.com).
2. Open the **SQL Editor** in your Supabase project dashboard.
3. Run the SQL files located in `server/sql/` in the following sequence:
   1. `server/sql/schema.sql`
   2. `server/sql/shipping-logistics.sql`
   3. `server/sql/returns-invoices.sql`
   4. `server/sql/marketing-analytics.sql`
   5. `server/sql/security-improvements.sql`
   6. `server/sql/storage-and-search.sql`

### 2. Backend Installation & Startup
```bash
# Navigate to the backend directory
cd server

# Install dependencies
npm install

# Run database seed script (populates demo catalog & creates superadmin)
npm run seed

# Build the TypeScript project
npm run build

# Start the NestJS development server
npm run start:dev
```
*The API server will run at `http://localhost:5000`.*  
*Swagger Documentation will be available at `http://localhost:5000/api/docs`.*

### 3. Frontend Installation & Startup
```bash
# Navigate to the storefront directory
cd lustre-and-co

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
*The storefront will launch at `http://localhost:5173`.*

---

## 🧪 Automated Testing Suite

The repository includes a comprehensive unit, service, controller, and security test suite built with **Vitest**:

```bash
# Run all automated tests
cd server
npm test

# Run tests in watch mode
npm run test:watch
```

### Verified Test Cases:
| Test File | Verified Business & Security Rules |
| :--- | :--- |
| `discounts.service.spec.ts` | Percentage/fixed discount calculations, expired coupon rejection, usage limits, minimum order totals. |
| `orders.service.spec.ts` | Stock availability checks, out-of-stock rejection, zero-trust price recalculation from database. |
| `payments.service.spec.ts` | Constant-time HMAC SHA-256 signature verification, rejection of forged webhooks, isolation of failed payment webhooks. |
| `security-guards.spec.ts` | Rejection of unauthenticated users (401), rejection of normal customers from admin routes (403), granular permission enforcement (`orders.update`). |
| `auth.service.spec.ts` | Strict password complexity enforcement, refresh token rotation, replay-attack session invalidation. |

---

## 💳 Razorpay & Webhook Configuration

1. Log into your [Razorpay Dashboard](https://dashboard.razorpay.com).
2. Generate API Keys (**Settings ➔ API Keys**):
   - Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `server/.env`.
3. Configure Webhooks (**Settings ➔ Webhooks**):
   - **URL**: `https://api.yourdomain.com/api/payments/webhook`
   - **Secret**: Enter a high-entropy secret string and copy it to `RAZORPAY_WEBHOOK_SECRET` in `server/.env`.
   - **Active Events**: `order.paid`, `payment.captured`, `payment.failed`, `refund.processed`.

---

## 📬 SMTP Email Gateway Configuration

Lustre & Co. sends transactional emails for account verification, order confirmations, shipping updates, RMA approvals, back-in-stock alerts, and 2FA authentication codes.

### Supported Providers:
- **Google Workspace / Gmail**: Generate a 16-character **App Password** under Google Account Security (with 2FA enabled).
- **Amazon SES**: Obtain SMTP credentials from the AWS SES Management Console.
- **Brevo / SendGrid**: Use standard SMTP credentials on Port 587.

---

## 🌐 API Documentation Reference

Explore and test all endpoints using the interactive Swagger UI:
- **Swagger Documentation**: [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
- **OpenAPI JSON**: [http://localhost:5000/api/docs-json](http://localhost:5000/api/docs-json)

### Primary API Routes:
```text
AUTHENTICATION & USERS
POST   /api/auth/register             # Create new customer account
POST   /api/auth/login                # Authenticate and receive JWT tokens
POST   /api/auth/refresh              # Rotate refresh token
POST   /api/auth/2fa/generate         # Generate TOTP secret & QR code
POST   /api/auth/2fa/verify           # Enable 2FA with 6-digit code

COMMERCE & CHECKOUT
GET    /api/products                  # Browse catalog with pagination & filters
GET    /api/products/:slug            # Retrieve full product details & variants
POST   /api/orders                    # Create order with zero-trust price recalculation
POST   /api/payments/create-order     # Initialize Razorpay payment session
POST   /api/payments/webhook          # Cryptographically verified payment listener

SHIPPING, LOGISTICS & DOCUMENTS
POST   /api/shipping/calculate-rate   # Check real-time shipping carrier rates
GET    /api/shipping/track/:number    # Real-time shipment status & milestone logs
GET    /api/invoices/:orderId/pdf     # Download official GST tax invoice

MARKETING & ANALYTICS
GET    /api/admin/marketing/templates # View reusable marketing email templates
POST   /api/admin/marketing/campaigns # Create & schedule targeted email campaign
POST   /api/back-in-stock             # Customer alert subscription for sold-out items
GET    /api/admin/analytics/dashboard # View real-time revenue, AOV, & retention KPIs
GET    /api/admin/analytics/export/:t # Stream CSV or native Excel (XLSX) exports

SEARCH & CLOUD STORAGE
GET    /api/search/suggestions        # Typo-tolerant autocomplete suggestions
POST   /api/admin/storage/upload      # Multi-image upload to Supabase Storage
```

---

## 🚢 Production Deployment

### Option 1: Docker Compose (Recommended)
```bash
# Build and run backend and frontend containers
docker compose -f docker-compose.prod.yml up -d --build
```

### Option 2: PM2 & Nginx (Ubuntu VPS)
```bash
# 1. Compile backend
cd server
npm ci --production=false
npm run build
pm2 start dist/main.js --name "lustre-api" -i max

# 2. Compile frontend
cd ../lustre-and-co
npm ci
npm run build
# Configure Nginx to serve lustre-and-co/dist and proxy /api to port 5000
```

---

## ❓ Frequently Asked Questions (FAQ) & Troubleshooting

### Q: Why do I get a 403 Forbidden error on Razorpay webhooks?
**A**: Ensure `RAZORPAY_WEBHOOK_SECRET` in `server/.env` exactly matches the secret in your Razorpay Dashboard. Verify that your reverse proxy (e.g. Cloudflare or Nginx) passes the raw request payload without re-stringifying it.

### Q: Why am I getting "Insufficient stock" errors when testing checkout?
**A**: The zero-trust inventory manager blocks orders that exceed available stock. Adjust inventory in the **Admin ➔ Inventory** panel or via database updates to `products.stock_quantity`.

### Q: How do I recover an admin account if 2FA is lost?
**A**: When 2FA is first enabled, the system generates emergency backup codes. If all backup codes are lost, an administrator with direct database access can run:
```sql
UPDATE users SET two_factor_enabled = false, two_factor_secret = null WHERE email = 'admin@lustreandco.com';
```

---

## 📄 Commercial License

Copyright © 2026 Lustre & Co. All rights reserved.  
Commercial e-commerce software. Unauthorized copying, distribution, or public resale without explicit license is strictly prohibited.
