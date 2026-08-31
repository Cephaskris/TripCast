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

export const create = mutation({
  args: {
    driverId: v.string(),
    driverName: v.string(),
    licensePlate: v.string(),
    city: v.string(),
    tabletDeviceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const vehicleId = `veh_${Date.now()}`;
    const cleanCity = args.city.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const tablet = args.tabletDeviceId || `tab_${cleanCity}_${Math.floor(100 + Math.random() * 900)}`;
    const id = await ctx.db.insert("vehicles", {
      vehicle_id: vehicleId,
      driver_id: args.driverId,
      driver_name: args.driverName,
      tablet_device_id: tablet,
      license_plate: args.licensePlate.toUpperCase(),
      city: args.city,
      is_active: true,
      app_version: "1.0.0 (SDK 54)",
      battery_level: 96,
      storage_free_mb: 14500,
      last_heartbeat: new Date().toISOString(),
    });
    return { success: true, id, vehicleId, tabletDeviceId: tablet };
  },
});

export const update = mutation({
  args: {
    id: v.id("vehicles"),
    licensePlate: v.optional(v.string()),
    city: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    batteryLevel: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, any> = {};
    if (args.licensePlate !== undefined) patch.license_plate = args.licensePlate.toUpperCase();
    if (args.city !== undefined) patch.city = args.city;
    if (args.isActive !== undefined) patch.is_active = args.isActive;
    if (args.batteryLevel !== undefined) patch.battery_level = args.batteryLevel;
    await ctx.db.patch(args.id, patch);
    return { success: true, id: args.id };
  },
});

export const remove = mutation({
  args: { id: v.id("vehicles") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true, deletedId: args.id };
  },
});

