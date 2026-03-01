"use node";

import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import Stripe from "stripe";
import { getShippingRate, getVatRate, extractVat } from "./euConfig";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
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
    email: v.string(),
  },
  handler: async (ctx, args): Promise<string | null> => {
    // Validate quantities
    for (const item of args.items) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        throw new Error("Invalid quantity: must be a positive integer");
      }
    }

    // Look up products server-side — never trust client prices
    const validatedItems = await Promise.all(
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
        return { _id: product._id, name: product.name, price: product.price, stripePriceId: product.stripePriceId, quantity: item.quantity };
      }),
    );

    // Build Stripe line items from server-side data
    const lineItems = validatedItems.map((p) => ({
      price: p.stripePriceId,
      quantity: p.quantity,
    }));

    // Get shipping rate from env
    const countryCode = args.shippingAddress.country;
    const shippingAmount = getShippingRate(countryCode);
    const vatRate = getVatRate(countryCode);

    // Compute totals server-side
    const subtotal = validatedItems.reduce(
      (sum, p) => sum + p.price * p.quantity,
      0,
    );
    const total = subtotal + shippingAmount;
    const vatAmount = extractVat(total, vatRate);

    // Create a pending order in Convex BEFORE creating Stripe session
    const pendingOrderId = await ctx.runMutation(
      internal.stripeHelpers.createPendingOrder,
      {
        items: validatedItems.map((p) => ({
          productId: p._id,
          name: p.name,
          price: p.price,
          quantity: p.quantity,
        })),
        shippingAddress: args.shippingAddress,
        subtotal,
        shipping: shippingAmount,
        total,
        vatRate,
        vatAmount,
        email: args.email,
      },
    );

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
      customer_email: args.email,
      metadata,
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: shippingAmount, currency: "eur" },
            display_name: countryCode === "DE" ? "Versand (Deutschland)" : "Versand (EU)",
          },
        },
      ],
    });

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
