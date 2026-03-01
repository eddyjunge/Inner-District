import { query, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getBySessionId = query({
  args: { stripeSessionId: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_stripeSessionId", (q) =>
        q.eq("stripeSessionId", args.stripeSessionId),
      )
      .first();
    if (!order) return null;
    // Return limited fields — session ID is visible in URLs
    return {
      _id: order._id,
      items: order.items,
      subtotal: order.subtotal,
      shipping: order.shipping,
      total: order.total,
      vatRate: order.vatRate,
      vatAmount: order.vatAmount,
      status: order.status,
      createdAt: order.createdAt,
    };
  },
});

export const getOrderForDownload = internalQuery({
  args: {
    orderId: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const order = await ctx.db.get(args.orderId as any);
      if (!order || order.email !== args.email) return null;
      return order;
    } catch {
      return null;
    }
  },
});
