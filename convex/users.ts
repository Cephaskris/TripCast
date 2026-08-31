import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    role: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let allUsers = await ctx.db.query("users").collect();

    // Exclude root admin from regular list
    allUsers = allUsers.filter(u => u.role !== "ADMIN");

    if (args.role && args.role !== "ALL") {
      allUsers = allUsers.filter(u => u.role === args.role);
    }

    if (args.search) {
      const q = args.search.toLowerCase().trim();
      allUsers = allUsers.filter(u =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.toLowerCase().includes(q)) ||
        (u.company_name && u.company_name.toLowerCase().includes(q))
      );
    }

    const driversCount = allUsers.filter(u => u.role === "DRIVER").length;
    const advertisersCount = allUsers.filter(u => u.role === "CLIENT").length;
    const supportCount = allUsers.filter(u => u.role === "SUPPORT").length;

    return {
      counts: {
        total_users: allUsers.length,
        drivers: driversCount,
        advertisers: advertisersCount,
        support: supportCount,
      },
      users: allUsers,
    };
  },
});

export const getProfile = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!user) {
      return null;
    }

    if (user.role === "DRIVER") {
      const vehicle = await ctx.db
        .query("vehicles")
        .withIndex("by_driver", (q) => q.eq("driver_id", user.userId))
        .first();

      const payouts = await ctx.db
        .query("payouts")
        .withIndex("by_driver", (q) => q.eq("driver_id", user.userId))
        .collect();

      return {
        user,
        vehicle,
        payouts,
      };
    } else if (user.role === "CLIENT") {
      const campaigns = await ctx.db
        .query("campaigns")
        .withIndex("by_client", (q) => q.eq("client_id", user.userId))
        .collect();

      return {
        user,
        campaigns,
      };
    }

    return { user };
  },
});

export const register = mutation({
  args: {
    email: v.string(),
    fullName: v.string(),
    role: v.union(v.literal("CLIENT"), v.literal("DRIVER")),
    phone: v.string(),
    password: v.string(),
    companyName: v.optional(v.string()),
    licensePlate: v.optional(v.string()),
    city: v.optional(v.string()),
    bankName: v.optional(v.string()),
    accountNumber: v.optional(v.string()),
    accountName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error("This email is already registered.");
    }

    const userId = args.role === "CLIENT" 
      ? `usr_client_${Date.now()}` 
      : `usr_driver_${Date.now()}`;
    const now = new Date().toISOString();

    await ctx.db.insert("users", {
      userId,
      email: args.email,
      full_name: args.fullName,
      role: args.role,
      phone: args.phone,
      company_name: args.companyName,
      password: args.password,
      city: args.city,
      license_plate: args.licensePlate,
      bank_name: args.bankName,
      account_number: args.accountNumber,
      account_name: args.accountName,
      created_at: now,
      status: "ACTIVE",
    });

    if (args.role === "DRIVER") {
      const vehicleId = `veh_${Date.now()}`;
      const cleanCity = (args.city || "lagos").toLowerCase().replace(/[^a-z0-9]/g, "_");
      const tabletId = `tab_${cleanCity}_${Math.floor(100 + Math.random() * 900)}`;

      await ctx.db.insert("vehicles", {
        vehicle_id: vehicleId,
        driver_id: userId,
        driver_name: args.fullName,
        tablet_device_id: tabletId,
        license_plate: args.licensePlate || `LAG-${Math.floor(100 + Math.random() * 900)}-AA`,
        city: args.city || "Lagos Island",
        is_active: true,
        app_version: "1.0.0 (SDK 54)",
        battery_level: 96,
        storage_free_mb: 14500,
        last_heartbeat: now,
      });
    }

    return {
      success: true,
      userId,
      email: args.email,
      fullName: args.fullName,
      role: args.role,
    };
  },
});

export const getById = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const updateProfile = mutation({
  args: {
    id: v.optional(v.id("users")),
    userId: v.optional(v.string()),
    fullName: v.optional(v.string()),
    phone: v.optional(v.string()),
    companyName: v.optional(v.string()),
    status: v.optional(v.string()),
    bankName: v.optional(v.string()),
    accountNumber: v.optional(v.string()),
    city: v.optional(v.string()),
    licensePlate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let targetId = args.id;
    if (!targetId && args.userId) {
      const u = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .first();
      if (u) targetId = u._id;
    }
    if (!targetId) {
      throw new Error("User record not found in Convex");
    }

    const patch: Record<string, any> = {};
    if (args.fullName !== undefined) patch.full_name = args.fullName;
    if (args.phone !== undefined) patch.phone = args.phone;
    if (args.companyName !== undefined) patch.company_name = args.companyName;
    if (args.status !== undefined) patch.status = args.status;
    if (args.bankName !== undefined) patch.bank_name = args.bankName;
    if (args.accountNumber !== undefined) patch.account_number = args.accountNumber;
    if (args.city !== undefined) patch.city = args.city;
    if (args.licensePlate !== undefined) patch.license_plate = args.licensePlate;

    await ctx.db.patch(targetId, patch);
    return { success: true, id: targetId };
  },
});

export const remove = mutation({
  args: {
    id: v.optional(v.id("users")),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let target = null;
    if (args.id) {
      target = await ctx.db.get(args.id);
    } else if (args.userId) {
      target = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .first();
    }

    if (!target) {
      throw new Error("User not found to delete");
    }

    // Clean up related vehicles if driver
    if (target.role === "DRIVER") {
      const vehicles = await ctx.db
        .query("vehicles")
        .withIndex("by_driver", (q) => q.eq("driver_id", target.userId))
        .collect();
      for (const v of vehicles) {
        await ctx.db.delete(v._id);
      }
    }

    await ctx.db.delete(target._id);
    return { success: true, deletedUserId: target.userId };
  },
});

