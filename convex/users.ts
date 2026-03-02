import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();

    return {
      email: identity.email ?? "",
      name: identity.name ?? (user as any)?.name ?? "",
      savedAddress: (user as any)?.savedAddress ?? null,
      isAdmin: await isAdmin(ctx, identity.email ?? ""),
    };
  },
});

export const saveAddress = mutation({
  args: {
    address: v.object({
      name: v.string(),
      line1: v.string(),
      line2: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      postalCode: v.string(),
      country: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();

    if (user) {
      await ctx.db.patch(user._id, { savedAddress: args.address } as any);
    }
  },
});

export const myOrders = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) return [];

    return await ctx.db
      .query("orders")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .order("desc")
      .collect();
  },
});

async function isAdmin(ctx: any, email: string): Promise<boolean> {
  if (!email) return false;
  const envAdmins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);
  if (envAdmins.includes(email.toLowerCase())) return true;

  const dbAdmin = await ctx.db
    .query("adminEmails")
    .withIndex("by_email", (q: any) => q.eq("email", email.toLowerCase()))
    .first();
  return !!dbAdmin;
}
