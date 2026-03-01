import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

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

    try {
      // Delegate to Node.js action for Stripe signature verification
      await ctx.runAction(internal.stripe.handleWebhook, {
        body,
        signature,
      });
    } catch (err) {
      console.error("Webhook processing failed:", err);
      return new Response("Webhook error", { status: 400 });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/download",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const orderId = url.searchParams.get("orderId");
    const email = url.searchParams.get("email");
    const itemIndexStr = url.searchParams.get("itemIndex");

    if (!orderId || !email || itemIndexStr === null) {
      return new Response("Missing required parameters", { status: 400 });
    }

    const itemIndex = parseInt(itemIndexStr, 10);
    if (isNaN(itemIndex)) {
      return new Response("Invalid item index", { status: 400 });
    }

    // Look up the order directly
    const order = await ctx.runQuery(internal.orders.getOrderForDownload, {
      orderId: orderId as any,
      email,
    });

    if (!order) {
      return new Response("Order not found or email mismatch", { status: 403 });
    }

    if (order.status !== "paid" && order.status !== "shipped" && order.status !== "delivered") {
      return new Response("Order not yet paid", { status: 403 });
    }

    const item = order.items[itemIndex];
    if (!item || !item.downloadFileId) {
      return new Response("No downloadable file for this item", { status: 404 });
    }

    // Get the file URL from Convex storage
    const fileUrl = await ctx.storage.getUrl(item.downloadFileId);
    if (!fileUrl) {
      return new Response("File not found", { status: 404 });
    }

    // Redirect to the file
    return Response.redirect(fileUrl, 302);
  }),
});

export default http;
