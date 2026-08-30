import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  handler: async (ctx) => {
    const rateRecord = await ctx.db.query("rates").first();
    if (rateRecord) {
      return {
        driver_payout_rate: rateRecord.driver_payout_rate,
        advertiser_rate: rateRecord.advertiser_rate,
        currency: rateRecord.currency,
      };
    }
    return {
      driver_payout_rate: 10.00,
      advertiser_rate: 25.00,
      currency: "NGN (₦)",
    };
  },
});

export const update = mutation({
  args: {
    driverPayoutRate: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("rates").first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        driver_payout_rate: args.driverPayoutRate,
      });
    } else {
      await ctx.db.insert("rates", {
        driver_payout_rate: args.driverPayoutRate,
        advertiser_rate: 25.00,
        currency: "NGN (₦)",
      });
    }

    // Automatically recalculate all PENDING payouts to apply the updated rate
    const pendingPayouts = await ctx.db
      .query("payouts")
      .withIndex("by_status", (q) => q.eq("status", "PENDING"))
      .collect();

    for (const p of pendingPayouts) {
      await ctx.db.patch(p._id, {
        rate_applied: args.driverPayoutRate,
        payout_amount: Number((p.total_plays_verified * args.driverPayoutRate).toFixed(2)),
      });
    }

    return {
      success: true,
      message: `Driver payout rate updated to ₦${args.driverPayoutRate.toFixed(2)} per verified play.`,
    };
  },
});
