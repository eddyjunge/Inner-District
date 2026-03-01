# Admin EUR, Per-Region Currency & Digital Goods Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all `$` symbols to `€`, add per-region local currency display using free exchange rates, and support selling digital goods (downloadable files + license keys) alongside physical products.

**Architecture:** Frontend-only currency display via cached exchange rates from frankfurter.app. Digital goods via `productType` field on products with conditional shipping (€0 for digital-only carts). All Stripe charges remain in EUR.

**Tech Stack:** React 19, Vite, Convex (serverless DB + Node.js actions), Stripe, TypeScript

---

### Task 1: Fix currency symbols ($ → €)

**Files:**
- Modify: `src/pages/Admin.tsx:183,279`
- Modify: `src/pages/Cart.tsx:47,79`
- Modify: `src/pages/Catalog.tsx:40`
- Modify: `src/pages/ProductDetail.tsx:61`

**Step 1: Replace all `$` with `€` in frontend pages**

In `src/pages/Admin.tsx` line 183, change placeholder:
```
"Price (dollars, e.g. 19.99)"  →  "Price (EUR, e.g. 19.99)"
```

In `src/pages/Admin.tsx` line 279:
```
<td>${(p.price / 100).toFixed(2)}</td>  →  <td>€{(p.price / 100).toFixed(2)}</td>
```

In `src/pages/Cart.tsx` line 47:
```
${(product.price / 100).toFixed(2)} each  →  €{(product.price / 100).toFixed(2)} each
```

In `src/pages/Cart.tsx` line 79:
```
Subtotal: ${(subtotal / 100).toFixed(2)}  →  Subtotal: €{(subtotal / 100).toFixed(2)}
```

In `src/pages/Catalog.tsx` line 40:
```
${(product.price / 100).toFixed(2)}  →  €{(product.price / 100).toFixed(2)}
```

In `src/pages/ProductDetail.tsx` line 61:
```
${(product.price / 100).toFixed(2)}  →  €{(product.price / 100).toFixed(2)}
```

**Step 2: Verify the app builds**

Run: `cd D:/innerdistrict && npx vite build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add src/pages/Admin.tsx src/pages/Cart.tsx src/pages/Catalog.tsx src/pages/ProductDetail.tsx
git commit -m "fix: replace $ with € across all storefront pages"
```

---

### Task 2: Update Convex schema for exchange rates + digital goods

**Files:**
- Modify: `convex/schema.ts`

**Step 1: Add `exchangeRates` table and extend `products` and `orders`**

Replace the entire `convex/schema.ts` with:

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
    // Digital goods fields
    productType: v.optional(v.union(v.literal("physical"), v.literal("digital"))),
    downloadUrl: v.optional(v.string()),
    licenseKey: v.optional(v.string()),
  }).index("by_category", ["category"])
    .index("by_isActive", ["isActive"]),

  orders: defineTable({
    email: v.string(),
    stripeSessionId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    items: v.array(
      v.object({
        productId: v.id("products"),
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
        productType: v.optional(v.union(v.literal("physical"), v.literal("digital"))),
        downloadUrl: v.optional(v.string()),
        licenseKey: v.optional(v.string()),
      }),
    ),
    subtotal: v.number(),
    shipping: v.number(),
    total: v.number(),
    vatRate: v.optional(v.number()),
    vatAmount: v.optional(v.number()),
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
  }).index("by_stripeSessionId", ["stripeSessionId"])
    .index("by_status", ["status"])
    .index("by_email", ["email"]),

  exchangeRates: defineTable({
    baseCurrency: v.string(),
    rates: v.any(),
    updatedAt: v.number(),
  }),
});
```

**Key decisions:**
- `productType` is `v.optional()` so existing products (which have no `productType`) remain valid. Application code defaults to `"physical"` when absent.
- `downloadUrl` and `licenseKey` are optional on both products and order items.
- `exchangeRates` uses `v.any()` for the rates map since Convex doesn't have a built-in `Record<string, number>` validator.

**Step 2: Verify schema compiles**

Run: `cd D:/innerdistrict && npx vite build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: add exchangeRates table and digital goods fields to schema"
```

---

### Task 3: Exchange rates backend

**Files:**
- Create: `convex/exchangeRates.ts`

**Step 1: Create the exchange rates module**

Create `convex/exchangeRates.ts`:

```typescript
"use node";

import { action, internalAction } from "./_generated/server";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

export const getCached = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("exchangeRates").first();
  },
});

export const upsertRates = internalMutation({
  args: {
    rates: v.any(),
    baseCurrency: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("exchangeRates").first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        rates: args.rates,
        baseCurrency: args.baseCurrency,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("exchangeRates", {
        rates: args.rates,
        baseCurrency: args.baseCurrency,
        updatedAt: Date.now(),
      });
    }
  },
});

export const fetchAndCache = action({
  args: {},
  handler: async (ctx) => {
    // Check if cache is still fresh
    const cached = await ctx.runQuery(internal.exchangeRates.getCached);
    if (cached && Date.now() - cached.updatedAt < CACHE_DURATION_MS) {
      return cached.rates;
    }

    // Fetch fresh rates from Frankfurter API
    const response = await fetch("https://api.frankfurter.app/latest?from=EUR");
    if (!response.ok) {
      // If fetch fails but we have cached data, return it
      if (cached) return cached.rates;
      return null;
    }

    const data = await response.json();
    const rates = data.rates as Record<string, number>;

    await ctx.runMutation(internal.exchangeRates.upsertRates, {
      rates,
      baseCurrency: "EUR",
    });

    return rates;
  },
});

// Public query for frontend — returns cached rates (may be null if never fetched)
export const getRates = query({
  args: {},
  handler: async (ctx) => {
    const cached = await ctx.db.query("exchangeRates").first();
    if (!cached) return null;
    return {
      rates: cached.rates as Record<string, number>,
      updatedAt: cached.updatedAt,
    };
  },
});
```

**Note:** The `fetchAndCache` action is called from the frontend on mount. The `getRates` query is reactive and will update automatically when rates are cached. The separation means the frontend can show cached rates instantly while triggering a refresh if needed.

**Step 2: Verify build**

Run: `cd D:/innerdistrict && npx vite build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add convex/exchangeRates.ts
git commit -m "feat: add exchange rates fetching and caching from Frankfurter API"
```

---

### Task 4: Currency display utility

**Files:**
- Create: `src/lib/currencyDisplay.ts`

**Step 1: Create locale-to-currency mapping and formatting helper**

Create `src/lib/currencyDisplay.ts`:

```typescript
// Maps locale language-region to currency code
// Only non-EUR currencies — if locale maps to EUR, we skip the conversion display
const LOCALE_CURRENCY_MAP: Record<string, string> = {
  "pl": "PLN",
  "sv": "SEK",
  "da": "DKK",
  "cs": "CZK",
  "hu": "HUF",
  "ro": "RON",
  "bg": "BGN",
  "en-GB": "GBP",
  "en-US": "USD",
  "en-AU": "AUD",
  "en-CA": "CAD",
  "ja": "JPY",
  "zh": "CNY",
  "ko": "KRW",
};

/**
 * Detect the user's likely currency from browser locale.
 * Returns null if the user is in a EUR country (no conversion needed).
 */
export function detectUserCurrency(): string | null {
  const locale = navigator.language; // e.g. "pl-PL", "en-GB", "de-DE"

  // Try exact match first (e.g. "en-GB")
  if (LOCALE_CURRENCY_MAP[locale]) {
    return LOCALE_CURRENCY_MAP[locale];
  }

  // Try language-only match (e.g. "pl" from "pl-PL")
  const lang = locale.split("-")[0];
  if (LOCALE_CURRENCY_MAP[lang]) {
    return LOCALE_CURRENCY_MAP[lang];
  }

  // No match = EUR country or unknown, skip conversion
  return null;
}

/**
 * Format a EUR cents amount with optional local currency approximation.
 * Returns: "€30.00" or "€30.00 (~139 PLN)"
 */
export function formatPrice(
  cents: number,
  rates: Record<string, number> | null,
  userCurrency: string | null,
): string {
  const eurAmount = (cents / 100).toFixed(2);
  const eurStr = `€${eurAmount}`;

  if (!userCurrency || !rates || !rates[userCurrency]) {
    return eurStr;
  }

  const converted = (cents / 100) * rates[userCurrency];
  // Format with locale-appropriate separators, no decimals for large-unit currencies
  const noDecimalCurrencies = ["JPY", "KRW", "HUF"];
  const decimals = noDecimalCurrencies.includes(userCurrency) ? 0 : 2;
  const localStr = converted.toFixed(decimals);

  return `${eurStr} (~${localStr} ${userCurrency})`;
}
```

**Step 2: Verify build**

Run: `cd D:/innerdistrict && npx vite build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/lib/currencyDisplay.ts
git commit -m "feat: add locale-based currency display utility"
```

---

### Task 5: Integrate currency display into storefront pages

**Files:**
- Modify: `src/pages/Catalog.tsx`
- Modify: `src/pages/ProductDetail.tsx`
- Modify: `src/pages/Cart.tsx`

Each page needs to:
1. Import and call `useQuery(api.exchangeRates.getRates)` for cached rates
2. Import and call `useAction(api.exchangeRates.fetchAndCache)` on mount to refresh if stale
3. Use `detectUserCurrency()` and `formatPrice()` for display

**Step 1: Update Catalog.tsx**

Add imports at top:
```typescript
import { useQuery, useAction } from "convex/react";
import { useEffect, useMemo } from "react";
import { detectUserCurrency, formatPrice } from "../lib/currencyDisplay";
```

Note: `useQuery` is already imported from convex/react, so just add `useAction` to the existing import. Similarly `useEffect` and `useMemo` need to be imported from react (no react import exists currently).

Inside the component, before the return, add:
```typescript
const exchangeRates = useQuery(api.exchangeRates.getRates);
const refreshRates = useAction(api.exchangeRates.fetchAndCache);
const userCurrency = useMemo(() => detectUserCurrency(), []);

useEffect(() => {
  refreshRates();
}, [refreshRates]);

const rates = exchangeRates?.rates ?? null;
```

Replace the price display (line 40):
```
{(product.price / 100).toFixed(2)}
```
with:
```
{formatPrice(product.price, rates, userCurrency)}
```

Remove the `€` prefix since `formatPrice` includes it.

**Step 2: Update ProductDetail.tsx**

Same pattern. Add imports:
```typescript
import { useQuery, useAction } from "convex/react";
import { useEffect, useMemo } from "react";
import { detectUserCurrency, formatPrice } from "../lib/currencyDisplay";
```

Merge with existing imports (already has `useState` from react, `useQuery` from convex). Add inside component:
```typescript
const exchangeRates = useQuery(api.exchangeRates.getRates);
const refreshRates = useAction(api.exchangeRates.fetchAndCache);
const userCurrency = useMemo(() => detectUserCurrency(), []);

useEffect(() => {
  refreshRates();
}, [refreshRates]);

const rates = exchangeRates?.rates ?? null;
```

Replace line 61:
```
€{(product.price / 100).toFixed(2)}
```
with:
```
{formatPrice(product.price, rates, userCurrency)}
```

**Step 3: Update Cart.tsx**

Same pattern. Add imports and hooks. Replace line 47:
```
€{(product.price / 100).toFixed(2)} each
```
with:
```
{formatPrice(product.price, rates, userCurrency)} each
```

Replace line 79:
```
Subtotal: €{(subtotal / 100).toFixed(2)}
```
with:
```
Subtotal: {formatPrice(subtotal, rates, userCurrency)}
```

**Step 4: Verify build**

Run: `cd D:/innerdistrict && npx vite build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/pages/Catalog.tsx src/pages/ProductDetail.tsx src/pages/Cart.tsx
git commit -m "feat: show local currency approximation on catalog, product, and cart pages"
```

---

### Task 6: Admin product form — digital goods fields

**Files:**
- Modify: `src/pages/Admin.tsx`

**Step 1: Extend ProductForm interface and emptyForm**

Update the `ProductForm` interface (line 6-13):
```typescript
interface ProductForm {
  name: string;
  description: string;
  price: string;
  stripePriceId: string;
  category: string;
  stock: string;
  productType: "physical" | "digital";
  downloadUrl: string;
  licenseKey: string;
}

const emptyForm: ProductForm = {
  name: "",
  description: "",
  price: "",
  stripePriceId: "",
  category: "",
  stock: "",
  productType: "physical",
  downloadUrl: "",
  licenseKey: "",
};
```

**Step 2: Update `startEdit` to populate new fields**

In `startEdit` function (line 74-86), add to the form object:
```typescript
productType: (p.productType as "physical" | "digital") ?? "physical",
downloadUrl: p.downloadUrl ?? "",
licenseKey: p.licenseKey ?? "",
```

**Step 3: Update `handleSubmit` to send new fields**

In `handleSubmit`, for both `createProduct` and `updateProduct` calls, add:
```typescript
productType: form.productType,
downloadUrl: form.productType === "digital" && form.downloadUrl ? form.downloadUrl : undefined,
licenseKey: form.productType === "digital" && form.licenseKey ? form.licenseKey : undefined,
```

**Step 4: Add form fields to the JSX**

After the Stock input (line 186), add:

```tsx
<div className="admin__form-row">
  <label className="admin__label">Product Type</label>
  <div className="admin__radio-group">
    <label>
      <input
        type="radio"
        name="productType"
        value="physical"
        checked={form.productType === "physical"}
        onChange={() => setForm((p) => ({ ...p, productType: "physical" }))}
      />
      {" "}Physical
    </label>
    <label>
      <input
        type="radio"
        name="productType"
        value="digital"
        checked={form.productType === "digital"}
        onChange={() => setForm((p) => ({ ...p, productType: "digital" }))}
      />
      {" "}Digital
    </label>
  </div>
</div>

{form.productType === "digital" && (
  <>
    <input
      placeholder="Download URL (optional)"
      value={form.downloadUrl}
      onChange={(e) => setForm((p) => ({ ...p, downloadUrl: e.target.value }))}
    />
    <input
      placeholder="License Key (optional)"
      value={form.licenseKey}
      onChange={(e) => setForm((p) => ({ ...p, licenseKey: e.target.value }))}
    />
  </>
)}
```

**Step 5: Add Type column to products table**

In the table header (line 254-262), add after `<th>Stock</th>`:
```tsx
<th>Type</th>
```

In the table body rows, add after the stock `<td>`:
```tsx
<td>
  <span className={`admin__type-badge admin__type-badge--${(p.productType ?? "physical")}`}>
    {(p.productType ?? "physical")}
  </span>
</td>
```

**Step 6: Verify build**

Run: `cd D:/innerdistrict && npx vite build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add src/pages/Admin.tsx
git commit -m "feat: add product type selector and digital goods fields to admin form"
```

---

### Task 7: Backend — admin CRUD and shipping logic for digital goods

**Files:**
- Modify: `convex/admin.ts`
- Modify: `convex/euConfig.ts`
- Modify: `src/lib/euConfig.ts`

**Step 1: Update admin.ts createProduct and updateProduct**

In `createProduct` args (line 45-55), add after `stock: v.number()`:
```typescript
productType: v.optional(v.union(v.literal("physical"), v.literal("digital"))),
downloadUrl: v.optional(v.string()),
licenseKey: v.optional(v.string()),
```

In `updateProduct` args (line 66-78), add after `isActive: v.optional(v.boolean())`:
```typescript
productType: v.optional(v.union(v.literal("physical"), v.literal("digital"))),
downloadUrl: v.optional(v.string()),
licenseKey: v.optional(v.string()),
```

No handler changes needed — the existing spread pattern (`{ adminSecret: _, ...product }` and `Object.fromEntries`) will handle these fields automatically.

**Step 2: Update euConfig.ts (both server and client) — add hasPhysicalItems param**

In `convex/euConfig.ts`, update `getShippingRate`:
```typescript
export function getShippingRate(countryCode: string, hasPhysicalItems = true): number {
  if (!hasPhysicalItems) return 0;
  const country = EU_COUNTRIES[countryCode];
  if (!country) return 0;
  return SHIPPING_RATES[country.zone];
}
```

In `src/lib/euConfig.ts`, apply the same change:
```typescript
export function getShippingRate(countryCode: string, hasPhysicalItems = true): number {
  if (!hasPhysicalItems) return 0;
  const country = EU_COUNTRIES[countryCode];
  if (!country) return 0;
  return SHIPPING_RATES[country.zone];
}
```

**Step 3: Verify build**

Run: `cd D:/innerdistrict && npx vite build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add convex/admin.ts convex/euConfig.ts src/lib/euConfig.ts
git commit -m "feat: support digital goods in admin CRUD and conditional shipping"
```

---

### Task 8: Checkout flow — conditional shipping for digital goods

**Files:**
- Modify: `convex/stripe.ts`
- Modify: `convex/demoOrders.ts`
- Modify: `convex/stripeHelpers.ts`
- Modify: `src/pages/Checkout.tsx`

**Step 1: Update stripe.ts — include productType in order items and conditional shipping**

In `convex/stripe.ts`, after the `validatedItems` map (around line 52), add `productType` to the returned object:
```typescript
return {
  _id: product._id,
  name: product.name,
  price: product.price,
  stripePriceId: product.stripePriceId,
  quantity: item.quantity,
  productType: (product.productType ?? "physical") as "physical" | "digital",
  downloadUrl: product.downloadUrl,
  licenseKey: product.licenseKey,
};
```

After the `validatedItems` block, determine if cart has physical items:
```typescript
const hasPhysicalItems = validatedItems.some((p) => (p.productType ?? "physical") === "physical");
```

Update the shipping rate call:
```typescript
const shippingAmount = getShippingRate(countryCode, hasPhysicalItems);
```

Update the `createPendingOrder` items mapping to include digital fields:
```typescript
items: validatedItems.map((p) => ({
  productId: p._id,
  name: p.name,
  price: p.price,
  quantity: p.quantity,
  productType: p.productType,
  downloadUrl: p.downloadUrl,
  licenseKey: p.licenseKey,
})),
```

Update the Stripe shipping display name to handle digital-only:
```typescript
shipping_options: hasPhysicalItems
  ? [
      {
        shipping_rate_data: {
          type: "fixed_amount" as const,
          fixed_amount: { amount: shippingAmount, currency: "eur" },
          display_name: countryCode === "DE" ? "Versand (Deutschland)" : "Versand (EU)",
        },
      },
    ]
  : [
      {
        shipping_rate_data: {
          type: "fixed_amount" as const,
          fixed_amount: { amount: 0, currency: "eur" },
          display_name: "Digital delivery (no shipping)",
        },
      },
    ],
```

**Step 2: Update stripeHelpers.ts — accept new fields in createPendingOrder**

In `convex/stripeHelpers.ts`, update the `createPendingOrder` args items object to accept the new fields:
```typescript
items: v.array(
  v.object({
    productId: v.id("products"),
    name: v.string(),
    price: v.number(),
    quantity: v.number(),
    productType: v.optional(v.union(v.literal("physical"), v.literal("digital"))),
    downloadUrl: v.optional(v.string()),
    licenseKey: v.optional(v.string()),
  }),
),
```

No handler change needed — it already spreads `args.items` into the order.

**Step 3: Update demoOrders.ts — include productType and conditional shipping**

In `convex/demoOrders.ts`, update the `orderItems.push` block:
```typescript
orderItems.push({
  productId: item.productId,
  name: product.name,
  price: product.price,
  quantity: item.quantity,
  productType: (product.productType ?? "physical") as "physical" | "digital",
  downloadUrl: product.downloadUrl,
  licenseKey: product.licenseKey,
});
```

After the orderItems loop, add:
```typescript
const hasPhysicalItems = orderItems.some((i) => (i.productType ?? "physical") === "physical");
```

Update shipping call:
```typescript
const shipping = getShippingRate(countryCode, hasPhysicalItems);
```

**Step 4: Update Checkout.tsx — conditional shipping display**

In `src/pages/Checkout.tsx`, after the `cartWithProducts` array is computed, add:
```typescript
const hasPhysicalItems = cartWithProducts.some(
  (i) => ((i.product as any).productType ?? "physical") === "physical"
);
```

Update shipping calculation (line 59):
```typescript
const shipping = getShippingRate(form.country, hasPhysicalItems);
```

**Step 5: Verify build**

Run: `cd D:/innerdistrict && npx vite build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add convex/stripe.ts convex/stripeHelpers.ts convex/demoOrders.ts src/pages/Checkout.tsx
git commit -m "feat: conditional shipping for digital goods in checkout flow"
```

---

### Task 9: Success page — show digital delivery info

**Files:**
- Modify: `src/pages/Success.tsx`

**Step 1: Add digital delivery section to Success page**

After the items list `<ul>` (around line 47), add:

```tsx
{order.items.some((item: any) => (item.productType ?? "physical") === "digital") && (
  <div className="status-page__digital">
    <h2 className="status-page__subtitle">Digital Downloads</h2>
    {order.items
      .filter((item: any) => (item.productType ?? "physical") === "digital")
      .map((item: any, i: number) => (
        <div key={i} className="status-page__digital-item">
          <strong>{item.name}</strong>
          {item.downloadUrl && (
            <p>
              <a href={item.downloadUrl} target="_blank" rel="noopener noreferrer" className="status-page__download-link">
                Download
              </a>
            </p>
          )}
          {item.licenseKey && (
            <p className="status-page__license">
              License Key: <code>{item.licenseKey}</code>
            </p>
          )}
        </div>
      ))}
  </div>
)}
```

**Step 2: Update orders.ts query to return digital fields**

In `convex/orders.ts`, the `getBySessionId` query returns `order.items` directly, so the digital fields (`productType`, `downloadUrl`, `licenseKey`) will be included automatically since they're stored in the order document. No change needed here.

**Step 3: Verify build**

Run: `cd D:/innerdistrict && npx vite build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/pages/Success.tsx
git commit -m "feat: show download links and license keys on success page"
```

---

### Task 10: Admin order cards — show digital delivery info

**Files:**
- Modify: `src/pages/Admin.tsx`

**Step 1: Add digital info to order cards**

In `Admin.tsx`, in the order card items display (around line 343-348), update the item rendering to show a badge:

```tsx
{order.items.map((item: any, idx: number) => (
  <div key={idx} className="order-card__item">
    <span>
      {item.name} &times; {item.quantity}
      {(item.productType ?? "physical") === "digital" && (
        <span className="admin__type-badge admin__type-badge--digital" style={{ marginLeft: "0.5rem", fontSize: "0.6rem" }}>digital</span>
      )}
    </span>
    <span>€{((item.price * item.quantity) / 100).toFixed(2)}</span>
  </div>
))}
```

After the "Ship To" section in the order card (around line 376), add a digital delivery section:

```tsx
{order.items.some((item: any) => (item.productType ?? "physical") === "digital") && (
  <div className="order-card__col">
    <div className="order-card__label">Digital Delivery</div>
    {order.items
      .filter((item: any) => (item.productType ?? "physical") === "digital")
      .map((item: any, idx: number) => (
        <div key={idx} style={{ marginBottom: "0.5rem" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: "bold" }}>{item.name}</div>
          {item.downloadUrl && (
            <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
              URL: <a href={item.downloadUrl} target="_blank" rel="noopener noreferrer">{item.downloadUrl}</a>
            </div>
          )}
          {item.licenseKey && (
            <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
              Key: <code>{item.licenseKey}</code>
            </div>
          )}
        </div>
      ))}
  </div>
)}
```

**Step 2: Verify build**

Run: `cd D:/innerdistrict && npx vite build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/pages/Admin.tsx
git commit -m "feat: show digital delivery info in admin order cards"
```

---

### Task 11: Final verification and deploy

**Step 1: Full build check**

Run: `cd D:/innerdistrict && npx vite build`
Expected: Build succeeds with no errors or warnings

**Step 2: Push Convex schema**

Run: `cd D:/innerdistrict && npx convex push` (or however Convex is deployed — check package.json scripts)
Expected: Schema migration succeeds. Existing products remain valid because new fields are optional.

**Step 3: Manual smoke test checklist**
- [ ] Catalog shows `€` prices (not `$`)
- [ ] Product detail shows `€` prices
- [ ] Cart shows `€` prices
- [ ] If browser locale is non-EUR (e.g. en-US), local currency approximation appears
- [ ] Admin: can create a physical product
- [ ] Admin: can create a digital product with download URL + license key
- [ ] Admin: product table shows Type column
- [ ] Checkout: digital-only cart shows €0.00 shipping
- [ ] Checkout: mixed cart shows normal shipping
- [ ] Success page: digital items show download links and license keys
- [ ] Admin order cards: digital items show delivery info
