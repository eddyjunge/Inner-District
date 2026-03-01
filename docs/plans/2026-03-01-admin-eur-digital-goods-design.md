# Admin Dashboard: EUR Currency, Per-Region Display & Digital Goods

## Overview

Three changes to the admin dashboard and storefront:

1. **Fix currency symbols** — replace remaining `$` with `€` across all pages
2. **Per-region currency display** — show approximate local currency alongside EUR using free exchange rate API
3. **Digital goods support** — sell downloadable files and license keys alongside physical products

## Part 1: Currency Fix ($ → €)

Replace `$` with `€` in:

- `src/pages/Admin.tsx` line 279 (product table) + line 183 (placeholder text)
- `src/pages/Cart.tsx` lines 47, 79
- `src/pages/Catalog.tsx` line 40
- `src/pages/ProductDetail.tsx` line 61

Checkout, Success, and admin order cards already use `€`.

## Part 2: Per-Region Currency Display

**API:** frankfurter.app (free, no API key, ECB-backed daily rates)

**Architecture:**

- New Convex table `exchangeRates` with fields: `rates` (Record<string, number>), `baseCurrency` ("EUR"), `updatedAt` (number)
- Convex action `fetchExchangeRates` calls `https://api.frankfurter.app/latest?from=EUR`, caches result in DB
- Query `getExchangeRates` serves cached rates; fetches fresh if older than 1 hour
- Client detects locale via `navigator.language`, maps to currency code
- Display format: `€30.00 (~139 PLN)` — small secondary text
- Fallback: show EUR only if no matching currency or rates unavailable
- Stripe charges remain in EUR — this is display-only

**Locale → Currency mapping examples:**
- `pl-PL` → PLN, `sv-SE` → SEK, `da-DK` → DKK, `en-GB` → GBP, `en-US` → USD, `cs-CZ` → CZK, `hu-HU` → HUF, `ro-RO` → RON

## Part 3: Digital Goods

### Schema Changes

**products table** adds:
- `productType`: `"physical" | "digital"` (required, defaults to `"physical"` for existing products)
- `downloadUrl`: optional string (URL to downloadable file)
- `licenseKey`: optional string (code/key for delivery)

**orders.items[]** adds:
- `productType`: `"physical" | "digital"` (snapshot at order time)

### Admin Dashboard

- Product form: add "Product Type" radio/select (Physical / Digital)
- When Digital selected: show `downloadUrl` and `licenseKey` input fields
- Product table: add Type column with badge

### Checkout Flow

- Shipping cost calculation: only applies to physical items
  - All-digital cart → shipping = €0
  - Mixed cart → shipping based on physical items only (same flat rate logic)
- Shipping address always collected (tax compliance)
- `getShippingRate()` and Stripe checkout get `hasPhysicalItems` parameter

### Post-Purchase Delivery

- Success page: show download links and license keys for digital items in the order
- Admin order card: display digital delivery info (download URL, license key)

### Stripe Integration

- Digital products still use Stripe Price IDs (no payment flow change)
- Shipping option set to €0 amount when cart is digital-only

## Files Affected

| File | Changes |
|------|---------|
| `convex/schema.ts` | Add `exchangeRates` table, extend `products` and `orders.items` |
| `convex/admin.ts` | Handle new product fields in CRUD |
| `convex/exchangeRates.ts` | New file: fetch + cache exchange rates |
| `convex/stripe.ts` | Conditional shipping for digital-only carts |
| `convex/stripeHelpers.ts` | Include `productType` in order items |
| `convex/euConfig.ts` | Add `hasPhysicalItems` param to shipping logic |
| `src/pages/Admin.tsx` | Product type selector, digital fields, type column, € fix |
| `src/pages/Cart.tsx` | € fix, local currency display |
| `src/pages/Catalog.tsx` | € fix, local currency display |
| `src/pages/ProductDetail.tsx` | € fix, local currency display |
| `src/pages/Checkout.tsx` | Conditional shipping calculation |
| `src/pages/Success.tsx` | Show download links / license keys |
| `src/lib/currencyDisplay.ts` | New file: locale detection + formatting helper |
