import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const logBatch = mutation({
  args: {
    vehicleId: v.string(),
    tabletDeviceId: v.string(),
    logs: v.array(
      v.object({
        campaign_id: v.string(),
        timestamp: v.string(),
        duration_seconds: v.number(),
        verified: v.boolean(),
        proof_hash: v.string(),
        latitude: v.optional(v.number()),
        longitude: v.optional(v.number()),
        speed_kmh: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    for (const log of args.logs) {
      await ctx.db.insert("playbackLogs", {
        campaign_id: log.campaign_id,
        vehicle_id: args.vehicleId,
        timestamp: log.timestamp,
        duration_seconds: log.duration_seconds,
        verified: log.verified,
        proof_hash: log.proof_hash,
        latitude: log.latitude,
        longitude: log.longitude,
        speed_kmh: log.speed_kmh,
      });
      inserted++;
    }
    return { success: true, count: inserted };
  },
});
