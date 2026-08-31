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

