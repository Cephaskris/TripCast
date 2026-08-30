import { query } from "./_generated/server";
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
