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
    const order = await ctx.db
      .query("orders")
      .withIndex("by_stripeSessionId", (q) =>
        q.eq("stripeSessionId", args.stripeSessionId),
      )
      .first();
    if (!order) return null;
    // Return limited fields only — session ID is visible in URLs
    return {
      _id: order._id,
      items: order.items,
      subtotal: order.subtotal,
      shipping: order.shipping,
      total: order.total,
      status: order.status,
      createdAt: order.createdAt,
    };
  },
});
