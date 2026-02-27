"use node";

import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

export const createCheckoutSession = action({
  args: {
    items: v.array(
      v.object({
        productId: v.id("products"),
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
    guestEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate quantities
    for (const item of args.items) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        throw new Error("Invalid quantity: must be a positive integer");
      }
    }

    // Look up products server-side — never trust client prices
    const products = await Promise.all(
      args.items.map(async (item) => {
        const product = await ctx.runQuery(
          internal.stripe.getProduct,
          { id: item.productId },
        );
        if (!product) throw new Error(`Product not found: ${item.productId}`);
        if (!product.isActive) throw new Error(`Product unavailable: ${product.name}`);
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }
        return { ...product, quantity: item.quantity };
      }),
    );

    // Build Stripe line items from server-side data
    const lineItems = products.map((p) => ({
      price: p.stripePriceId,
      quantity: p.quantity,
    }));

    // Get shipping rate from env
    const shippingAmount = parseInt(process.env.SHIPPING_RATE_CENTS ?? "500");

    // Check if user is authenticated
    const identity = await ctx.auth.getUserIdentity();
    let userId: string | undefined;
    if (identity) {
      const user = await ctx.runQuery(internal.stripe.getUserByClerkId, {
        clerkId: identity.subject,
      });
      userId = user?._id;
    }

    // Compute totals server-side
    const subtotal = products.reduce(
      (sum, p) => sum + p.price * p.quantity,
      0,
    );
    const total = subtotal + shippingAmount;

    // Create a pending order in Convex BEFORE creating Stripe session.
    // This avoids Stripe metadata size limits (500 chars per value).
    const pendingOrderId = await ctx.runMutation(
      internal.stripe.createPendingOrder,
      {
        items: products.map((p) => ({
          productId: p._id,
          name: p.name,
          price: p.price,
          quantity: p.quantity,
        })),
        shippingAddress: args.shippingAddress,
        subtotal,
        shipping: shippingAmount,
        total,
        userId,
        guestEmail: args.guestEmail,
      },
    );

    // Only pass the order ID in Stripe metadata — no size limit risk
    const metadata: Record<string, string> = {
      convexOrderId: pendingOrderId,
    };

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      customer_email: args.guestEmail ?? undefined,
      metadata,
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: shippingAmount, currency: "usd" },
            display_name: "Standard Shipping",
          },
        },
      ],
    });

    // Update the pending order with the Stripe session ID
    await ctx.runMutation(internal.stripe.attachStripeSession, {
      orderId: pendingOrderId,
      stripeSessionId: session.id,
    });

    return session.url;
  },
});

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

export const handleWebhook = internalAction({
  args: {
    body: v.string(),
    signature: v.string(),
  },
  handler: async (ctx, args) => {
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        args.body,
        args.signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch (err) {
      throw new Error("Invalid webhook signature");
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await ctx.runMutation(internal.stripe.fulfillOrder, {
        stripeSessionId: session.id,
        stripePaymentIntentId: (session.payment_intent as string) ?? "",
      });
    }
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
