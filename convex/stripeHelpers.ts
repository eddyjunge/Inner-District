import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

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

export const createPendingOrder = internalMutation({
  args: {
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
    return await ctx.db.insert("orders", {
      userId: args.userId,
      guestEmail: args.guestEmail,
      stripeSessionId: "",
      items: args.items,
      subtotal: args.subtotal,
      shipping: args.shipping,
      total: args.total,
      shippingAddress: args.shippingAddress,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const attachStripeSession = internalMutation({
  args: {
    orderId: v.id("orders"),
    stripeSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      stripeSessionId: args.stripeSessionId,
    });
  },
});

export const fulfillOrder = internalMutation({
  args: {
    stripeSessionId: v.string(),
    stripePaymentIntentId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the pending order by session ID
    const order = await ctx.db
      .query("orders")
      .withIndex("by_stripeSessionId", (q) =>
        q.eq("stripeSessionId", args.stripeSessionId),
      )
      .first();
    if (!order) {
      throw new Error(`No order found for session ${args.stripeSessionId}`);
    }

    // Idempotency: if already paid, skip
    if (order.status !== "pending") return order._id;

    // Decrement stock for each item
    for (const item of order.items) {
      const product = await ctx.db.get(item.productId);
      if (product) {
        await ctx.db.patch(item.productId, {
          stock: Math.max(0, product.stock - item.quantity),
        });
      }
    }

    // Mark order as paid
    await ctx.db.patch(order._id, {
      status: "paid",
      stripePaymentIntentId: args.stripePaymentIntentId,
    });

    return order._id;
  },
});
