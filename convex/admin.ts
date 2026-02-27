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
