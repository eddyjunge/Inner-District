import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

function assertAdmin(adminSecret: string) {
  const expected = process.env.ADMIN_SECRET;
  if (!expected || adminSecret !== expected) {
    throw new Error("Not authorized");
  }
}

export const listProducts = query({
  args: { adminSecret: v.string() },
  handler: async (ctx, args) => {
    assertAdmin(args.adminSecret);
    return await ctx.db.query("products").collect();
  },
});

export const listOrders = query({
  args: {
    adminSecret: v.string(),
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
    assertAdmin(args.adminSecret);
    if (args.status) {
      return await ctx.db
        .query("orders")
        .withIndex("by_status", (idx) => idx.eq("status", args.status!))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("orders").order("desc").collect();
  },
});

export const createProduct = mutation({
  args: {
    adminSecret: v.string(),
    name: v.string(),
    description: v.string(),
    price: v.number(),
    stripePriceId: v.string(),
    images: v.array(v.string()),
    category: v.string(),
    stock: v.number(),
    productType: v.optional(v.union(v.literal("physical"), v.literal("digital"))),
    downloadFileId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    assertAdmin(args.adminSecret);
    const { adminSecret: _, ...rest } = args;
    return await ctx.db.insert("products", {
      ...rest,
      isActive: true,
    });
  },
});

export const updateProduct = mutation({
  args: {
    adminSecret: v.string(),
    id: v.id("products"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    stripePriceId: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
    stock: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    productType: v.optional(v.union(v.literal("physical"), v.literal("digital"))),
    downloadFileId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    assertAdmin(args.adminSecret);
    const { id, adminSecret: _, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    await ctx.db.patch(id, filtered);
  },
});

export const deleteProduct = mutation({
  args: {
    adminSecret: v.string(),
    id: v.id("products"),
  },
  handler: async (ctx, args) => {
    assertAdmin(args.adminSecret);
    await ctx.db.delete(args.id);
  },
});

export const updateOrderStatus = mutation({
  args: {
    adminSecret: v.string(),
    id: v.id("orders"),
    status: v.union(
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled"),
    ),
  },
  handler: async (ctx, args) => {
    assertAdmin(args.adminSecret);
    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const listAdminEmails = query({
  args: { adminSecret: v.string() },
  handler: async (ctx, args) => {
    assertAdmin(args.adminSecret);
    const envAdmins = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    const dbAdmins = await ctx.db.query("adminEmails").collect();
    return {
      envAdmins,
      dbAdmins: dbAdmins.map((a) => ({ _id: a._id, email: a.email, addedAt: a.addedAt })),
    };
  },
});

export const addAdminEmail = mutation({
  args: { adminSecret: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    assertAdmin(args.adminSecret);
    const email = args.email.trim().toLowerCase();
    if (!email) throw new Error("Email is required");
    // Check if already exists in DB
    const existing = await ctx.db
      .query("adminEmails")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existing) throw new Error("Email already an admin");
    return await ctx.db.insert("adminEmails", {
      email,
      addedAt: Date.now(),
    });
  },
});

export const removeAdminEmail = mutation({
  args: { adminSecret: v.string(), id: v.id("adminEmails") },
  handler: async (ctx, args) => {
    assertAdmin(args.adminSecret);
    await ctx.db.delete(args.id);
  },
});
