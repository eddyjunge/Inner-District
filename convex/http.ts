"use node";

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

const http = httpRouter();

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return new Response("Missing stripe-signature header", { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response("Invalid signature", { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const items = JSON.parse(session.metadata?.items ?? "[]");
      const shippingAddress = JSON.parse(
        session.metadata?.shippingAddress ?? "{}",
      );
      const shipping = parseInt(session.metadata?.shipping ?? "0");
      const userId = session.metadata?.userId ?? undefined;
      const guestEmail = session.metadata?.guestEmail ?? session.customer_email ?? undefined;

      const subtotal = session.amount_subtotal ?? 0;
      const total = session.amount_total ?? 0;

      await ctx.runMutation(internal.stripe.fulfillOrder, {
        stripeSessionId: session.id,
        stripePaymentIntentId: (session.payment_intent as string) ?? "",
        items,
        shippingAddress,
        subtotal,
        shipping,
        total,
        userId,
        guestEmail,
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
