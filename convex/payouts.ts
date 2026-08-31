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

export const create = mutation({
  args: {
    driverId: v.string(),
    driverName: v.string(),
    vehicleId: v.string(),
    licensePlate: v.string(),
    periodStart: v.string(),
    periodEnd: v.string(),
    monthCycle: v.string(),
    hoursInTransit: v.number(),
    totalPlaysVerified: v.number(),
    rateApplied: v.number(),
    payoutAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("payouts", {
      driver_id: args.driverId,
      driver_name: args.driverName,
      vehicle_id: args.vehicleId,
      license_plate: args.licensePlate,
      period_start: args.periodStart,
      period_end: args.periodEnd,
      month_cycle: args.monthCycle,
      hours_in_transit: args.hoursInTransit,
      total_plays_verified: args.totalPlaysVerified,
      rate_applied: args.rateApplied,
      payout_amount: args.payoutAmount,
      status: "PENDING",
    });
    return { success: true, id };
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("payouts"),
    status: v.union(v.literal("PENDING"), v.literal("PROCESSING"), v.literal("PAID")),
    paymentReference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, any> = { status: args.status };
    if (args.paymentReference) {
      patch.payment_reference = args.paymentReference;
      patch.paid_at = new Date().toISOString();
    }
    await ctx.db.patch(args.id, patch);
    return { success: true, id: args.id };
  },
});

export const remove = mutation({
  args: { id: v.id("payouts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true, deletedId: args.id };
  },
});
