import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getSummary = query({
  args: { monthCycle: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const cycle = args.monthCycle || "2026-08";
    const payouts = await ctx.db
      .query("payouts")
      .withIndex("by_month", (q) => q.eq("month_cycle", cycle))
      .collect();

    const rateRecord = await ctx.db.query("rates").first();
    const activeRate = rateRecord?.driver_payout_rate ?? 10.00;

    const totalHours = Number(payouts.reduce((sum, p) => sum + p.hours_in_transit, 0).toFixed(1));
    const totalPlays = payouts.reduce((sum, p) => sum + p.total_plays_verified, 0);
    const totalPayout = payouts.reduce((sum, p) => sum + p.payout_amount, 0);
    const pendingPayout = payouts.filter(p => p.status === "PENDING").reduce((sum, p) => sum + p.payout_amount, 0);
    const disbursedPayout = payouts.filter(p => p.status === "PAID").reduce((sum, p) => sum + p.payout_amount, 0);
    const pendingCount = payouts.filter(p => p.status === "PENDING").length;

    return {
      month_cycle: cycle,
      currency: "NGN (₦)",
      driver_payout_rate: activeRate,
      summary: {
        total_hours_in_transit: totalHours,
        total_verified_plays: totalPlays,
        total_payout_amount_naira: totalPayout,
        pending_payout_amount_naira: pendingPayout,
        disbursed_payout_amount_naira: disbursedPayout,
        total_drivers_count: payouts.length,
        pending_drivers_count: pendingCount,
      },
      payouts,
    };
  },
});

export const bulkDisburse = mutation({
  handler: async (ctx) => {
    const pendingPayouts = await ctx.db
      .query("payouts")
      .withIndex("by_status", (q) => q.eq("status", "PENDING"))
      .collect();

    if (pendingPayouts.length === 0) {
      return {
        success: true,
        message: "All driver settlements have already been disbursed.",
        count: 0,
        total_amount_naira: 0,
      };
    }

    const batchRef = `NIBSS_BATCH_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const paidAt = new Date().toISOString();
    let totalDisbursed = 0;

    for (const p of pendingPayouts) {
      totalDisbursed += p.payout_amount;
      await ctx.db.patch(p._id, {
        status: "PAID",
        payment_reference: batchRef,
        paid_at: paidAt,
      });
    }

    return {
      success: true,
      message: `Batch settlement of ₦${totalDisbursed.toLocaleString()} successfully disbursed across ${pendingPayouts.length} vehicle drivers.`,
      batch_reference: batchRef,
      disbursed_count: pendingPayouts.length,
      total_amount_naira: totalDisbursed,
    };
  },
});
