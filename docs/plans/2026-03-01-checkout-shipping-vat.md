# Checkout with Shipping & VAT Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add EU shipping rates, VAT display, and dual demo/live Stripe checkout mode.

**Architecture:** Shared config file defines EU countries, VAT rates, and shipping zones. Both demo and Stripe flows read from it. Checkout page shows country dropdown, calculates shipping + VAT live. Mode toggle via `VITE_CHECKOUT_MODE` env var.

**Tech Stack:** Convex (backend), React + TypeScript (frontend), Stripe SDK (payments), Vite (build)

---

### Task 1: Create EU shipping/VAT config

**Files:**
- Create: `convex/euConfig.ts`

**Step 1: Create the config file**

```ts
// EU country codes, names, VAT rates, and shipping zones
// Prices are VAT-inclusive (brutto). VAT is extracted at checkout for display.

export const EU_COUNTRIES: Record<string, { name: string; vatRate: number; zone: "domestic" | "eu" }> = {
  DE: { name: "Germany", vatRate: 19, zone: "domestic" },
  AT: { name: "Austria", vatRate: 20, zone: "eu" },
  BE: { name: "Belgium", vatRate: 21, zone: "eu" },
  BG: { name: "Bulgaria", vatRate: 20, zone: "eu" },
  HR: { name: "Croatia", vatRate: 25, zone: "eu" },
  CY: { name: "Cyprus", vatRate: 19, zone: "eu" },
  CZ: { name: "Czech Republic", vatRate: 21, zone: "eu" },
  DK: { name: "Denmark", vatRate: 25, zone: "eu" },
  EE: { name: "Estonia", vatRate: 22, zone: "eu" },
  FI: { name: "Finland", vatRate: 25.5, zone: "eu" },
  FR: { name: "France", vatRate: 20, zone: "eu" },
  GR: { name: "Greece", vatRate: 24, zone: "eu" },
  HU: { name: "Hungary", vatRate: 27, zone: "eu" },
  IE: { name: "Ireland", vatRate: 23, zone: "eu" },
  IT: { name: "Italy", vatRate: 22, zone: "eu" },
  LV: { name: "Latvia", vatRate: 21, zone: "eu" },
  LT: { name: "Lithuania", vatRate: 21, zone: "eu" },
  LU: { name: "Luxembourg", vatRate: 17, zone: "eu" },
  MT: { name: "Malta", vatRate: 18, zone: "eu" },
  NL: { name: "Netherlands", vatRate: 21, zone: "eu" },
  PL: { name: "Poland", vatRate: 23, zone: "eu" },
  PT: { name: "Portugal", vatRate: 23, zone: "eu" },
  RO: { name: "Romania", vatRate: 19, zone: "eu" },
  SK: { name: "Slovakia", vatRate: 20, zone: "eu" },
  SI: { name: "Slovenia", vatRate: 22, zone: "eu" },
  ES: { name: "Spain", vatRate: 21, zone: "eu" },
  SE: { name: "Sweden", vatRate: 25, zone: "eu" },
};

export const SHIPPING_RATES = {
  domestic: 499,  // €4.99 in cents
  eu: 899,        // €8.99 in cents
} as const;

/** Get shipping cost in cents for a country code */
export function getShippingRate(countryCode: string): number {
  const country = EU_COUNTRIES[countryCode];
  if (!country) throw new Error(`Unsupported country: ${countryCode}`);
  return SHIPPING_RATES[country.zone];
}

/** Get VAT rate for a country code */
export function getVatRate(countryCode: string): number {
  const country = EU_COUNTRIES[countryCode];
  if (!country) throw new Error(`Unsupported country: ${countryCode}`);
  return country.vatRate;
}

/** Extract VAT amount from a VAT-inclusive (brutto) total. Returns cents. */
export function extractVat(grossCents: number, vatRate: number): number {
  return Math.round(grossCents * (vatRate / (100 + vatRate)));
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```
git add convex/euConfig.ts
git commit -m "feat: add EU country/VAT/shipping config"
```

---

### Task 2: Update schema with VAT fields

**Files:**
- Modify: `convex/schema.ts`

**Step 1: Add vatRate and vatAmount to orders table**

In `convex/schema.ts`, add two optional fields to the orders table (optional for backward compatibility with existing orders):

```ts
vatRate: v.optional(v.number()),
vatAmount: v.optional(v.number()),
```

Add these after the `total` field, before `shippingAddress`.

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```
git add convex/schema.ts
git commit -m "feat: add vatRate and vatAmount to orders schema"
```

---

### Task 3: Update demo checkout with shipping + VAT

**Files:**
- Modify: `convex/demoOrders.ts`

**Step 1: Update createDemoOrder to use EU config**

Add `country` to the args (it's already in shippingAddress.country, but we read it from there). Import the config and calculate shipping + VAT:

Replace the full handler in `convex/demoOrders.ts`:

```ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getShippingRate, getVatRate, extractVat } from "./euConfig";

export const createDemoOrder = mutation({
  args: {
    email: v.string(),
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
  },
  handler: async (ctx, args) => {
    const orderItems = [];
    let subtotal = 0;

    for (const item of args.items) {
      const product = await ctx.db.get(item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);
      if (!product.isActive) throw new Error(`${product.name} is no longer available`);
      if (product.stock < item.quantity) {
        throw new Error(`Only ${product.stock} of ${product.name} available`);
      }

      orderItems.push({
        productId: item.productId,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
      });
      subtotal += product.price * item.quantity;
    }

    // Decrement stock
    for (const item of args.items) {
      const product = await ctx.db.get(item.productId);
      if (product) {
        await ctx.db.patch(item.productId, {
          stock: product.stock - item.quantity,
        });
      }
    }

    const countryCode = args.shippingAddress.country;
    const shipping = getShippingRate(countryCode);
    const vatRate = getVatRate(countryCode);
    const total = subtotal + shipping;
    const vatAmount = extractVat(total, vatRate);

    const demoSessionId = `demo_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const orderId = await ctx.db.insert("orders", {
      email: args.email,
      stripeSessionId: demoSessionId,
      items: orderItems,
      subtotal,
      shipping,
      total,
      vatRate,
      vatAmount,
      shippingAddress: args.shippingAddress,
      status: "paid",
      createdAt: Date.now(),
    });

    return { orderId, sessionId: demoSessionId };
  },
});
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```
git add convex/demoOrders.ts
git commit -m "feat: add shipping and VAT to demo checkout"
```

---

### Task 4: Update Stripe checkout with shipping + VAT

**Files:**
- Modify: `convex/stripe.ts`
- Modify: `convex/stripeHelpers.ts`

**Step 1: Update stripeHelpers.createPendingOrder to accept VAT fields**

In `convex/stripeHelpers.ts`, add `vatRate: v.number()` and `vatAmount: v.number()` to the args of `createPendingOrder`, and include them in the `ctx.db.insert` call.

**Step 2: Update stripe.ts to use EU config**

In `convex/stripe.ts`, replace the `shippingAmount` line and totals calculation:

```ts
import { getShippingRate, getVatRate, extractVat } from "./euConfig";

// Replace this line:
//   const shippingAmount = parseInt(process.env.SHIPPING_RATE_CENTS ?? "500");
// With:
const countryCode = args.shippingAddress.country;
const shippingAmount = getShippingRate(countryCode);
const vatRate = getVatRate(countryCode);
```

After computing `total`, add:
```ts
const vatAmount = extractVat(total, vatRate);
```

Add `vatRate` and `vatAmount` to the `createPendingOrder` call.

Change the Stripe shipping currency from `"usd"` to `"eur"`.

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```
git add convex/stripe.ts convex/stripeHelpers.ts
git commit -m "feat: add shipping and VAT to Stripe checkout"
```

---

### Task 5: Update order query to return VAT fields

**Files:**
- Modify: `convex/orders.ts`

**Step 1: Add vatRate and vatAmount to returned fields**

In `convex/orders.ts`, add to the return object in `getBySessionId`:

```ts
vatRate: order.vatRate,
vatAmount: order.vatAmount,
```

**Step 2: Commit**

```
git add convex/orders.ts
git commit -m "feat: return VAT fields in order query"
```

---

### Task 6: Update Checkout page with country dropdown, shipping, VAT, and mode toggle

**Files:**
- Modify: `src/pages/Checkout.tsx`

**Step 1: Rewrite Checkout.tsx**

Key changes:
1. Import EU config (use a copy of the data for the frontend since Convex server code can't be directly imported — create `src/lib/euConfig.ts` as a lightweight frontend copy with just the country list, rates, and `extractVat`)
2. Replace country text `<input>` with `<select>` dropdown
3. Remove the `state` field (EU addresses use country, not state)
4. Show shipping cost and VAT breakdown in order summary, updating when country changes
5. Add `VITE_CHECKOUT_MODE` check: if `"live"`, call `createCheckoutSession` action and redirect to Stripe URL; if `"demo"` (default), use current demo flow
6. Pass country code (e.g. "DE") as the country value instead of free text

Create `src/lib/euConfig.ts` — a lightweight frontend-only copy:

```ts
export const EU_COUNTRIES: Record<string, { name: string; vatRate: number; zone: "domestic" | "eu" }> = {
  DE: { name: "Germany", vatRate: 19, zone: "domestic" },
  AT: { name: "Austria", vatRate: 20, zone: "eu" },
  BE: { name: "Belgium", vatRate: 21, zone: "eu" },
  BG: { name: "Bulgaria", vatRate: 20, zone: "eu" },
  HR: { name: "Croatia", vatRate: 25, zone: "eu" },
  CY: { name: "Cyprus", vatRate: 19, zone: "eu" },
  CZ: { name: "Czech Republic", vatRate: 21, zone: "eu" },
  DK: { name: "Denmark", vatRate: 25, zone: "eu" },
  EE: { name: "Estonia", vatRate: 22, zone: "eu" },
  FI: { name: "Finland", vatRate: 25.5, zone: "eu" },
  FR: { name: "France", vatRate: 20, zone: "eu" },
  GR: { name: "Greece", vatRate: 24, zone: "eu" },
  HU: { name: "Hungary", vatRate: 27, zone: "eu" },
  IE: { name: "Ireland", vatRate: 23, zone: "eu" },
  IT: { name: "Italy", vatRate: 22, zone: "eu" },
  LV: { name: "Latvia", vatRate: 21, zone: "eu" },
  LT: { name: "Lithuania", vatRate: 21, zone: "eu" },
  LU: { name: "Luxembourg", vatRate: 17, zone: "eu" },
  MT: { name: "Malta", vatRate: 18, zone: "eu" },
  NL: { name: "Netherlands", vatRate: 21, zone: "eu" },
  PL: { name: "Poland", vatRate: 23, zone: "eu" },
  PT: { name: "Portugal", vatRate: 23, zone: "eu" },
  RO: { name: "Romania", vatRate: 19, zone: "eu" },
  SK: { name: "Slovakia", vatRate: 20, zone: "eu" },
  SI: { name: "Slovenia", vatRate: 22, zone: "eu" },
  ES: { name: "Spain", vatRate: 21, zone: "eu" },
  SE: { name: "Sweden", vatRate: 25, zone: "eu" },
};

export const SHIPPING_RATES = {
  domestic: 499,
  eu: 899,
} as const;

export function getShippingRate(countryCode: string): number {
  const country = EU_COUNTRIES[countryCode];
  if (!country) return 0;
  return SHIPPING_RATES[country.zone];
}

export function getVatRate(countryCode: string): number {
  const country = EU_COUNTRIES[countryCode];
  if (!country) return 0;
  return country.vatRate;
}

export function extractVat(grossCents: number, vatRate: number): number {
  return Math.round(grossCents * (vatRate / (100 + vatRate)));
}
```

Checkout page order summary should render:

```
Subtotal:               €XX.XX
Shipping (DE):           €4.99
─────────────────────────────
Total:                  €XX.XX
inkl. 19% MwSt:          €X.XX
```

The form `country` field default should be `"DE"`.

For live mode, import `useAction` from `"convex/react"` and `api` to call `stripe.createCheckoutSession`. On submit, call the action and `window.location.href = url` to redirect to Stripe.

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```
git add src/lib/euConfig.ts src/pages/Checkout.tsx
git commit -m "feat: checkout page with country dropdown, shipping, VAT, and mode toggle"
```

---

### Task 7: Update Success page to show shipping + VAT

**Files:**
- Modify: `src/pages/Success.tsx`

**Step 1: Add shipping and VAT display to Success page**

After the items list, show:
- Shipping: €X.XX
- Total: €X.XX
- inkl. X% MwSt: €X.XX

The `order` object from `getBySessionId` now includes `shipping`, `vatRate`, and `vatAmount`.

**Step 2: Commit**

```
git add src/pages/Success.tsx
git commit -m "feat: show shipping and VAT on success page"
```

---

### Task 8: Update Admin order cards to show VAT

**Files:**
- Modify: `src/pages/Admin.tsx`

**Step 1: Add VAT line to order cards**

In the order card items column, after the total line, add a VAT info line if `order.vatRate` exists:

```tsx
{order.vatRate && (
  <div className="order-card__item" style={{ color: "var(--muted)" }}>
    <span>inkl. {order.vatRate}% MwSt</span>
    <span>€{((order.vatAmount ?? 0) / 100).toFixed(2)}</span>
  </div>
)}
```

**Step 2: Commit**

```
git add src/pages/Admin.tsx
git commit -m "feat: show VAT in admin order cards"
```

---

### Task 9: Add checkout styles for new elements

**Files:**
- Modify: `src/styles.css`

**Step 1: Add styles for the new checkout elements**

Add after the existing checkout styles:

```css
.checkout__shipping {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  padding: 0.35rem 0;
}

.checkout__vat {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--muted);
  padding: 0.35rem 0;
  margin-top: 0.25rem;
}

select {
  font-family: var(--font-body);
  font-size: 0.85rem;
  padding: 0.75rem;
  border: var(--border);
  background: transparent;
  color: var(--fg);
  width: 100%;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%230A0A0A' stroke-width='2' fill='none'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
}

select:focus {
  outline: none;
  border-color: var(--accent);
}
```

Also add to the 480px media query:
```css
select {
  font-size: 16px;
}
```

**Step 2: Commit**

```
git add src/styles.css
git commit -m "feat: add checkout shipping/VAT and select styles"
```

---

### Task 10: Add VITE_CHECKOUT_MODE to environment

**Files:**
- Modify: `.env.local` (or create if not exists)

**Step 1: Set default mode to demo**

```
VITE_CHECKOUT_MODE=demo
```

**Step 2: Verify the app builds**

Run: `npx vite build`
Expected: Build succeeds with no errors

**Step 3: Final commit**

```
git add .env.local
git commit -m "feat: add VITE_CHECKOUT_MODE env var (default: demo)"
```

---

### Task 11: Smoke test the full flow

**Step 1: Start the dev server**

Run: `npx vite dev`

**Step 2: Manual test checklist**

- [ ] Catalog loads, products display
- [ ] Add item to cart, go to checkout
- [ ] Country dropdown shows all EU countries, defaults to DE
- [ ] Changing country updates shipping rate (€4.99 DE, €8.99 others)
- [ ] VAT line updates with correct rate per country
- [ ] Place demo order — redirects to success page
- [ ] Success page shows shipping + VAT breakdown
- [ ] Admin order cards show VAT info
- [ ] TypeScript compiles clean: `npx tsc --noEmit`
