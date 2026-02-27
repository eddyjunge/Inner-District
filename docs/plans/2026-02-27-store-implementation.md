# Inner District Store — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a production-grade e-commerce store for physical products with Convex backend, Stripe Checkout payments, Clerk auth, deployed to Netlify.

**Architecture:** React 19 SPA (Vite) talks to Convex for all data (real-time queries/mutations). Payments go through Stripe Checkout Sessions created server-side via Convex actions. Stripe webhooks hit a Convex HTTP action to fulfill orders. Clerk handles auth with a native Convex JWT integration.

**Tech Stack:** React 19, Vite 6, TypeScript, Convex, Stripe Checkout, Clerk, React Router 7, Netlify

**Design doc:** `docs/plans/2026-02-27-store-design.md`

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/vite-env.d.ts`
- Create: `public/_redirects`
- Create: `.gitignore`
- Create: `.env.local` (git-ignored, manual setup)

**Step 1: Initialize the project**

Run:
```bash
cd D:/innerdistrict
npm init -y
```

**Step 2: Install dependencies**

Run:
```bash
npm install react@19 react-dom@19 react-router@7 convex @clerk/clerk-react @stripe/stripe-js
npm install -D vite@6 @vitejs/plugin-react typescript @types/react @types/react-dom
```

**Step 3: Create vite.config.ts**

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
  },
});
```

**Step 4: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src", "convex"]
}
```

**Step 5: Create tsconfig.node.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

**Step 6: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Inner District</title>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

**Step 7: Create src/vite-env.d.ts**

```typescript
/// <reference types="vite/client" />
```

**Step 8: Create src/main.tsx (minimal, no providers yet)**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

**Step 9: Create src/App.tsx (placeholder)**

```tsx
export default function App() {
  return <h1>Inner District</h1>;
}
```

**Step 10: Create public/_redirects**

```
/* /index.html 200
```

**Step 11: Create .gitignore**

```
node_modules
dist
.env.local
.env
```

**Step 12: Verify the app runs**

Run: `npx vite --open`
Expected: Browser opens showing "Inner District"

**Step 13: Commit**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts index.html src/ public/ .gitignore
git commit -m "feat: scaffold React + Vite project"
```

---

## Task 2: Convex Setup & Schema

**Files:**
- Create: `convex/schema.ts`
- Create: `convex/auth.config.ts`

**Step 1: Initialize Convex**

Run:
```bash
npx convex init
```

Follow the prompts to create a new Convex project. This creates `convex/` directory and `.env.local` with `CONVEX_DEPLOYMENT`.

**Step 2: Install Convex node dependency for actions**

Run:
```bash
npm install stripe
```

**Step 3: Create convex/schema.ts**

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  products: defineTable({
    name: v.string(),
    description: v.string(),
    price: v.number(),
    stripePriceId: v.string(),
    images: v.array(v.string()),
    category: v.string(),
    stock: v.number(),
    isActive: v.boolean(),
  }).index("by_category", ["category"])
    .index("by_isActive", ["isActive"]),

  orders: defineTable({
    userId: v.optional(v.id("users")),
    guestEmail: v.optional(v.string()),
    stripeSessionId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    items: v.array(
      v.object({
        productId: v.id("products"),
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
      }),
    ),
    subtotal: v.number(),
    shipping: v.number(),
    total: v.number(),
    shippingAddress: v.object({
      name: v.string(),
      line1: v.string(),
      line2: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      postalCode: v.string(),
      country: v.string(),
    }),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled"),
    ),
    createdAt: v.number(),
  }).index("by_userId", ["userId"])
    .index("by_stripeSessionId", ["stripeSessionId"])
    .index("by_status", ["status"]),

  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_clerkId", ["clerkId"]),
});
```

**Step 4: Create convex/auth.config.ts**

This configures Clerk as the auth provider. The `CLERK_JWT_ISSUER_DOMAIN` env var must be set in the Convex dashboard.

```typescript
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
```

**Step 5: Push schema to Convex**

Run: `npx convex dev`
Expected: Schema is pushed, `convex/_generated/` is created with type-safe API.

Leave `npx convex dev` running in background during development.

**Step 6: Commit**

```bash
git add convex/schema.ts convex/auth.config.ts
git commit -m "feat: add Convex schema and auth config"
```

---

## Task 3: Convex Product Functions

**Files:**
- Create: `convex/products.ts`

**Step 1: Create convex/products.ts**

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("products")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getMultiple = query({
  args: { ids: v.array(v.id("products")) },
  handler: async (ctx, args) => {
    const products = await Promise.all(
      args.ids.map((id) => ctx.db.get(id)),
    );
    return products.filter((p): p is NonNullable<typeof p> => p !== null);
  },
});
```

**Step 2: Verify functions are deployed**

Check `npx convex dev` output — should show functions synced without errors.

**Step 3: Commit**

```bash
git add convex/products.ts
git commit -m "feat: add product query functions"
```

---

## Task 4: Convex Admin Functions

**Files:**
- Create: `convex/admin.ts`

**Step 1: Create convex/admin.ts**

```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

async function assertAdmin(ctx: { auth: { getUserIdentity: () => Promise<any> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  const adminIds = (process.env.ADMIN_CLERK_IDS ?? "").split(",");
  if (!adminIds.includes(identity.subject)) {
    throw new Error("Not authorized: admin access required");
  }
  return identity;
}

export const listProducts = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx);
    return await ctx.db.query("products").collect();
  },
});

export const listOrders = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("paid"),
        v.literal("shipped"),
        v.literal("delivered"),
        v.literal("cancelled"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    let q = ctx.db.query("orders").order("desc");
    if (args.status) {
      q = ctx.db
        .query("orders")
        .withIndex("by_status", (idx) => idx.eq("status", args.status!))
        .order("desc");
    }
    return await q.collect();
  },
});

export const createProduct = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    price: v.number(),
    stripePriceId: v.string(),
    images: v.array(v.string()),
    category: v.string(),
    stock: v.number(),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    return await ctx.db.insert("products", {
      ...args,
      isActive: true,
    });
  },
});

export const updateProduct = mutation({
  args: {
    id: v.id("products"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    stripePriceId: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
    stock: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    await ctx.db.patch(id, filtered);
  },
});

export const updateOrderStatus = mutation({
  args: {
    id: v.id("orders"),
    status: v.union(
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled"),
    ),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    await ctx.db.patch(args.id, { status: args.status });
  },
});
```

**Step 2: Verify functions deploy**

Check `npx convex dev` output.

**Step 3: Commit**

```bash
git add convex/admin.ts
git commit -m "feat: add admin functions with auth guard"
```

---

## Task 5: Convex Order Functions

**Files:**
- Create: `convex/orders.ts`

**Step 1: Create convex/orders.ts**

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const listByUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) {
      return [];
    }
    return await ctx.db
      .query("orders")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const order = await ctx.db.get(args.id);
    if (!order) return null;

    // Allow access if user owns the order
    if (order.userId) {
      if (!identity) throw new Error("Not authenticated");
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
        .first();
      if (!user || order.userId !== user._id) {
        throw new Error("Not authorized");
      }
    }

    return order;
  },
});

export const getBySessionId = query({
  args: { stripeSessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_stripeSessionId", (q) =>
        q.eq("stripeSessionId", args.stripeSessionId),
      )
      .first();
  },
});
```

**Step 2: Verify functions deploy**

Check `npx convex dev` output.

**Step 3: Commit**

```bash
git add convex/orders.ts
git commit -m "feat: add order query functions"
```

---

## Task 6: Convex User Functions

**Files:**
- Create: `convex/users.ts`

**Step 1: Create convex/users.ts**

```typescript
import { mutation, query } from "./_generated/server";

export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      email: identity.email ?? "",
      name: identity.name ?? undefined,
      createdAt: Date.now(),
    });
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
  },
});
```

**Step 2: Commit**

```bash
git add convex/users.ts
git commit -m "feat: add user functions"
```

---

## Task 7: Stripe Checkout Action

**Files:**
- Create: `convex/stripe.ts`

**Step 1: Create convex/stripe.ts**

This file needs the `"use node"` directive because it imports the Stripe SDK.

```typescript
"use node";

import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

export const createCheckoutSession = action({
  args: {
    items: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
      }),
    ),
    shippingAddress: v.object({
      name: v.string(),
      line1: v.string(),
      line2: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      postalCode: v.string(),
      country: v.string(),
    }),
    guestEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Look up products server-side — never trust client prices
    const products = await Promise.all(
      args.items.map(async (item) => {
        const product = await ctx.runQuery(
          internal.stripe.getProduct,
          { id: item.productId },
        );
        if (!product) throw new Error(`Product not found: ${item.productId}`);
        if (!product.isActive) throw new Error(`Product unavailable: ${product.name}`);
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }
        return { ...product, quantity: item.quantity };
      }),
    );

    // Build Stripe line items from server-side data
    const lineItems = products.map((p) => ({
      price: p.stripePriceId,
      quantity: p.quantity,
    }));

    // Get shipping rate from env
    const shippingAmount = parseInt(process.env.SHIPPING_RATE_CENTS ?? "500");

    // Check if user is authenticated
    const identity = await ctx.auth.getUserIdentity();
    let userId: string | undefined;
    if (identity) {
      const user = await ctx.runQuery(internal.stripe.getUserByClerkId, {
        clerkId: identity.subject,
      });
      userId = user?._id;
    }

    // Store order metadata for webhook fulfillment
    const metadata: Record<string, string> = {
      items: JSON.stringify(
        products.map((p) => ({
          productId: p._id,
          name: p.name,
          price: p.price,
          quantity: p.quantity,
        })),
      ),
      shippingAddress: JSON.stringify(args.shippingAddress),
      shipping: String(shippingAmount),
    };
    if (userId) metadata.userId = userId;
    if (args.guestEmail) metadata.guestEmail = args.guestEmail;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      customer_email: args.guestEmail ?? undefined,
      metadata,
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: shippingAmount, currency: "usd" },
            display_name: "Standard Shipping",
          },
        },
      ],
    });

    return session.url;
  },
});

// Internal query — only callable from other Convex functions
export const getProduct = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

export const fulfillOrder = internalMutation({
  args: {
    stripeSessionId: v.string(),
    stripePaymentIntentId: v.string(),
    items: v.array(
      v.object({
        productId: v.id("products"),
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
      }),
    ),
    shippingAddress: v.object({
      name: v.string(),
      line1: v.string(),
      line2: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      postalCode: v.string(),
      country: v.string(),
    }),
    subtotal: v.number(),
    shipping: v.number(),
    total: v.number(),
    userId: v.optional(v.id("users")),
    guestEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Idempotency: check if order already exists for this session
    const existing = await ctx.db
      .query("orders")
      .withIndex("by_stripeSessionId", (q) =>
        q.eq("stripeSessionId", args.stripeSessionId),
      )
      .first();
    if (existing) return existing._id;

    // Decrement stock for each item
    for (const item of args.items) {
      const product = await ctx.db.get(item.productId);
      if (product) {
        await ctx.db.patch(item.productId, {
          stock: Math.max(0, product.stock - item.quantity),
        });
      }
    }

    // Create the order
    return await ctx.db.insert("orders", {
      userId: args.userId,
      guestEmail: args.guestEmail,
      stripeSessionId: args.stripeSessionId,
      stripePaymentIntentId: args.stripePaymentIntentId,
      items: args.items,
      subtotal: args.subtotal,
      shipping: args.shipping,
      total: args.total,
      shippingAddress: args.shippingAddress,
      status: "paid",
      createdAt: Date.now(),
    });
  },
});
```

**Step 2: Fix imports — internal queries need to use `internalQuery`**

The `getProduct` and `getUserByClerkId` helpers should use `internalQuery` since they're called from the action via `ctx.runQuery(internal.stripe.xxx)`:

Replace the `query` import and those two functions:

```typescript
import { action, internalMutation, internalQuery } from "./_generated/server";

// ... (createCheckoutSession stays the same)

export const getProduct = internalQuery({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getUserByClerkId = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});
```

**Step 3: Verify functions deploy**

Check `npx convex dev` output.

**Step 4: Commit**

```bash
git add convex/stripe.ts
git commit -m "feat: add Stripe checkout session action and order fulfillment"
```

---

## Task 8: Stripe Webhook HTTP Action

**Files:**
- Create: `convex/http.ts`

**Step 1: Create convex/http.ts**

```typescript
"use node";

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

const http = httpRouter();

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return new Response("Missing stripe-signature header", { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response("Invalid signature", { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Parse metadata set during checkout session creation
      const items = JSON.parse(session.metadata?.items ?? "[]");
      const shippingAddress = JSON.parse(
        session.metadata?.shippingAddress ?? "{}",
      );
      const shipping = parseInt(session.metadata?.shipping ?? "0");
      const userId = session.metadata?.userId ?? undefined;
      const guestEmail = session.metadata?.guestEmail ?? session.customer_email ?? undefined;

      const subtotal = session.amount_subtotal ?? 0;
      const total = session.amount_total ?? 0;

      await ctx.runMutation(internal.stripe.fulfillOrder, {
        stripeSessionId: session.id,
        stripePaymentIntentId: (session.payment_intent as string) ?? "",
        items,
        shippingAddress,
        subtotal,
        shipping,
        total,
        userId,
        guestEmail,
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
```

**Step 2: Verify it deploys**

Check `npx convex dev` output. The HTTP action URL will be printed: `https://<deployment>.convex.site/stripe/webhook`

**Step 3: Commit**

```bash
git add convex/http.ts
git commit -m "feat: add Stripe webhook HTTP action with signature verification"
```

---

## Task 9: Frontend Providers Setup

**Files:**
- Modify: `src/main.tsx`

**Step 1: Update src/main.tsx with Clerk + Convex providers**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import App from "./App";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;
if (!CONVEX_URL) throw new Error("Missing VITE_CONVEX_URL");

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!CLERK_KEY) throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");

const convex = new ConvexReactClient(CONVEX_URL);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={CLERK_KEY} afterSignOutUrl="/">
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </React.StrictMode>,
);
```

**Step 2: Create .env.local (do NOT commit)**

```
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
```

**Step 3: Verify the app still runs**

Run: `npx vite`
Expected: App loads without errors (Clerk/Convex may show warnings if keys aren't configured yet, that's fine).

**Step 4: Commit**

```bash
git add src/main.tsx
git commit -m "feat: add Clerk + Convex providers"
```

---

## Task 10: Cart State (localStorage)

**Files:**
- Create: `src/lib/cart.ts`

**Step 1: Create src/lib/cart.ts**

```typescript
import { useState, useEffect, useCallback } from "react";
import { Id } from "../../convex/_generated/dataModel";

export interface CartItem {
  productId: Id<"products">;
  quantity: number;
}

const CART_KEY = "inner-district-cart";

function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("cart-updated"));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(readCart);

  useEffect(() => {
    const handler = () => setItems(readCart());
    window.addEventListener("cart-updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("cart-updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const addItem = useCallback((productId: Id<"products">, quantity = 1) => {
    const current = readCart();
    const idx = current.findIndex((i) => i.productId === productId);
    if (idx >= 0) {
      current[idx].quantity += quantity;
    } else {
      current.push({ productId, quantity });
    }
    writeCart(current);
  }, []);

  const removeItem = useCallback((productId: Id<"products">) => {
    const current = readCart().filter((i) => i.productId !== productId);
    writeCart(current);
  }, []);

  const updateQuantity = useCallback(
    (productId: Id<"products">, quantity: number) => {
      if (quantity <= 0) {
        removeItem(productId);
        return;
      }
      const current = readCart();
      const idx = current.findIndex((i) => i.productId === productId);
      if (idx >= 0) {
        current[idx].quantity = quantity;
        writeCart(current);
      }
    },
    [removeItem],
  );

  const clearCart = useCallback(() => {
    writeCart([]);
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return { items, addItem, removeItem, updateQuantity, clearCart, totalItems };
}
```

**Step 2: Commit**

```bash
git add src/lib/cart.ts
git commit -m "feat: add localStorage cart with React hook"
```

---

## Task 11: Frontend Pages — Routing & Layout

**Files:**
- Modify: `src/App.tsx`
- Create: `src/pages/Catalog.tsx`
- Create: `src/pages/ProductDetail.tsx`
- Create: `src/pages/Cart.tsx`
- Create: `src/pages/Checkout.tsx`
- Create: `src/pages/Success.tsx`
- Create: `src/pages/Cancel.tsx`
- Create: `src/pages/Account.tsx`
- Create: `src/pages/Admin.tsx`
- Create: `src/components/Layout.tsx`

**Step 1: Create src/components/Layout.tsx**

```tsx
import { Link } from "react-router";
import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/clerk-react";
import { useCart } from "../lib/cart";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { totalItems } = useCart();

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 2rem", borderBottom: "1px solid #ddd" }}>
        <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
          <strong>Inner District</strong>
        </Link>
        <nav style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <Link to="/cart">Cart ({totalItems})</Link>
          <SignedIn>
            <Link to="/account">Orders</Link>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal" />
          </SignedOut>
        </nav>
      </header>
      <main style={{ padding: "2rem" }}>{children}</main>
    </div>
  );
}
```

**Step 2: Create page stubs**

Create each page file with a minimal placeholder. Full implementations follow in later tasks.

`src/pages/Catalog.tsx`:
```tsx
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Link } from "react-router";
import { useCart } from "../lib/cart";

export default function Catalog() {
  const products = useQuery(api.products.list);
  const { addItem } = useCart();

  if (products === undefined) return <p>Loading...</p>;

  return (
    <div>
      <h1>Products</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1.5rem" }}>
        {products.map((product) => (
          <div key={product._id} style={{ border: "1px solid #ddd", padding: "1rem", borderRadius: "8px" }}>
            <Link to={`/product/${product._id}`}>
              <h3>{product.name}</h3>
            </Link>
            <p>${(product.price / 100).toFixed(2)}</p>
            <p>{product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</p>
            <button
              onClick={() => addItem(product._id)}
              disabled={product.stock === 0}
            >
              Add to Cart
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

`src/pages/ProductDetail.tsx`:
```tsx
import { useParams, Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useCart } from "../lib/cart";

export default function ProductDetail() {
  const { id } = useParams();
  const product = useQuery(api.products.get, {
    id: id as Id<"products">,
  });
  const { addItem } = useCart();

  if (product === undefined) return <p>Loading...</p>;
  if (product === null) return <p>Product not found. <Link to="/">Back to store</Link></p>;

  return (
    <div>
      <Link to="/">&larr; Back</Link>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
        ${(product.price / 100).toFixed(2)}
      </p>
      <p>{product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</p>
      <button
        onClick={() => addItem(product._id)}
        disabled={product.stock === 0}
      >
        Add to Cart
      </button>
    </div>
  );
}
```

`src/pages/Cart.tsx`:
```tsx
import { Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCart } from "../lib/cart";

export default function Cart() {
  const { items, removeItem, updateQuantity, totalItems } = useCart();
  const productIds = items.map((i) => i.productId);
  const products = useQuery(
    api.products.getMultiple,
    productIds.length > 0 ? { ids: productIds } : "skip",
  );

  if (totalItems === 0) {
    return (
      <div>
        <h1>Cart</h1>
        <p>Your cart is empty. <Link to="/">Browse products</Link></p>
      </div>
    );
  }

  if (products === undefined) return <p>Loading...</p>;

  const cartWithProducts = items
    .map((item) => {
      const product = products.find((p) => p._id === item.productId);
      return product ? { ...item, product } : null;
    })
    .filter((i): i is NonNullable<typeof i> => i !== null);

  const subtotal = cartWithProducts.reduce(
    (sum, i) => sum + i.product.price * i.quantity,
    0,
  );

  return (
    <div>
      <h1>Cart</h1>
      {cartWithProducts.map(({ productId, quantity, product }) => (
        <div key={productId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid #eee" }}>
          <div>
            <strong>{product.name}</strong>
            <span> — ${(product.price / 100).toFixed(2)} each</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button onClick={() => updateQuantity(productId, quantity - 1)}>-</button>
            <span>{quantity}</span>
            <button onClick={() => updateQuantity(productId, quantity + 1)}>+</button>
            <button onClick={() => removeItem(productId)}>Remove</button>
          </div>
        </div>
      ))}
      <p style={{ marginTop: "1rem", fontSize: "1.2rem" }}>
        Subtotal: ${(subtotal / 100).toFixed(2)}
      </p>
      <Link to="/checkout">
        <button>Proceed to Checkout</button>
      </Link>
    </div>
  );
}
```

`src/pages/Checkout.tsx`:
```tsx
import { useState, FormEvent } from "react";
import { useAction } from "convex/react";
import { useAuth } from "@clerk/clerk-react";
import { api } from "../../convex/_generated/api";
import { useCart } from "../lib/cart";
import { Link } from "react-router";

export default function Checkout() {
  const { items, totalItems } = useCart();
  const { isSignedIn } = useAuth();
  const createCheckout = useAction(api.stripe.createCheckoutSession);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
  });

  if (totalItems === 0) {
    return <p>Your cart is empty. <Link to="/">Browse products</Link></p>;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = await createCheckout({
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
        shippingAddress: {
          name: form.name,
          line1: form.line1,
          line2: form.line2 || undefined,
          city: form.city,
          state: form.state,
          postalCode: form.postalCode,
          country: form.country,
        },
        guestEmail: !isSignedIn ? form.email : undefined,
      });

      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoading(false);
    }
  };

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div style={{ maxWidth: 500 }}>
      <h1>Checkout</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <h2>Shipping Address</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <input placeholder="Full Name" value={form.name} onChange={update("name")} required />
          {!isSignedIn && (
            <input placeholder="Email" type="email" value={form.email} onChange={update("email")} required />
          )}
          <input placeholder="Address Line 1" value={form.line1} onChange={update("line1")} required />
          <input placeholder="Address Line 2 (optional)" value={form.line2} onChange={update("line2")} />
          <input placeholder="City" value={form.city} onChange={update("city")} required />
          <input placeholder="State" value={form.state} onChange={update("state")} required />
          <input placeholder="Postal Code" value={form.postalCode} onChange={update("postalCode")} required />
          <input placeholder="Country" value={form.country} onChange={update("country")} required />
        </div>
        <button type="submit" disabled={loading} style={{ marginTop: "1rem" }}>
          {loading ? "Redirecting to payment..." : "Pay with Stripe"}
        </button>
      </form>
    </div>
  );
}
```

`src/pages/Success.tsx`:
```tsx
import { useSearchParams, Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect } from "react";
import { useCart } from "../lib/cart";

export default function Success() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  const order = useQuery(
    api.orders.getBySessionId,
    sessionId ? { stripeSessionId: sessionId } : "skip",
  );

  return (
    <div>
      <h1>Payment Successful!</h1>
      {order ? (
        <div>
          <p>Order confirmed. Total: ${(order.total / 100).toFixed(2)}</p>
          <p>Status: {order.status}</p>
          <p>Items:</p>
          <ul>
            {order.items.map((item, i) => (
              <li key={i}>
                {item.name} x{item.quantity} — ${(item.price / 100).toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p>Processing your order... This page will update automatically.</p>
      )}
      <Link to="/">Continue Shopping</Link>
    </div>
  );
}
```

`src/pages/Cancel.tsx`:
```tsx
import { Link } from "react-router";

export default function Cancel() {
  return (
    <div>
      <h1>Payment Cancelled</h1>
      <p>Your payment was cancelled. No charges were made.</p>
      <Link to="/cart">Return to Cart</Link>
    </div>
  );
}
```

`src/pages/Account.tsx`:
```tsx
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Link } from "react-router";

export default function Account() {
  const orders = useQuery(api.orders.listByUser);

  if (orders === undefined) return <p>Loading...</p>;

  return (
    <div>
      <h1>My Orders</h1>
      {orders.length === 0 ? (
        <p>No orders yet. <Link to="/">Browse products</Link></p>
      ) : (
        orders.map((order) => (
          <div key={order._id} style={{ border: "1px solid #ddd", padding: "1rem", marginBottom: "1rem", borderRadius: "8px" }}>
            <p><strong>Order {order._id}</strong></p>
            <p>Date: {new Date(order.createdAt).toLocaleDateString()}</p>
            <p>Status: {order.status}</p>
            <p>Total: ${(order.total / 100).toFixed(2)}</p>
            <ul>
              {order.items.map((item, i) => (
                <li key={i}>{item.name} x{item.quantity}</li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
```

`src/pages/Admin.tsx`:
```tsx
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function Admin() {
  const products = useQuery(api.admin.listProducts);
  const orders = useQuery(api.admin.listOrders, {});
  const createProduct = useMutation(api.admin.createProduct);
  const updateProduct = useMutation(api.admin.updateProduct);
  const updateOrderStatus = useMutation(api.admin.updateOrderStatus);

  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
    stripePriceId: "",
    category: "",
    stock: "",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createProduct({
      name: newProduct.name,
      description: newProduct.description,
      price: Math.round(parseFloat(newProduct.price) * 100),
      stripePriceId: newProduct.stripePriceId,
      images: [],
      category: newProduct.category,
      stock: parseInt(newProduct.stock),
    });
    setNewProduct({ name: "", description: "", price: "", stripePriceId: "", category: "", stock: "" });
  };

  return (
    <div>
      <h1>Admin Dashboard</h1>

      <section>
        <h2>Add Product</h2>
        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 400 }}>
          <input placeholder="Name" value={newProduct.name} onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))} required />
          <input placeholder="Description" value={newProduct.description} onChange={(e) => setNewProduct((p) => ({ ...p, description: e.target.value }))} required />
          <input placeholder="Price (dollars, e.g. 19.99)" value={newProduct.price} onChange={(e) => setNewProduct((p) => ({ ...p, price: e.target.value }))} required />
          <input placeholder="Stripe Price ID (price_xxx)" value={newProduct.stripePriceId} onChange={(e) => setNewProduct((p) => ({ ...p, stripePriceId: e.target.value }))} required />
          <input placeholder="Category" value={newProduct.category} onChange={(e) => setNewProduct((p) => ({ ...p, category: e.target.value }))} required />
          <input placeholder="Stock" type="number" value={newProduct.stock} onChange={(e) => setNewProduct((p) => ({ ...p, stock: e.target.value }))} required />
          <button type="submit">Create Product</button>
        </form>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Products</h2>
        {products === undefined ? (
          <p>Loading...</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "0.5rem" }}>Name</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "0.5rem" }}>Price</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "0.5rem" }}>Stock</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "0.5rem" }}>Active</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "0.5rem" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p._id}>
                  <td style={{ padding: "0.5rem" }}>{p.name}</td>
                  <td style={{ padding: "0.5rem" }}>${(p.price / 100).toFixed(2)}</td>
                  <td style={{ padding: "0.5rem" }}>{p.stock}</td>
                  <td style={{ padding: "0.5rem" }}>{p.isActive ? "Yes" : "No"}</td>
                  <td style={{ padding: "0.5rem" }}>
                    <button onClick={() => updateProduct({ id: p._id, isActive: !p.isActive })}>
                      {p.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Orders</h2>
        {orders === undefined ? (
          <p>Loading...</p>
        ) : orders.length === 0 ? (
          <p>No orders yet.</p>
        ) : (
          orders.map((order) => (
            <div key={order._id} style={{ border: "1px solid #ddd", padding: "1rem", marginBottom: "0.5rem", borderRadius: "8px" }}>
              <p><strong>{order._id}</strong> — {order.status} — ${(order.total / 100).toFixed(2)}</p>
              <p>{new Date(order.createdAt).toLocaleString()}</p>
              <p>{order.items.map((i) => `${i.name} x${i.quantity}`).join(", ")}</p>
              {order.status === "paid" && (
                <button onClick={() => updateOrderStatus({ id: order._id, status: "shipped" })}>
                  Mark Shipped
                </button>
              )}
              {order.status === "shipped" && (
                <button onClick={() => updateOrderStatus({ id: order._id, status: "delivered" })}>
                  Mark Delivered
                </button>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
```

**Step 3: Update src/App.tsx with routing**

```tsx
import { Routes, Route } from "react-router";
import { useMutation } from "convex/react";
import { useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";
import { api } from "../convex/_generated/api";
import Layout from "./components/Layout";
import Catalog from "./pages/Catalog";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Success from "./pages/Success";
import Cancel from "./pages/Cancel";
import Account from "./pages/Account";
import Admin from "./pages/Admin";

export default function App() {
  const { isSignedIn } = useAuth();
  const ensureUser = useMutation(api.users.ensureUser);

  useEffect(() => {
    if (isSignedIn) {
      ensureUser();
    }
  }, [isSignedIn, ensureUser]);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/success" element={<Success />} />
        <Route path="/cancel" element={<Cancel />} />
        <Route path="/account" element={<Account />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Layout>
  );
}
```

**Step 4: Verify the app runs with all routes**

Run: `npx vite`
Expected: App loads, navigation works, products page shows "Loading..." (no data yet).

**Step 5: Commit**

```bash
git add src/
git commit -m "feat: add all frontend pages, routing, and layout"
```

---

## Task 12: Netlify Deployment Config

**Files:**
- Create: `netlify.toml`

**Step 1: Create netlify.toml**

```toml
[build]
  command = "npx convex deploy --cmd 'npm run build'"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"
```

**Step 2: Add build script to package.json**

Ensure package.json has:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

**Step 3: Commit**

```bash
git add netlify.toml package.json
git commit -m "feat: add Netlify deployment config"
```

---

## Task 13: Environment Variables & External Service Setup

This task is manual — no code to write, but critical for the app to work.

**Step 1: Stripe Setup**

1. Go to https://dashboard.stripe.com
2. Create products and prices in the Stripe dashboard (test mode)
3. Note each Price ID (`price_xxx`) — you'll enter these when creating products in the admin
4. Go to Developers → Webhooks → Add endpoint
5. URL: `https://<your-convex-deployment>.convex.site/stripe/webhook`
6. Events: `checkout.session.completed`
7. Copy the webhook signing secret (`whsec_xxx`)

**Step 2: Clerk Setup**

1. Go to https://dashboard.clerk.com
2. Create application
3. Go to JWT Templates → Create → Name it exactly `convex`
4. Copy the Issuer domain (e.g., `https://your-instance.clerk.accounts.dev`)
5. Copy the Publishable Key (`pk_test_xxx`)

**Step 3: Convex Environment Variables**

In the Convex dashboard (Settings → Environment Variables), set:
```
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
CLERK_JWT_ISSUER_DOMAIN=https://your-instance.clerk.accounts.dev
ADMIN_CLERK_IDS=user_xxx,user_yyy
SHIPPING_RATE_CENTS=500
FRONTEND_URL=https://your-site.netlify.app
```

**Step 4: Netlify Environment Variables**

In the Netlify dashboard (Site settings → Environment variables), set:
```
CONVEX_DEPLOY_KEY=<from Convex dashboard → Deploy Keys>
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
```

**Step 5: Local .env.local**

```
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
```

---

## Task 14: End-to-End Verification

**Step 1: Start dev servers**

Run in separate terminals:
```bash
npx convex dev
npx vite
```

**Step 2: Test product creation via admin**

1. Sign in with your admin Clerk account
2. Go to `/admin`
3. Create a product (use a Stripe test Price ID from your dashboard)

**Step 3: Test shopping flow**

1. Go to `/` — verify product appears
2. Click product → verify detail page
3. Add to cart → go to `/cart` → verify cart
4. Click checkout → fill shipping form → click "Pay with Stripe"
5. Should redirect to Stripe Checkout (use test card `4242 4242 4242 4242`)
6. Complete payment → redirected to `/success`
7. Verify order appears in admin dashboard
8. Verify stock was decremented

**Step 4: Test Stripe webhook locally (optional)**

```bash
stripe listen --forward-to https://your-deployment.convex.site/stripe/webhook
```

**Step 5: Test guest vs authenticated checkout**

1. Sign out → add to cart → checkout as guest (enter email)
2. Sign in → add to cart → checkout (email auto-attached)
3. Go to `/account` → verify order history

**Step 6: Deploy to Netlify**

Push to GitHub `main` branch:
```bash
git push origin main
```

Netlify auto-builds and deploys. Verify the live site works end-to-end.

---

## Summary of Environment Variables

| Variable | Where | Value |
|---|---|---|
| `STRIPE_SECRET_KEY` | Convex env | `sk_test_xxx` |
| `STRIPE_WEBHOOK_SECRET` | Convex env | `whsec_xxx` |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex env | `https://xxx.clerk.accounts.dev` |
| `ADMIN_CLERK_IDS` | Convex env | `user_xxx,user_yyy` |
| `SHIPPING_RATE_CENTS` | Convex env | `500` |
| `FRONTEND_URL` | Convex env | `https://your-site.netlify.app` |
| `CONVEX_DEPLOY_KEY` | Netlify env | From Convex dashboard |
| `VITE_CONVEX_URL` | Netlify env + `.env.local` | `https://xxx.convex.cloud` |
| `VITE_CLERK_PUBLISHABLE_KEY` | Netlify env + `.env.local` | `pk_test_xxx` |
