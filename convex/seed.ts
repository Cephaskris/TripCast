import { mutation } from "./_generated/server";

export const initPlatformData = mutation({
  handler: async (ctx) => {
    // 1. Store Platform Rates
    const rateCheck = await ctx.db.query("rates").first();
    if (!rateCheck) {
      await ctx.db.insert("rates", {
        driver_payout_rate: 10.00,
        advertiser_rate: 25.00,
        currency: "NGN (₦)",
      });
    }

    // 2. Store All Platform Users
    const userCheck = await ctx.db.query("users").first();
    if (!userCheck) {
      await ctx.db.insert("users", {
        userId: "usr_admin",
        email: "admin@tripcast.io",
        full_name: "Platform Operations Admin",
        role: "ADMIN",
        phone: "+234 801 000 0001",
        created_at: "2026-01-10T08:00:00.000Z",
        status: "ACTIVE",
      });

      await ctx.db.insert("users", {
        userId: "usr_client_1",
        email: "advertiser@brand.com",
        full_name: "Coca Cola Nigeria Ads",
        role: "CLIENT",
        phone: "+234 802 333 4455",
        company_name: "Coca Cola HBC Nigeria",
        created_at: "2026-02-15T09:30:00.000Z",
        status: "ACTIVE",
      });

      await ctx.db.insert("users", {
        userId: "usr_client_2",
        email: "nike@advertiser.com",
        full_name: "Nike Africa Campaign",
        role: "CLIENT",
        phone: "+234 803 777 8899",
        company_name: "Nike West Africa Brand Group",
        created_at: "2026-03-01T11:20:00.000Z",
        status: "ACTIVE",
      });

      await ctx.db.insert("users", {
        userId: "usr_client_3",
        email: "ads@flutterwave.com",
        full_name: "Flutterwave Enterprise",
        role: "CLIENT",
        phone: "+234 805 111 2233",
        company_name: "Flutterwave Payment Tech",
        created_at: "2026-04-18T14:15:00.000Z",
        status: "ACTIVE",
      });

      await ctx.db.insert("users", {
        userId: "usr_driver_1",
        email: "emeka.driver@tripcast.io",
        full_name: "Emeka Okafor",
        role: "DRIVER",
        phone: "+234 806 444 5566",
        created_at: "2026-02-01T07:45:00.000Z",
        status: "ACTIVE",
      });

      await ctx.db.insert("users", {
        userId: "usr_driver_2",
        email: "tunde.driver@tripcast.io",
        full_name: "Tunde Adeleke",
        role: "DRIVER",
        phone: "+234 808 666 7788",
        created_at: "2026-02-12T10:10:00.000Z",
        status: "ACTIVE",
      });

      await ctx.db.insert("users", {
        userId: "usr_driver_3",
        email: "chinedu.driver@tripcast.io",
        full_name: "Chinedu Eze",
        role: "DRIVER",
        phone: "+234 810 222 3344",
        created_at: "2026-03-05T08:30:00.000Z",
        status: "ACTIVE",
      });

      await ctx.db.insert("users", {
        userId: "usr_support_1",
        email: "support@tripcast.io",
        full_name: "Amara Customer Care",
        role: "SUPPORT",
        phone: "+234 809 555 6677",
        staff_id: "CS-014",
        created_at: "2026-01-20T09:00:00.000Z",
        status: "ACTIVE",
      });

      await ctx.db.insert("users", {
        userId: "usr_support_2",
        email: "desk@tripcast.io",
        full_name: "Fatima Operations Support",
        role: "SUPPORT",
        phone: "+234 812 888 9900",
        staff_id: "CS-029",
        created_at: "2026-02-25T11:45:00.000Z",
        status: "ACTIVE",
      });
    }

    // 3. Store Fleet Vehicles
    const vehCheck = await ctx.db.query("vehicles").first();
    if (!vehCheck) {
      await ctx.db.insert("vehicles", {
        vehicle_id: "veh_01",
        driver_id: "usr_driver_1",
        driver_name: "Emeka Okafor",
        tablet_device_id: "tab_lagos_001",
        license_plate: "LAG-492-AA",
        city: "Lagos Island",
        is_active: true,
        app_version: "1.0.0 (SDK 54)",
        battery_level: 94,
        storage_free_mb: 14200,
        last_heartbeat: new Date().toISOString(),
      });

      await ctx.db.insert("vehicles", {
        vehicle_id: "veh_02",
        driver_id: "usr_driver_2",
        driver_name: "Tunde Adeleke",
        tablet_device_id: "tab_lagos_002",
        license_plate: "KJA-182-XY",
        city: "Ikeja",
        is_active: true,
        app_version: "1.0.0 (SDK 54)",
        battery_level: 88,
        storage_free_mb: 12800,
        last_heartbeat: new Date().toISOString(),
      });

      await ctx.db.insert("vehicles", {
        vehicle_id: "veh_03",
        driver_id: "usr_driver_3",
        driver_name: "Chinedu Eze",
        tablet_device_id: "tab_abuja_001",
        license_plate: "ABJ-771-BC",
        city: "Abuja Central",
        is_active: true,
        app_version: "1.0.0 (SDK 54)",
        battery_level: 92,
        storage_free_mb: 15100,
        last_heartbeat: new Date().toISOString(),
      });
    }

    // 4. Store Ad Campaigns
    const campCheck = await ctx.db.query("campaigns").first();
    if (!campCheck) {
      await ctx.db.insert("campaigns", {
        client_id: "usr_client_1",
        title: "Traffic & Urban Motion Campaign",
        video_url: "https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/person-bicycle-car-detection.mp4",
        total_budget: 250000.00,
        cost_per_play: 25.00,
        target_impressions: 10000,
        current_impressions: 342,
        status: "ACTIVE",
        target_city: "Lagos",
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 30).toISOString(),
        created_at: new Date().toISOString(),
      });

      await ctx.db.insert("campaigns", {
        client_id: "usr_client_2",
        title: "Nike Summer Demographics",
        video_url: "https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/face-demographics-walking.mp4",
        total_budget: 375000.00,
        cost_per_play: 25.00,
        target_impressions: 15000,
        current_impressions: 189,
        status: "ACTIVE",
        target_city: "Lagos",
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 30).toISOString(),
        created_at: new Date().toISOString(),
      });

      await ctx.db.insert("campaigns", {
        client_id: "usr_client_3",
        title: "Send Money Fast Across Africa",
        video_url: "https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/face-demographics-walking.mp4",
        total_budget: 450000.00,
        cost_per_play: 25.00,
        target_impressions: 18000,
        current_impressions: 120,
        status: "ACTIVE",
        target_city: "Lagos",
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 30).toISOString(),
        created_at: new Date().toISOString(),
      });

      await ctx.db.insert("campaigns", {
        client_id: "usr_client_1",
        title: "Lagos Island Mega Promo (New)",
        video_url: "https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/person-bicycle-car-detection.mp4",
        total_budget: 150000.00,
        cost_per_play: 25.00,
        target_impressions: 6000,
        current_impressions: 0,
        status: "PENDING",
        target_city: "Lagos",
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 30).toISOString(),
        created_at: new Date().toISOString(),
      });
    }

    // 5. Store Support Tickets
    const ticketCheck = await ctx.db.query("tickets").first();
    if (!ticketCheck) {
      await ctx.db.insert("tickets", {
        ticket_num: "TC-8921",
        sender_role: "DRIVER",
        sender_name: "Emeka Okafor",
        sender_id: "usr_driver_1",
        category: "PAYOUT_DISPUTE",
        priority: "HIGH",
        subject: "Shift Hours Recalibration Request",
        description: "My Saturday evening route along Lekki Phase 1 had 14 unverified loops due to tunnel signal drop. Please audit.",
        status: "OPEN",
        assigned_agent: "Amara Customer Care",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await ctx.db.insert("tickets", {
        ticket_num: "TC-8922",
        sender_role: "CLIENT",
        sender_name: "Coca Cola Nigeria Ads",
        sender_id: "usr_client_1",
        category: "CAMPAIGN_BILLING",
        priority: "MEDIUM",
        subject: "August Invoice Breakdown Request",
        description: "Need official VAT tax breakdown for our ₦250k traffic campaign settlement.",
        status: "IN_PROGRESS",
        assigned_agent: "Amara Customer Care",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // 6. Store Initial Monthly Driver Settlements
    const payoutCheck = await ctx.db.query("payouts").first();
    if (!payoutCheck) {
      await ctx.db.insert("payouts", {
        driver_id: "usr_driver_1",
        driver_name: "Emeka Okafor",
        vehicle_id: "veh_01",
        license_plate: "LAG-492-AA",
        period_start: "2026-08-01",
        period_end: "2026-08-31",
        month_cycle: "2026-08",
        hours_in_transit: 22.1,
        total_plays_verified: 120,
        rate_applied: 10.00,
        payout_amount: 1200.00,
        status: "PENDING",
      });

      await ctx.db.insert("payouts", {
        driver_id: "usr_driver_2",
        driver_name: "Tunde Adeleke",
        vehicle_id: "veh_02",
        license_plate: "KJA-182-XY",
        period_start: "2026-08-01",
        period_end: "2026-08-31",
        month_cycle: "2026-08",
        hours_in_transit: 22.1,
        total_plays_verified: 120,
        rate_applied: 10.00,
        payout_amount: 1200.00,
        status: "PENDING",
      });
    }

    return {
      success: true,
      message: "Successfully stored all platform users, campaigns, vehicles, tickets, and payouts into Convex Cloud database.",
    };
  },
});
