# Lustre & Co.

> A full-stack imitation-jewelry e-commerce store built with React, Vite, NestJS, and MongoDB.

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=20232A)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![NestJS](https://img.shields.io/badge/NestJS-12-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-database-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-backend-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**Live storefront:** [lustre-and-co.vercel.app](https://lustre-and-co.vercel.app)

## Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Technology stack](#technology-stack)
- [Repository structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Available scripts](#available-scripts)
- [API documentation](#api-documentation)
- [Payments and email](#payments-and-email)
- [Database and seed data](#database-and-seed-data)
- [Production deployment](#production-deployment)
- [Testing and code quality](#testing-and-code-quality)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

## Overview

Lustre & Co. is a polished online storefront for imitation jewelry. The project combines a responsive React shopping experience with a NestJS REST API for authentication, catalog management, checkout, orders, and administration.

The frontend is served by Vite and focuses on discovery and conversion: customers can browse collections, search and filter products, save items, add products to a bag, and complete checkout. The backend provides the business logic and integrations needed to support customer accounts, payments, email, and administrative operations.

## Features

### Customer experience

- Product catalog with search, filters, categories, and collections.
- Product detail pages and quick-view modals.
- Wishlist and shopping bag functionality.
- Responsive mobile navigation and mobile-first layouts.
- Smooth page transitions and polished motion effects.
- Interactive 3D visual elements powered by Three.js.
- Customer registration, login, logout, and password recovery.
- Account management and profile information.
- Order history and order tracking.
- Checkout with cash-on-delivery and Razorpay payment support.
- Newsletter subscription and promotional coupon support.

### Administration

The backend supports an administration area for managing store operations, including:

- Products and inventory information.
- Categories and collections.
- Orders and order status.
- Customers and reviews.
- Coupons and promotional content.
- Pages, FAQs, and store settings.

## Architecture

```text
┌──────────────────────┐       HTTP/JSON        ┌────────────────────────┐
│ React + Vite Store   │ ──────────────────────▶ │ NestJS REST API        │
│                      │                         │                        │
│ React Router         │                         │ Auth and JWT           │
│ Framer Motion        │                         │ Catalog and orders     │
│ Three.js / R3F       │                         │ Payments and email     │
└──────────────────────┘                         └───────────┬────────────┘
                                                             │
                                                             ▼
                                                    ┌────────────────────┐
                                                    │ MongoDB            │
                                                    │ Store data         │
                                                    └────────────────────┘
```

The repository also contains Supabase client dependencies in the backend. Review the current server configuration before deployment to determine which Supabase services are enabled for the target environment.

## Technology stack

### Frontend

- React 18
- Vite 6
- React Router DOM 6
- Axios
- Framer Motion
- Three.js, React Three Fiber, and Drei
- Lucide React
- JavaScript, JSX, CSS, and related frontend tooling

### Backend

- NestJS 12
- TypeScript
- Passport with local, JWT, and Google OAuth strategies
- `bcryptjs` for password hashing
- `class-validator` and `class-transformer` for request validation
- Razorpay for payment processing
- Nodemailer for email delivery
- Swagger and `swagger-ui-express` for API documentation
- Supabase JavaScript client where configured by the server

### Data and tooling

- MongoDB
- npm
- Vitest
- Supertest
- Oxlint
- Prettier
- Node.js 20 or newer

## Repository structure

```text
.
├── public/                 # Frontend static assets
├── src/                    # React/Vite application source
│   ├── components/         # Shared UI and commerce components
│   ├── pages/              # Storefront and account pages
│   ├── hooks/              # Reusable React hooks
│   ├── lib/                # API clients and frontend utilities
│   └── ...
├── server/                 # NestJS backend application
│   ├── src/
│   │   ├── auth/           # Authentication and authorization
│   │   ├── products/       # Product and catalog operations
│   │   ├── orders/         # Checkout and order workflows
│   │   ├── users/          # Customer accounts
│   │   ├── payments/       # Razorpay integration
│   │   └── ...
│   ├── test/               # Backend and end-to-end tests
│   └── package.json
├── package.json            # Frontend scripts and dependencies
├── vite.config.*           # Vite configuration
└── README.md
```

Directory names can evolve as features are added. Follow the existing module structure when extending the application.

## Prerequisites

- Node.js 20 or newer.
- npm 9 or newer.
- A running MongoDB instance or a MongoDB Atlas cluster.
- Razorpay credentials for online payments, if payments are enabled.
- SMTP credentials for transactional email, if email delivery is enabled.
- Google OAuth credentials, if Google sign-in is enabled.
- Any Supabase credentials required by the active server configuration.

## Getting started

The frontend and backend are separate Node.js applications and have separate dependency manifests.

### 1. Clone the repository

```bash
git clone https://github.com/Rushi8118/Lustre-And-Co..git
cd Lustre-And-Co.
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Install backend dependencies

```bash
cd server
npm install
cd ..
```

### 4. Configure environment variables

Create the environment files expected by the frontend and backend configuration. Do not commit secrets. See [Configuration](#configuration) for the services that need to be configured.

### 5. Start the backend

```bash
cd server
npm run start:dev
```

### 6. Start the frontend

In a second terminal:

```bash
npm run dev
```

Open the local frontend URL shown by Vite. Configure the frontend API base URL to point to the running NestJS server.

## Configuration

The exact environment variable names should match the configuration modules used in `server/src` and the frontend API client. Typical deployments require values for the following groups:

### Application and database

| Setting | Purpose |
| --- | --- |
| MongoDB connection string | Connects the API to MongoDB or MongoDB Atlas. |
| API port | Port used by the NestJS server. |
| Frontend API URL | Base URL used by Axios for API requests. |
| JWT secret and expiry | Signs and validates authenticated sessions. |
| CORS origin | Allows requests from the deployed storefront. |

### Authentication and email

| Setting | Purpose |
| --- | --- |
| Google client ID and secret | Enables Google OAuth, when configured. |
| OAuth callback URL | Return URL for Google authentication. |
| SMTP host, port, user, and password | Sends password-reset and transactional emails. |
| Email sender address | Address shown to customers. |

### Payments and integrations

| Setting | Purpose |
| --- | --- |
| Razorpay key ID and secret | Creates and verifies Razorpay payments. |
| Razorpay webhook secret | Verifies payment webhook requests. |
| Supabase URL and key | Used only if enabled by the backend configuration. |

Use a local environment file for development and configure production values through your hosting provider's secret manager. Never expose private keys in frontend variables or commit them to Git.

## Available scripts

### Frontend scripts

Run these commands from the repository root:

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the Vite development server. |
| `npm run build` | Creates the optimized production frontend build. |
| `npm run preview` | Serves the production build locally for verification. |

### Backend scripts

Run these commands from `server/`:

| Command | Description |
| --- | --- |
| `npm run start` | Starts the NestJS server. |
| `npm run start:dev` | Starts the server in watch mode. |
| `npm run start:debug` | Starts the server in debug/watch mode. |
| `npm run build` | Compiles the backend to `dist/`. |
| `npm run start:prod` | Runs the compiled production server. |
| `npm run lint` | Runs Oxlint on backend source and tests. |
| `npm run format` | Formats backend TypeScript with Prettier. |
| `npm run seed` | Runs the backend seed script. |
| `npm run test` | Runs unit tests with Vitest. |
| `npm run test:watch` | Runs Vitest in watch mode. |
| `npm run test:cov` | Runs tests with coverage. |
| `npm run test:e2e` | Runs end-to-end tests using the e2e configuration. |

## API documentation

When the NestJS server is running, Swagger documentation is available at:

```text
http://localhost:<API_PORT>/api/docs
```

Use the Swagger UI to inspect available endpoints, request models, authentication requirements, and response shapes. Confirm the actual port and route prefix in the backend bootstrap/configuration files.

## Database and seed data

1. Start MongoDB locally or create a MongoDB Atlas database.
2. Add the database connection string to the backend environment.
3. Start the backend and confirm the connection succeeds.
4. Run the seed command when sample catalog data is needed:

```bash
cd server
npm run seed
```

Run seed scripts only against a development or explicitly prepared staging database unless the script has been reviewed for production safety. Back up production data before migrations or bulk changes.

## Production deployment

### Frontend

Build the storefront with:

```bash
npm ci
npm run build
```

Deploy the generated Vite output to Vercel, Netlify, a CDN, or another static hosting provider. Configure SPA fallback rules so client-side routes resolve correctly. Set the production API base URL in the frontend configuration.

### Backend

Build and run the NestJS API with:

```bash
cd server
npm ci
npm run build
npm run start:prod
```

The API can be deployed to a Node.js host, container platform, or managed service. Configure:

- Node.js 20 or newer.
- Production MongoDB connection details.
- JWT and OAuth secrets.
- Razorpay and email credentials.
- CORS for the exact storefront origin.
- HTTPS and a health-monitoring strategy.
- Secure logging that does not expose tokens, passwords, or payment data.

### Deployment checklist

- [ ] Frontend points to the production API.
- [ ] Backend can connect to production MongoDB.
- [ ] CORS allows only approved origins.
- [ ] Authentication redirects use production HTTPS URLs.
- [ ] Razorpay webhook URL and secret are configured.
- [ ] Email delivery has been tested.
- [ ] Admin credentials are protected and not shared.
- [ ] Database backups and monitoring are enabled.
- [ ] Frontend routes work after a direct page refresh.

## Testing and code quality

Before opening a pull request, run the relevant checks:

```bash
# Frontend
npm run build

# Backend
cd server
npm run lint
npm run build
npm run test
npm run test:e2e
```

If a test depends on MongoDB, external services, email, or payment providers, use isolated test credentials and test doubles where possible. Do not use real customer or payment data in local or CI test runs.

## Security

- Store secrets in environment variables or a managed secret store.
- Never commit JWT secrets, MongoDB credentials, Razorpay secrets, SMTP passwords, or service-role keys.
- Hash passwords with the backend's password-hashing flow; never store plaintext passwords.
- Validate DTOs and reject unexpected input at API boundaries.
- Protect admin routes with explicit authentication and authorization checks.
- Verify Razorpay signatures and webhooks server-side.
- Restrict CORS to known frontend origins.
- Use HTTPS in production.
- Avoid logging access tokens, password-reset tokens, payment details, or personal customer data.
- Apply rate limiting and abuse protection before exposing authentication and checkout endpoints publicly.

## Contributing

1. Create a feature branch from `main`.
2. Keep frontend and backend changes focused and consistent with existing conventions.
3. Add or update tests for changed API behaviour and business rules.
4. Run the relevant lint, build, and test commands.
5. Update documentation and environment-variable guidance when configuration changes.
6. Open a pull request with a clear summary, testing notes, and screenshots for UI changes.

## License

No project license is currently declared. Confirm licensing requirements with the repository owner before redistributing the source code or commercial assets.

## Support

For issues, open a GitHub issue with:

- A concise problem description.
- Reproduction steps.
- Expected and actual behaviour.
- The affected frontend route or backend endpoint.
- Relevant logs with credentials and personal data removed.
- Node.js, browser, and deployment environment details.

Useful documentation:

- [React](https://react.dev/)
- [Vite](https://vite.dev/guide/)
- [NestJS](https://docs.nestjs.com/)
- [MongoDB](https://www.mongodb.com/docs/)
- [Razorpay](https://razorpay.com/docs/)
- [Vitest](https://vitest.dev/)
