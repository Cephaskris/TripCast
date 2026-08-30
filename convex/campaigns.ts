import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    clientId: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let campaigns = await ctx.db.query("campaigns").collect();

    if (args.clientId) {
      campaigns = campaigns.filter(c => c.client_id === args.clientId);
    }
    if (args.status) {
      campaigns = campaigns.filter(c => c.status === args.status);
    }

    return campaigns;
  },
});

export const create = mutation({
  args: {
    clientId: v.string(),
    title: v.string(),
    videoUrl: v.string(),
    totalBudget: v.number(),
    costPerPlay: v.number(),
    targetImpressions: v.number(),
    targetCity: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const campaignId = await ctx.db.insert("campaigns", {
      client_id: args.clientId,
      title: args.title,
      video_url: args.videoUrl,
      total_budget: args.totalBudget,
      cost_per_play: args.costPerPlay,
      target_impressions: args.targetImpressions,
      current_impressions: 0,
      status: "PENDING",
      target_city: args.targetCity,
      start_date: args.startDate,
      end_date: args.endDate,
      created_at: new Date().toISOString(),
    });

    return campaignId;
  },
});

export const moderate = mutation({
  args: {
    id: v.id("campaigns"),
    status: v.union(v.literal("APPROVED"), v.literal("REJECTED"), v.literal("ACTIVE")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
    });
    return { success: true };
  },
});

export const logImpression = mutation({
  args: {
    campaignId: v.id("campaigns"),
    vehicleId: v.string(),
    proofHash: v.string(),
    durationSeconds: v.number(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    speedKmh: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Increment impressions
    await ctx.db.patch(args.campaignId, {
      current_impressions: campaign.current_impressions + 1,
    });

    // Record verified proof-of-play log
    const logId = await ctx.db.insert("playbackLogs", {
      campaign_id: args.campaignId,
      vehicle_id: args.vehicleId,
      timestamp: new Date().toISOString(),
      duration_seconds: args.durationSeconds,
      verified: true,
      proof_hash: args.proofHash,
      latitude: args.latitude,
      longitude: args.longitude,
      speed_kmh: args.speedKmh,
    });

    return { success: true, logId };
  },
});
