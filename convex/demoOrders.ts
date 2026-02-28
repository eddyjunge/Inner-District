import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createDemoOrder = mutation({
  args: {
    email: v.string(),
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
  },
  handler: async (ctx, args) => {
    const orderItems = [];
    let subtotal = 0;

    for (const item of args.items) {
      const product = await ctx.db.get(item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);
      if (!product.isActive) throw new Error(`${product.name} is no longer available`);
      if (product.stock < item.quantity) {
        throw new Error(`Only ${product.stock} of ${product.name} available`);
      }

      orderItems.push({
        productId: item.productId,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
      });
      subtotal += product.price * item.quantity;
    }

    // Decrement stock
    for (const item of args.items) {
      const product = await ctx.db.get(item.productId);
      if (product) {
        await ctx.db.patch(item.productId, {
          stock: product.stock - item.quantity,
        });
      }
    }

    const demoSessionId = `demo_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const orderId = await ctx.db.insert("orders", {
      email: args.email,
      stripeSessionId: demoSessionId,
      items: orderItems,
      subtotal,
      shipping: 0,
      total: subtotal,
      shippingAddress: args.shippingAddress,
      status: "paid",
      createdAt: Date.now(),
    });

    return { orderId, sessionId: demoSessionId };
  },
});
