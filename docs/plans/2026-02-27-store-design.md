# Inner District Store — Design Document

**Date:** 2026-02-27
**Status:** Approved

## Summary

A production-grade e-commerce store for physical products, built with React (Vite) + Convex + Stripe Checkout + Clerk auth, deployed as a static SPA on Netlify.

## Stack

- **Frontend:** React 19 + Vite (SPA)
- **Backend:** Convex (real-time queries, mutations, actions, HTTP actions)
- **Payments:** Stripe Checkout Sessions (hosted payment page)
- **Auth:** Clerk (with Convex JWT integration)
- **Hosting:** Netlify (static deploy from GitHub)

## Architecture

```
Netlify (CDN) — Static SPA (React + Vite)
    │                    │
    Convex SDK           Clerk SDK
    (real-time)          (auth)
    │                    │
    ▼                    ▼
Convex Backend  ◄──  Clerk (Auth)
    │
    HTTP Action (webhook)
    │
    ▼
Stripe (Checkout Sessions + Webhooks)
```

### Flow

1. User browses products (Convex queries)
2. Adds to cart (client-side localStorage)
3. Clicks checkout → enters shipping info
4. Convex action creates Stripe Checkout Session (server-side, from stripePriceId)
5. User redirected to Stripe's hosted payment page
6. Stripe webhook fires to Convex HTTP action → order created, stock decremented
7. User redirected to success page

## Data Model

### products

| Field | Type | Notes |
|---|---|---|
| name | string | Product name |
| description | string | Product description |
| price | number | In cents (1999 = $19.99) |
| stripePriceId | string | Stripe Price object ID — source of truth for charging |
| images | string[] | Convex storage IDs |
| category | string | Product category |
| stock | number | Current inventory count |
| isActive | boolean | Soft-delete / hide from store |

### orders

| Field | Type | Notes |
|---|---|---|
| userId | Id\<"users"\>? | Null for guest checkout |
| guestEmail | string? | For guest orders |
| stripeSessionId | string | Checkout Session ID (idempotency key) |
| stripePaymentIntentId | string? | From webhook payload |
| items | Array\<{productId, name, price, quantity}\> | Snapshot at purchase time |
| subtotal | number | Cents |
| shipping | number | Cents (flat rate) |
| total | number | Cents |
| shippingAddress | object | {name, line1, line2?, city, state, postalCode, country} |
| status | enum | "pending" \| "paid" \| "shipped" \| "delivered" \| "cancelled" |
| createdAt | number | Timestamp |

### users

| Field | Type | Notes |
|---|---|---|
| clerkId | string | Clerk user ID |
| email | string | User email |
| name | string? | Display name |
| createdAt | number | Timestamp |

## Backend Functions

### Queries (public)

- `products.list` — all active products
- `products.get(id)` — single product detail

### Queries (authenticated)

- `orders.listByUser` — user's order history (scoped to userId)
- `orders.get(id)` — single order detail (scoped to owner)

### Queries (admin)

- `admin.listProducts` — all products including inactive
- `admin.listOrders` — all orders with filtering

### Mutations (admin)

- `admin.createProduct` — add product
- `admin.updateProduct` — edit product/stock
- `admin.updateOrderStatus` — mark shipped/delivered

### Actions

- `stripe.createCheckoutSession` — takes [{productId, quantity}], validates stock, looks up stripePriceId, creates Stripe Checkout Session, returns URL
- `stripe.fulfillOrder` — internal action called by webhook handler, creates order, decrements stock (idempotent on stripeSessionId)

### HTTP Actions

- `POST /stripe/webhook` — receives Stripe webhooks, verifies signature (raw body + Stripe-Signature header + endpoint secret), dispatches to fulfillOrder for checkout.session.completed events

## Frontend Pages

| Route | Page | Auth |
|---|---|---|
| `/` | Product catalog | No |
| `/product/:id` | Product detail | No |
| `/cart` | Cart review | No |
| `/checkout` | Shipping address + redirect to Stripe | No |
| `/success` | Order confirmation | No |
| `/cancel` | Return to cart | No |
| `/account` | Order history | Yes |
| `/admin` | Admin dashboard | Admin |

### Cart

- Stored in localStorage: [{productId, quantity}]
- Cart page fetches live product data from Convex for current prices/stock
- At checkout, only productId + quantity sent to server — server computes charges

### Netlify SPA Routing

`_redirects` file: `/* /index.html 200`

## Security

### Payment Security

- Stripe Checkout Sessions — card data never touches our servers
- Server creates sessions from stripePriceId — client never dictates prices
- Webhook signature verification with stripe.webhooks.constructEvent()
- Idempotent webhook handling — deduplication on stripeSessionId

### Auth Security

- Clerk handles all authentication — no custom password storage
- Convex functions validate ctx.auth.getUserIdentity() server-side
- Admin functions check user ID against allowed admin list (env var)
- Users can only query their own orders

### Data Security

- All Convex functions run server-side — no database credentials exposed
- Stripe secret key in Convex env vars only
- Clerk: only publishable key in client; secret key server-side
- No .env files committed

### Clerk-Convex Wiring

- Clerk: JWT template named "convex" (exact name required)
- Convex: Clerk issuer domain in auth.config.ts
- React: ClerkProvider + ConvexProviderWithClerk

## Environment Setup Required

- Stripe account (test mode → live)
- Clerk application (with Convex JWT template)
- Convex project
- Netlify site linked to GitHub repo

## Shipping

Flat rate shipping — configurable amounts stored as Convex env vars (domestic/international).
