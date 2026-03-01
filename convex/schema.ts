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
    productType: v.optional(v.union(v.literal("physical"), v.literal("digital"))),
    downloadFileId: v.optional(v.id("_storage")),
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
        downloadFileId: v.optional(v.id("_storage")),
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
