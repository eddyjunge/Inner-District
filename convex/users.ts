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

// Temporary: list all users and auth accounts for debugging
export const listAllAuthData = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const accounts = await ctx.db.query("authAccounts").collect();
    return {
      users: users.map((u) => ({ _id: u._id, email: u.email, name: u.name })),
      accounts: accounts.map((a) => ({
        _id: a._id,
        userId: a.userId,
        provider: a.provider,
        providerAccountId: a.providerAccountId,
      })),
    };
  },
});

// Temporary: delete a user by ID and all auth records
export const deleteUserById = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const userId = args.userId as any;
    const user = await ctx.db.get(userId);
    if (!user) return { deleted: false };
    // Delete auth accounts
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
      .collect();
    for (const account of accounts) {
      await ctx.db.delete(account._id);
    }
    // Delete auth sessions
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();
    for (const session of sessions) {
      const tokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
        .collect();
      for (const token of tokens) {
        await ctx.db.delete(token._id);
      }
      await ctx.db.delete(session._id);
    }
    await ctx.db.delete(userId);
    return { deleted: true };
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
