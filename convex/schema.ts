import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    userId: v.string(), // e.g. usr_client_1
    email: v.string(),
    full_name: v.string(),
    role: v.union(v.literal("ADMIN"), v.literal("CLIENT"), v.literal("DRIVER"), v.literal("SUPPORT")),
    phone: v.optional(v.string()),
    company_name: v.optional(v.string()),
    staff_id: v.optional(v.string()),
    password: v.optional(v.string()),
    pin: v.optional(v.string()),
    city: v.optional(v.string()),
    license_plate: v.optional(v.string()),
    bank_name: v.optional(v.string()),
    account_number: v.optional(v.string()),
    account_name: v.optional(v.string()),
    created_at: v.string(),
    status: v.string(), // "ACTIVE" | "PENDING" | "SUSPENDED"
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  campaigns: defineTable({
    client_id: v.string(),
    title: v.string(),
    video_url: v.string(),
    total_budget: v.number(),
    cost_per_play: v.number(),
    target_impressions: v.number(),
    current_impressions: v.number(),
    status: v.union(
      v.literal("PENDING"),
      v.literal("APPROVED"),
      v.literal("REJECTED"),
      v.literal("ACTIVE"),
      v.literal("COMPLETED")
    ),
    target_city: v.string(),
    start_date: v.string(),
    end_date: v.string(),
    created_at: v.string(),
  })
    .index("by_client", ["client_id"])
    .index("by_status", ["status"]),

  vehicles: defineTable({
    vehicle_id: v.string(),
    driver_id: v.string(),
    driver_name: v.string(),
    tablet_device_id: v.string(),
    license_plate: v.string(),
    city: v.string(),
    is_active: v.boolean(),
    app_version: v.string(),
    battery_level: v.number(),
    storage_free_mb: v.number(),
    last_heartbeat: v.string(),
  })
    .index("by_driver", ["driver_id"])
    .index("by_tablet", ["tablet_device_id"]),

  playbackLogs: defineTable({
    campaign_id: v.string(),
    vehicle_id: v.string(),
    timestamp: v.string(),
    duration_seconds: v.number(),
    verified: v.boolean(),
    proof_hash: v.string(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    speed_kmh: v.optional(v.number()),
  })
    .index("by_campaign", ["campaign_id"])
    .index("by_vehicle", ["vehicle_id"]),

  payouts: defineTable({
    driver_id: v.string(),
    driver_name: v.string(),
    vehicle_id: v.string(),
    license_plate: v.string(),
    period_start: v.string(),
    period_end: v.string(),
    month_cycle: v.string(),
    hours_in_transit: v.number(),
    total_plays_verified: v.number(),
    rate_applied: v.number(),
    payout_amount: v.number(),
    status: v.union(v.literal("PENDING"), v.literal("PAID")),
    payment_reference: v.optional(v.string()),
    paid_at: v.optional(v.string()),
  })
    .index("by_driver", ["driver_id"])
    .index("by_month", ["month_cycle"])
    .index("by_status", ["status"]),

  tickets: defineTable({
    ticket_num: v.string(),
    sender_role: v.union(v.literal("DRIVER"), v.literal("CLIENT")),
    sender_name: v.string(),
    sender_id: v.string(),
    category: v.string(),
    priority: v.union(v.literal("LOW"), v.literal("MEDIUM"), v.literal("HIGH"), v.literal("CRITICAL")),
    subject: v.string(),
    description: v.string(),
    status: v.union(v.literal("OPEN"), v.literal("IN_PROGRESS"), v.literal("RESOLVED")),
    assigned_agent: v.optional(v.string()),
    resolution_notes: v.optional(v.string()),
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index("by_status", ["status"])
    .index("by_agent", ["assigned_agent"]),

  rates: defineTable({
    driver_payout_rate: v.number(),
    advertiser_rate: v.number(),
    currency: v.string(),
  }),
});
