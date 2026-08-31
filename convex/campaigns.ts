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

export const getById = query({
  args: { id: v.id("campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const update = mutation({
  args: {
    id: v.id("campaigns"),
    title: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    totalBudget: v.optional(v.number()),
    costPerPlay: v.optional(v.number()),
    targetImpressions: v.optional(v.number()),
    currentImpressions: v.optional(v.number()),
    targetCity: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("PENDING"),
      v.literal("APPROVED"),
      v.literal("REJECTED"),
      v.literal("ACTIVE"),
      v.literal("COMPLETED")
    )),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const patch: Record<string, any> = {};
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.videoUrl !== undefined) patch.video_url = updates.videoUrl;
    if (updates.totalBudget !== undefined) patch.total_budget = updates.totalBudget;
    if (updates.costPerPlay !== undefined) patch.cost_per_play = updates.costPerPlay;
    if (updates.targetImpressions !== undefined) patch.target_impressions = updates.targetImpressions;
    if (updates.currentImpressions !== undefined) patch.current_impressions = updates.currentImpressions;
    if (updates.targetCity !== undefined) patch.target_city = updates.targetCity;
    if (updates.startDate !== undefined) patch.start_date = updates.startDate;
    if (updates.endDate !== undefined) patch.end_date = updates.endDate;
    if (updates.status !== undefined) patch.status = updates.status;

    await ctx.db.patch(id, patch);
    return { success: true, id };
  },
});

export const remove = mutation({
  args: { id: v.id("campaigns") },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("playbackLogs")
      .withIndex("by_campaign", (q) => q.eq("campaign_id", args.id))
      .collect();
    for (const log of logs) {
      await ctx.db.delete(log._id);
    }
    await ctx.db.delete(args.id);
    return { success: true, deletedId: args.id };
  },
});

export const moderate = mutation({
  args: {
    id: v.id("campaigns"),
    status: v.union(
      v.literal("PENDING"),
      v.literal("APPROVED"),
      v.literal("REJECTED"),
      v.literal("ACTIVE"),
      v.literal("COMPLETED")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
    });
    return { success: true, id: args.id, status: args.status };
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
