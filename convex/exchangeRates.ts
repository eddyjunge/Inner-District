import { action } from "./_generated/server";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

export const getCached = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("exchangeRates").first();
  },
});

export const upsertRates = internalMutation({
  args: {
    rates: v.any(),
    baseCurrency: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("exchangeRates").first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        rates: args.rates,
        baseCurrency: args.baseCurrency,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("exchangeRates", {
        rates: args.rates,
        baseCurrency: args.baseCurrency,
        updatedAt: Date.now(),
      });
    }
  },
});

export const fetchAndCache = action({
  args: {},
  handler: async (ctx): Promise<Record<string, number> | null> => {
    const cached: { rates: Record<string, number>; updatedAt: number } | null =
      await ctx.runQuery(internal.exchangeRates.getCached);
    if (cached && Date.now() - cached.updatedAt < CACHE_DURATION_MS) {
      return cached.rates;
    }

    const response = await fetch("https://api.frankfurter.app/latest?from=EUR");
    if (!response.ok) {
      if (cached) return cached.rates;
      return null;
    }

    const data = await response.json();
    const rates = data.rates as Record<string, number>;

    await ctx.runMutation(internal.exchangeRates.upsertRates, {
      rates,
      baseCurrency: "EUR",
    });

    return rates;
  },
});

export const getRates = query({
  args: {},
  handler: async (ctx) => {
    const cached = await ctx.db.query("exchangeRates").first();
    if (!cached) return null;
    return {
      rates: cached.rates as Record<string, number>,
      updatedAt: cached.updatedAt,
    };
  },
});
