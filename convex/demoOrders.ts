import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getShippingRate, getVatRate, extractVat } from "./euConfig";

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
        productType: (product.productType ?? "physical") as "physical" | "digital",
        downloadUrl: product.downloadUrl,
        licenseKey: product.licenseKey,
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

    const hasPhysicalItems = orderItems.some((i) => i.productType === "physical");
    const countryCode = args.shippingAddress.country;
    const shipping = getShippingRate(countryCode, hasPhysicalItems);
    const vatRate = getVatRate(countryCode);
    const total = subtotal + shipping;
    const vatAmount = extractVat(total, vatRate);

    const demoSessionId = `demo_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const orderId = await ctx.db.insert("orders", {
      email: args.email,
      stripeSessionId: demoSessionId,
      items: orderItems,
      subtotal,
      shipping,
      total,
      vatRate,
      vatAmount,
      shippingAddress: args.shippingAddress,
      status: "paid",
      createdAt: Date.now(),
    });

    return { orderId, sessionId: demoSessionId };
  },
});
