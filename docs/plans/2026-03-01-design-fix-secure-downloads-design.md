# Fix Admin Design + Secure Digital Downloads

## Part 1: Add Missing CSS

All new elements added in the digital goods update have no CSS. Add styles matching the brutalist design system.

Classes to add:
- `.admin__form-row` — flex row for label + content
- `.admin__label` — uppercase monospace label
- `.admin__radio-group` — horizontal radio layout
- `.admin__type-badge` — small pill badge
- `.admin__type-badge--physical` — default color
- `.admin__type-badge--digital` — accent color
- `.status-page__digital` — digital downloads section
- `.status-page__subtitle` — section heading
- `.status-page__download-link` — download button style
- `.status-page__license` — monospace key display

## Part 2: Secure Digital File Upload + Download

### Schema
- Products: `downloadUrl` → `downloadFileId: v.optional(v.id("_storage"))`
- Order items: `downloadUrl` → `downloadFileId: v.optional(v.id("_storage"))`

### Admin Form
- Replace "Download URL" text input with file upload zone
- Reuse existing Convex storage upload pattern (generateUploadUrl → POST → storageId)
- Show file name + remove button after upload

### Secure Download HTTP Endpoint
- New route in `convex/http.ts`: `GET /download`
- Query params: `orderId`, `email`, `itemIndex`
- Verifies: order exists, status is "paid", email matches
- Gets `downloadFileId` from order item
- Redirects to `ctx.storage.getUrl(fileId)` (temporary Convex URL)

### Success Page
- Download button links to `/download?orderId=X&email=Y&itemIndex=N`
- Uses the Convex site URL as base

### Files Affected
- `src/styles.css` — add missing CSS classes
- `convex/schema.ts` — downloadUrl → downloadFileId
- `convex/admin.ts` — accept downloadFileId
- `convex/http.ts` — add /download route
- `convex/stripe.ts` — pass downloadFileId to order items
- `convex/stripeHelpers.ts` — accept downloadFileId in items
- `convex/demoOrders.ts` — pass downloadFileId
- `src/pages/Admin.tsx` — file upload zone for digital goods
- `src/pages/Success.tsx` — secure download links
- `convex/orders.ts` — return downloadFileId + email for success page
