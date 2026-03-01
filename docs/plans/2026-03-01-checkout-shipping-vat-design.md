# Checkout with Shipping & VAT — Design

## Context

Inner District is an EU B2C e-commerce store. Currently uses a demo checkout with no shipping costs and no tax display. Real Stripe checkout is wired but inactive. Need to add EU shipping rates, VAT display, and support both demo and live Stripe modes.

## Decisions

- **Shipping**: Flat rate — €4.99 DE, €8.99 rest of EU
- **VAT**: Prices are brutto (VAT-inclusive). Display extracted VAT at checkout using a manual country→rate map
- **Payment**: Dual-mode — demo (default) and live Stripe, controlled by `VITE_CHECKOUT_MODE` env var
- **Country input**: Dropdown of EU countries (replaces free-text)

## Design

### Shared config (`convex/shippingConfig.ts`)

EU country list with VAT rates and shipping zones:

```ts
export const EU_COUNTRIES = {
  DE: { name: "Deutschland", vatRate: 19, shippingZone: "domestic" },
  AT: { name: "Österreich", vatRate: 20, shippingZone: "eu" },
  NL: { name: "Niederlande", vatRate: 21, shippingZone: "eu" },
  // ... all EU countries
};

export const SHIPPING_RATES = {
  domestic: 499,  // €4.99 in cents
  eu: 899,        // €8.99 in cents
};
```

Shared by both demo and Stripe flows. Single source of truth.

### Schema changes (`convex/schema.ts`)

Add to orders table:
- `vatRate`: number (e.g. 19)
- `vatAmount`: number (in cents, extracted from gross total)

### Checkout page changes

1. Replace country text input with `<select>` dropdown of EU countries
2. On country change, recalculate shipping + VAT display
3. Show order summary:
   - Subtotal (product total)
   - Shipping (based on country zone)
   - Total (subtotal + shipping)
   - "inkl. X% MwSt: €Y.YY" (extracted from total)
4. Read `VITE_CHECKOUT_MODE` to determine flow:
   - `demo`: call `demoOrders.createDemoOrder` (current behavior + shipping/VAT)
   - `live`: call `stripe.createCheckoutSession` (redirect to Stripe)

### VAT calculation

Extract VAT from gross (VAT-inclusive) price:
```
vatAmount = total * (vatRate / (100 + vatRate))
```

Example: €44.97 total at 19% → €44.97 × (19/119) = €7.18 MwSt

### Demo flow changes (`convex/demoOrders.ts`)

- Accept `country` parameter
- Look up shipping rate from config
- Calculate and store `vatRate` + `vatAmount`
- Store actual shipping cost (currently hardcoded 0)

### Stripe flow changes (`convex/stripe.ts`)

- Accept `country` parameter
- Use config shipping rate instead of env var
- Store `vatRate` + `vatAmount` on order
- Pass shipping as Stripe shipping option with correct amount

### Admin / order display

Order cards already show total and shipping. Add VAT display line to order details.
