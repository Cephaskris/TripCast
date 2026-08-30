import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let tickets = await ctx.db.query("tickets").collect();
    if (args.status) {
      tickets = tickets.filter(t => t.status === args.status);
    }
    return tickets;
  },
});

export const create = mutation({
  args: {
    senderRole: v.union(v.literal("DRIVER"), v.literal("CLIENT")),
    senderName: v.string(),
    senderId: v.string(),
    category: v.string(),
    priority: v.union(v.literal("LOW"), v.literal("MEDIUM"), v.literal("HIGH"), v.literal("CRITICAL")),
    subject: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const ticketNum = `TC-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const id = await ctx.db.insert("tickets", {
      ticket_num: ticketNum,
      sender_role: args.senderRole,
      sender_name: args.senderName,
      sender_id: args.senderId,
      category: args.category,
      priority: args.priority,
      subject: args.subject,
      description: args.description,
      status: "OPEN",
      assigned_agent: "Amara Customer Care",
      created_at: now,
      updated_at: now,
    });

    return { success: true, ticketId: id, ticketNum };
  },
});

export const updateStatus = mutation({
  args: {
    ticketId: v.id("tickets"),
    status: v.union(v.literal("OPEN"), v.literal("IN_PROGRESS"), v.literal("RESOLVED")),
    resolutionNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.ticketId, {
      status: args.status,
      resolution_notes: args.resolutionNotes,
      updated_at: new Date().toISOString(),
    });
    return { success: true };
  },
});
