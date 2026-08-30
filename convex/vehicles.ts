import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("vehicles").collect();
  },
});

export const getByTabletId = query({
  args: { tabletDeviceId: v.string() },
  handler: async (ctx, args) => {
    const vehicle = await ctx.db
      .query("vehicles")
      .withIndex("by_tablet", (q) => q.eq("tablet_device_id", args.tabletDeviceId))
      .first();
    return vehicle;
  },
});

export const heartbeat = mutation({
  args: {
    tabletDeviceId: v.string(),
    batteryLevel: v.number(),
    storageFreeMb: v.number(),
    appVersion: v.string(),
  },
  handler: async (ctx, args) => {
    const vehicle = await ctx.db
      .query("vehicles")
      .withIndex("by_tablet", (q) => q.eq("tablet_device_id", args.tabletDeviceId))
      .first();

    const timestamp = new Date().toISOString();

    if (vehicle) {
      await ctx.db.patch(vehicle._id, {
        battery_level: args.batteryLevel,
        storage_free_mb: args.storageFreeMb,
        app_version: args.appVersion,
        is_active: true,
        last_heartbeat: timestamp,
      });
      return { success: true, vehicleId: vehicle.vehicle_id };
    }

    return { success: false, message: "Vehicle unassigned" };
  },
});
