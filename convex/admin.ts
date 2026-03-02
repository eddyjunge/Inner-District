import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

async function assertAdmin(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.email) throw new Error("Not authenticated");

  const email = (identity.email as string).toLowerCase();

  const envAdmins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);

  if (envAdmins.includes(email)) return;

  const dbAdmin = await ctx.db
    .query("adminEmails")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .first();

  if (!dbAdmin) throw new Error("Not authorized");
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
    productType: v.optional(v.union(v.literal("physical"), v.literal("digital"))),
    downloadFileId: v.optional(v.id("_storage")),
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

export const deleteProduct = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    await ctx.db.delete(args.id);
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

export const listAdminEmails = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx);
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
  args: { email: v.string() },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const email = args.email.trim().toLowerCase();
    if (!email) throw new Error("Email is required");
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
  args: { id: v.id("adminEmails") },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});
