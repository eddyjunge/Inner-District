import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Look up user by tokenIdentifier first, then fall back to email
    let user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .first();

    if (!user && identity.email) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", identity.email!))
        .first();
    }

    if (!user) return null;

    return {
      email: user.email,
      name: user.name ?? "",
      savedAddress: user.savedAddress ?? null,
      isAdmin: await isAdmin(ctx, user.email),
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
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .first();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, { savedAddress: args.address });
  },
});

export const myOrders = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) return [];

    return await ctx.db
      .query("orders")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .order("desc")
      .collect();
  },
});

export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const email = identity.email ?? "";

    // Check if user already exists by tokenIdentifier
    const existingByToken = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .first();

    if (existingByToken) {
      // Already linked — update email/name if changed
      const updates: Record<string, string> = {};
      if (email && existingByToken.email !== email) updates.email = email;
      if (identity.name && existingByToken.name !== identity.name)
        updates.name = identity.name;
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(existingByToken._id, updates);
      }
      return;
    }

    // Check if user exists by email (migrating from old auth)
    if (email) {
      const existingByEmail = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();

      if (existingByEmail) {
        // Link old user to new WorkOS identity
        await ctx.db.patch(existingByEmail._id, {
          tokenIdentifier: identity.tokenIdentifier,
          ...(identity.name ? { name: identity.name } : {}),
        });
        return;
      }
    }

    // Create new user
    await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      email,
      ...(identity.name ? { name: identity.name } : {}),
    });
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
