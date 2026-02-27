"use node";

import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-12-18.acacia",
  });
}

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
          internal.stripeHelpers.getProduct,
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
      const user = await ctx.runQuery(internal.stripeHelpers.getUserByClerkId, {
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
      internal.stripeHelpers.createPendingOrder,
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
    const session = await getStripe().checkout.sessions.create({
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
    await ctx.runMutation(internal.stripeHelpers.attachStripeSession, {
      orderId: pendingOrderId,
      stripeSessionId: session.id,
    });

    return session.url;
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
      event = getStripe().webhooks.constructEvent(
        args.body,
        args.signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch (err) {
      throw new Error("Invalid webhook signature");
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await ctx.runMutation(internal.stripeHelpers.fulfillOrder, {
        stripeSessionId: session.id,
        stripePaymentIntentId: (session.payment_intent as string) ?? "",
      });
    }
  },
});
