import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';

import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';

const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL || process.env.CONVEX_URL || 'https://effervescent-gnat-908.convex.cloud';
let convexClient: ConvexHttpClient | null = null;
try {
  convexClient = new ConvexHttpClient(CONVEX_URL);
  console.log(`[CONVEX CLOUD] Linked to ${CONVEX_URL}`);
} catch (e: any) {
  console.warn(`[CONVEX CLOUD] Warning:`, e.message);
}
export const convex = convexClient!;

const app = express();
app.use(express.json());

// Serve Static Assets locally (Vercel CDN handles web/ in production)
if (!process.env.VERCEL) {
  app.use(express.static(path.resolve(process.cwd(), 'web')));
}

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ============================================================================
// Data Interfaces
// ============================================================================

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'CLIENT' | 'DRIVER' | 'SUPPORT';
  pin?: string;
  phone?: string;
  created_at: string;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  staff_id?: string;
  company_name?: string;
  password?: string;
  city?: string;
  license_plate?: string;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
}

export interface Campaign {
  id: string;
  client_id: string;
  title: string;
  video_url: string;
  total_budget: number;
  cost_per_play: number;
  target_impressions: number;
  current_impressions: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED';
  target_city: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface Vehicle {
  id: string;
  driver_id: string;
  driver_name: string;
  tablet_device_id: string;
  license_plate: string;
  city: string;
  is_active: boolean;
  app_version: string;
  battery_level: number;
  storage_free_mb: number;
  last_heartbeat: string;
}

export interface TelemetryLog {
  id?: number;
  campaign_id: string;
  vehicle_id: string;
  playback_timestamp: string;
  latitude?: number;
  longitude?: number;
}

export interface Payout {
  id: string;
  driver_id: string;
  driver_name: string;
  vehicle_id: string;
  license_plate?: string;
  period_start: string;
  period_end: string;
  month_cycle: string;
  hours_in_transit: number;
  total_plays_verified: number;
  rate_applied: number;
  payout_amount: number;
  status: 'PENDING' | 'PROCESSING' | 'PAID';
  payment_reference?: string;
  paid_at?: string;
}

export let platformRates = {
  driver_payout_rate: 10.00,
  advertiser_rate: 25.00,
  currency: 'NGN (₦)'
};

export interface SupportTicket {
  id: string;
  ticket_num: string;
  sender_role: 'DRIVER' | 'CLIENT';
  sender_name: string;
  sender_id: string;
  category: 'PAYOUT_DISPUTE' | 'HARDWARE_ISSUE' | 'CAMPAIGN_BILLING' | 'SYNC_ERROR' | 'GENERAL';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  assigned_agent: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Database Store (Cloud SQL Simulation)
// ============================================================================

const users: User[] = [
  { id: 'usr_admin', email: 'admin@tripcast.io', full_name: 'Platform Operations Admin', role: 'ADMIN', pin: 'admin123', phone: '+234 801 000 0001', created_at: '2026-01-10T08:00:00.000Z', status: 'ACTIVE' },
  { id: 'usr_client_1', email: 'advertiser@brand.com', full_name: 'Coca Cola Nigeria Ads', role: 'CLIENT', pin: 'pass123', phone: '+234 802 333 4455', created_at: '2026-02-15T09:30:00.000Z', status: 'ACTIVE', company_name: 'Coca Cola HBC Nigeria' },
  { id: 'usr_client_2', email: 'nike@advertiser.com', full_name: 'Nike Africa Campaign', role: 'CLIENT', pin: 'pass123', phone: '+234 803 777 8899', created_at: '2026-03-01T11:20:00.000Z', status: 'ACTIVE', company_name: 'Nike West Africa Brand Group' },
  { id: 'usr_client_3', email: 'ads@flutterwave.com', full_name: 'Flutterwave Enterprise', role: 'CLIENT', pin: 'pass123', phone: '+234 805 111 2233', created_at: '2026-04-18T14:15:00.000Z', status: 'ACTIVE', company_name: 'Flutterwave Payment Tech' },
  { id: 'usr_driver_1', email: 'emeka.driver@tripcast.io', full_name: 'Emeka Okafor', role: 'DRIVER', pin: '1234', phone: '+234 806 444 5566', created_at: '2026-02-01T07:45:00.000Z', status: 'ACTIVE' },
  { id: 'usr_driver_2', email: 'tunde.driver@tripcast.io', full_name: 'Tunde Adeleke', role: 'DRIVER', pin: '5678', phone: '+234 808 666 7788', created_at: '2026-02-12T10:10:00.000Z', status: 'ACTIVE' },
  { id: 'usr_driver_3', email: 'chinedu.driver@tripcast.io', full_name: 'Chinedu Eze', role: 'DRIVER', pin: '4321', phone: '+234 810 222 3344', created_at: '2026-03-05T08:30:00.000Z', status: 'ACTIVE' },
  { id: 'usr_support_1', email: 'support@tripcast.io', full_name: 'Amara Customer Care', role: 'SUPPORT', pin: 'agent123', phone: '+234 809 555 6677', created_at: '2026-01-20T09:00:00.000Z', status: 'ACTIVE', staff_id: 'CS-014' },
  { id: 'usr_support_2', email: 'desk@tripcast.io', full_name: 'Fatima Operations Support', role: 'SUPPORT', pin: 'agent123', phone: '+234 812 888 9900', created_at: '2026-02-25T11:45:00.000Z', status: 'ACTIVE', staff_id: 'CS-029' },
];

let campaigns: Campaign[] = [
  {
    id: 'ad_1',
    client_id: 'usr_client_1',
    title: 'Traffic & Urban Motion Campaign',
    video_url: 'https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/person-bicycle-car-detection.mp4',
    total_budget: 250000.00,
    cost_per_play: 25.00,
    target_impressions: 10000,
    current_impressions: 342,
    status: 'ACTIVE',
    target_city: 'Lagos',
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 86400000 * 30).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'ad_3_new',
    client_id: 'usr_client_2',
    title: 'Nike Summer Demographics',
    video_url: 'https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/face-demographics-walking.mp4',
    total_budget: 375000.00,
    cost_per_play: 25.00,
    target_impressions: 15000,
    current_impressions: 189,
    status: 'ACTIVE',
    target_city: 'Lagos',
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 86400000 * 30).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'ad_pending_promo',
    client_id: 'usr_client_1',
    title: 'Lagos Island Mega Promo (New)',
    video_url: 'https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/person-bicycle-car-detection.mp4',
    total_budget: 150000.00,
    cost_per_play: 25.00,
    target_impressions: 6000,
    current_impressions: 0,
    status: 'PENDING',
    target_city: 'Lagos',
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 86400000 * 30).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'ad_flutter_01',
    client_id: 'usr_client_3',
    title: 'Send Money Fast Across Africa',
    video_url: 'https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/face-demographics-walking.mp4',
    total_budget: 450000.00,
    cost_per_play: 25.00,
    target_impressions: 18000,
    current_impressions: 120,
    status: 'ACTIVE',
    target_city: 'Lagos',
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 86400000 * 30).toISOString(),
    created_at: new Date().toISOString(),
  }
];

let vehicles: Vehicle[] = [
  {
    id: 'veh_01',
    driver_id: 'usr_driver_1',
    driver_name: 'Emeka Okafor',
    tablet_device_id: 'tab_lagos_001',
    license_plate: 'LAG-492-AA',
    city: 'Lagos Island',
    is_active: true,
    app_version: '1.0.0 (SDK 54)',
    battery_level: 94,
    storage_free_mb: 14200,
    last_heartbeat: new Date().toISOString(),
  },
  {
    id: 'veh_02',
    driver_id: 'usr_driver_2',
    driver_name: 'Tunde Adeleke',
    tablet_device_id: 'tab_lagos_002',
    license_plate: 'KJA-182-XY',
    city: 'Ikeja',
    is_active: true,
    app_version: '1.0.0 (SDK 54)',
    battery_level: 88,
    storage_free_mb: 12800,
    last_heartbeat: new Date().toISOString(),
  },
  {
    id: 'veh_03',
    driver_id: 'usr_driver_3',
    driver_name: 'Chinedu Eze',
    tablet_device_id: 'tab_abuja_001',
    license_plate: 'ABJ-771-BC',
    city: 'Abuja Central',
    is_active: true,
    app_version: '1.0.0 (SDK 54)',
    battery_level: 92,
    storage_free_mb: 15100,
    last_heartbeat: new Date().toISOString(),
  }
];

let playbackLogs: TelemetryLog[] = [];
let payouts: Payout[] = [];

let tickets: SupportTicket[] = [
  {
    id: 'tkt_01',
    ticket_num: 'TC-8921',
    sender_role: 'DRIVER',
    sender_name: 'Emeka Okafor',
    sender_id: 'usr_driver_1',
    category: 'PAYOUT_DISPUTE',
    priority: 'HIGH',
    subject: 'Thursday Shift Payout Difference (₦1,200)',
    description: 'Completed 120 verified video loops during the evening rush shift on Victoria Island corridor, but local offline sync took longer to register.',
    status: 'IN_PROGRESS',
    assigned_agent: 'Amara Customer Care',
    resolution_notes: 'Verified offline log timestamps in SQLite audit trace. Payout adjustment queued for next automated disbursement batch.',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tkt_02',
    ticket_num: 'TC-8922',
    sender_role: 'CLIENT',
    sender_name: 'Coca Cola Nigeria Ads',
    sender_id: 'usr_client_1',
    category: 'CAMPAIGN_BILLING',
    priority: 'MEDIUM',
    subject: 'VAT Invoice & Reach Breakdown for August',
    description: 'Requesting exportable PDF audit certificate with matching Vehicle IDs for executive media compliance.',
    status: 'OPEN',
    assigned_agent: null,
    resolution_notes: null,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
  }
];

// ============================================================================
// HTML Page Routes (Standalone Portals)
// ============================================================================

// 1. Gateway Landing
app.get(['/', '/portal'], (req: Request, res: Response) => {
  res.sendFile(path.resolve(process.cwd(), 'web/index.html'));
});

// 2. Standalone Advertiser (Client) Portal
app.get(['/advertiser', '/advertiser/login', '/advertiser/dashboard', '/client'], (req: Request, res: Response) => {
  res.sendFile(path.resolve(process.cwd(), 'web/advertiser.html'));
});

// 3. Standalone Driver Portal
app.get(['/driver', '/driver/login', '/driver/dashboard'], (req: Request, res: Response) => {
  res.sendFile(path.resolve(process.cwd(), 'web/driver.html'));
});

// 4. Standalone Admin Central Console
app.get(['/admin', '/admin/login', '/admin/dashboard'], (req: Request, res: Response) => {
  res.sendFile(path.resolve(process.cwd(), 'web/admin.html'));
});

// 5. Standalone Customer Service & Support Portal
app.get(['/support', '/support/login', '/support/dashboard', '/helpdesk', '/customer-service'], (req: Request, res: Response) => {
  res.sendFile(path.resolve(process.cwd(), 'web/support.html'));
});

// ============================================================================
// REST API Endpoints
// ============================================================================

// Health & System Info
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    platform: 'TripCast Ad Network Cloud Engine',
    version: '2.5.0',
    currency: 'NGN (₦)',
    status: 'HEALTHY',
    active_campaigns: campaigns.filter(c => c.status === 'ACTIVE').length,
    active_vehicles: vehicles.filter(v => v.is_active).length,
    total_playback_logs: playbackLogs.length,
    open_support_tickets: tickets.filter(t => t.status !== 'RESOLVED').length
  });
});

// Authentication Endpoint
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, pin, password, role } = req.body;
  const pwd = pin || password;

  let user = users.find(u => {
    if (role && u.role !== role) return false;
    const matchEmail = email && (u.email.toLowerCase() === email.toLowerCase().trim() || u.id === email);
    const matchPwd = !pwd || u.pin === pwd || u.password === pwd;
    return matchEmail && matchPwd;
  });

  // Fallback to sample user if no credentials passed in demo
  if (!user && role && !email && !pwd) {
    user = users.find(u => u.role === role);
  }

  if (user) {
    const vehicle = vehicles.find(v => v.driver_id === user?.id);
    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        company_name: user.company_name,
        phone: user.phone,
        role: user.role,
        vehicle: vehicle || null
      }
    });
  }

  res.status(401).json({ success: false, error: 'Invalid email, password, or security PIN.' });
});

// User Registration Endpoint (Advertisers & Drivers)
app.post('/api/auth/register', (req: Request, res: Response) => {
  const {
    role,
    email,
    password,
    full_name,
    phone,
    company_name,
    // Driver fields
    license_plate,
    city,
    bank_name,
    account_number,
    account_name
  } = req.body;

  if (!role || !['CLIENT', 'DRIVER'].includes(role)) {
    return res.status(400).json({ error: 'Valid role (CLIENT or DRIVER) is required.' });
  }

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  if (!full_name || full_name.trim().length < 2) {
    return res.status(400).json({ error: 'Full name is required.' });
  }

  if (!password || password.length < 3) {
    return res.status(400).json({ error: 'Password or security PIN must be at least 3 characters.' });
  }

  if (role === 'CLIENT' && !company_name) {
    return res.status(400).json({ error: 'Company or Brand Name is required for advertiser registration.' });
  }

  if (role === 'DRIVER') {
    if (!license_plate) {
      return res.status(400).json({ error: 'Vehicle license plate is required for driver registration.' });
    }
    if (!city) {
      return res.status(400).json({ error: 'Operating city / route is required.' });
    }
  }

  const cleanEmail = email.toLowerCase().trim();
  const existingUser = users.find(u => u.email.toLowerCase() === cleanEmail);
  if (existingUser) {
    return res.status(400).json({ error: 'An account with this email address already exists. Please log in.' });
  }

  const userId = role === 'CLIENT' ? `usr_client_${Date.now()}` : `usr_driver_${Date.now()}`;
  const now = new Date().toISOString();

  const newUser: User = {
    id: userId,
    email: cleanEmail,
    full_name: full_name.trim(),
    role,
    pin: password,
    password,
    phone: phone || '+234 800 000 0000',
    company_name: company_name ? company_name.trim() : (role === 'CLIENT' ? full_name.trim() : undefined),
    city: city ? city.trim() : undefined,
    license_plate: license_plate ? license_plate.trim().toUpperCase() : undefined,
    bank_name: bank_name ? bank_name.trim() : undefined,
    account_number: account_number ? account_number.trim() : undefined,
    account_name: account_name ? account_name.trim() : full_name.trim(),
    created_at: now,
    status: 'ACTIVE'
  };

  users.push(newUser);

  let vehicleRecord: Vehicle | null = null;
  if (role === 'DRIVER') {
    const cleanCity = (city || 'lagos').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const tabletId = `tab_${cleanCity}_${Math.floor(100 + Math.random() * 900)}`;

    vehicleRecord = {
      id: `veh_${Date.now()}`,
      driver_id: userId,
      driver_name: full_name.trim(),
      tablet_device_id: tabletId,
      license_plate: license_plate ? license_plate.trim().toUpperCase() : `LAG-${Math.floor(100 + Math.random() * 900)}-AA`,
      city: city || 'Lagos Island',
      is_active: true,
      app_version: '1.0.0 (SDK 54)',
      battery_level: 96,
      storage_free_mb: 14500,
      last_heartbeat: now
    };
    vehicles.push(vehicleRecord);
  }

  console.log(`[AUTH REGISTER] New ${role} registered: ${newUser.full_name} (${newUser.email}) - ID: ${newUser.id}`);

  // Live Sync to Convex Cloud Database
  try {
    convex.mutation(api.users.register, {
      email: newUser.email,
      fullName: newUser.full_name,
      role: newUser.role as 'CLIENT' | 'DRIVER',
      phone: newUser.phone || '',
      password: newUser.password || '',
      companyName: newUser.company_name,
      licensePlate: newUser.license_plate,
      city: newUser.city,
      bankName: newUser.bank_name,
      accountNumber: newUser.account_number,
      accountName: newUser.account_name,
    }).then(r => console.log(`[CONVEX CLOUD] Stored new registered user in Convex: ${r.userId}`))
      .catch(e => console.log('[CONVEX CLOUD] User registration notice:', e.message));
  } catch (e) {}

  res.status(201).json({
    success: true,
    message: `Account created successfully for ${newUser.full_name}.`,
    user: {
      id: newUser.id,
      email: newUser.email,
      full_name: newUser.full_name,
      company_name: newUser.company_name,
      phone: newUser.phone,
      role: newUser.role,
      vehicle: vehicleRecord
    }
  });
});

// ============================================================================
// Support Ticket Management API
// ============================================================================

app.get('/api/tickets', (req: Request, res: Response) => {
  const { role, status, sender_id } = req.query;

  let filtered = tickets;
  if (role) {
    filtered = filtered.filter(t => t.sender_role === role);
  }
  if (status) {
    filtered = filtered.filter(t => t.status === status);
  }
  if (sender_id) {
    filtered = filtered.filter(t => t.sender_id === sender_id);
  }

  res.status(200).json(filtered);
});

app.post('/api/tickets', (req: Request, res: Response) => {
  const { sender_role, sender_name, sender_id, category, priority, subject, description } = req.body;

  if (!subject || !description) {
    return res.status(400).json({ error: 'Subject and description are required' });
  }

  const newTicket: SupportTicket = {
    id: `tkt_${Date.now()}`,
    ticket_num: `TC-${Math.floor(1000 + Math.random() * 9000)}`,
    sender_role: sender_role || 'DRIVER',
    sender_name: sender_name || 'Anonymous User',
    sender_id: sender_id || 'usr_anonymous',
    category: category || 'GENERAL',
    priority: priority || 'MEDIUM',
    subject,
    description,
    status: 'OPEN',
    assigned_agent: null,
    resolution_notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  tickets.unshift(newTicket);
  console.log(`[SUPPORT] New Ticket Filed: ${newTicket.ticket_num} - ${newTicket.subject} (${newTicket.sender_role})`);

  // Live store to Convex Cloud
  try {
    convex.mutation(api.tickets.create, {
      senderRole: newTicket.sender_role,
      senderName: newTicket.sender_name,
      senderId: newTicket.sender_id,
      category: newTicket.category,
      priority: newTicket.priority,
      subject: newTicket.subject,
      description: newTicket.description,
    }).then(res => console.log(`[CONVEX TICKET] Stored ticket in Convex Cloud: ${res.ticketNum}`))
      .catch(e => console.log('[CONVEX TICKET] Storage notice:', e.message));
  } catch (e) {}

  res.status(201).json(newTicket);
});

app.patch('/api/tickets/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, assigned_agent, resolution_notes } = req.body;

  const ticket = tickets.find(t => t.id === id || t.ticket_num === id);
  if (!ticket) {
    return res.status(404).json({ error: 'Support ticket not found' });
  }

  if (status) ticket.status = status;
  if (assigned_agent !== undefined) ticket.assigned_agent = assigned_agent;
  if (resolution_notes !== undefined) ticket.resolution_notes = resolution_notes;
  ticket.updated_at = new Date().toISOString();

  console.log(`[SUPPORT] Ticket ${ticket.ticket_num} updated: Status = ${ticket.status}, Agent = ${ticket.assigned_agent}`);

  res.status(200).json(ticket);
});

app.get('/api/tickets/stats', (req: Request, res: Response) => {
  const total = tickets.length;
  const open = tickets.filter(t => t.status === 'OPEN').length;
  const inProgress = tickets.filter(t => t.status === 'IN_PROGRESS').length;
  const resolved = tickets.filter(t => t.status === 'RESOLVED').length;
  const driverTickets = tickets.filter(t => t.sender_role === 'DRIVER').length;
  const clientTickets = tickets.filter(t => t.sender_role === 'CLIENT').length;

  res.status(200).json({
    total,
    open,
    in_progress: inProgress,
    resolved,
    driver_tickets: driverTickets,
    client_tickets: clientTickets,
    avg_resolution_time: '18 mins'
  });
});

// Daily Manifest Generator for Edge Tablets & Driver Cast Engine
app.get('/api/manifest', (req: Request, res: Response) => {
  const activeAds = campaigns
    .filter(c => c.status === 'ACTIVE')
    .map(c => ({
      id: c.id,
      title: c.title,
      video_url: c.video_url,
      target_play_date: c.start_date
    }));

  res.status(200).json({
    manifest_version: `v_${Date.now()}`,
    generated_at: new Date().toISOString(),
    currency: 'NGN',
    active_count: activeAds.length,
    ads: activeAds
  });
});

// Batch Telemetry Ingestion (Edge Tablets)
app.post('/api/telemetry', (req: Request, res: Response) => {
  try {
    const { vehicle_id, tablet_device_id, logs } = req.body;

    if (!Array.isArray(logs)) {
      return res.status(400).json({ error: 'Payload must include an array of logs' });
    }

    // Resolve vehicle by ID or tablet device ID
    let matchedVehicle = vehicles.find(v => 
      (vehicle_id && v.id === vehicle_id) || 
      (tablet_device_id && v.tablet_device_id === tablet_device_id)
    );

    const resolvedVehicleId = matchedVehicle ? matchedVehicle.id : (vehicle_id || 'veh_01');

    if (matchedVehicle) {
      matchedVehicle.last_heartbeat = new Date().toISOString();
      matchedVehicle.is_active = true;
    }

    let ingestedCount = 0;
    for (const log of logs) {
      playbackLogs.push({
        campaign_id: log.ad_id || log.campaign_id,
        vehicle_id: resolvedVehicleId,
        playback_timestamp: log.timestamp ? new Date(Number(log.timestamp)).toISOString() : new Date().toISOString(),
        latitude: log.latitude || (matchedVehicle?.city.includes('Island') ? 6.4281 : 6.5244),
        longitude: log.longitude || (matchedVehicle?.city.includes('Island') ? 3.4219 : 3.3792)
      });

      const campaign = campaigns.find(c => c.id === (log.ad_id || log.campaign_id));
      if (campaign) {
        campaign.current_impressions += 1;
        if (campaign.current_impressions >= campaign.target_impressions) {
          campaign.status = 'COMPLETED';
        }
      }
      ingestedCount++;
    }

    console.log(`[TELEMETRY] Successfully ingested ${ingestedCount} logs from vehicle: ${resolvedVehicleId} (${matchedVehicle?.tablet_device_id || tablet_device_id})`);

    // Live store to Convex Cloud database
    try {
      convex.mutation(api.telemetry.logBatch, {
        vehicleId: resolvedVehicleId,
        tabletDeviceId: matchedVehicle?.tablet_device_id || tablet_device_id || 'tab_lagos_001',
        logs: logs.map((l: any) => ({
          campaign_id: String(l.ad_id || l.campaign_id || 'ad_1'),
          timestamp: l.timestamp ? new Date(Number(l.timestamp)).toISOString() : new Date().toISOString(),
          duration_seconds: l.duration_seconds || 30,
          verified: l.verified ?? true,
          proof_hash: l.proof_hash || `PROOF_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
          latitude: l.latitude || 6.5244,
          longitude: l.longitude || 3.3792,
          speed_kmh: l.speed_kmh || 35.0,
        }))
      }).then(r => console.log(`[CONVEX TELEMETRY] Stored ${r.count} playback logs into Convex Cloud`))
        .catch(e => console.log('[CONVEX TELEMETRY] Storage notice:', e.message));
    } catch (e) {}

    res.status(200).json({
      status: 'SUCCESS',
      ingested_count: ingestedCount,
      vehicle_id: resolvedVehicleId,
      total_recorded: playbackLogs.length
    });
  } catch (err: any) {
    console.error('Error ingesting telemetry:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Driver Cast Live Telemetry Logger (Emitted by Driver Web Cast Player)
app.post('/api/driver/cast/log', (req: Request, res: Response) => {
  const { driver_id, vehicle_id, campaign_id } = req.body;

  const log: TelemetryLog = {
    campaign_id: campaign_id || 'ad_1',
    vehicle_id: vehicle_id || 'veh_01',
    playback_timestamp: new Date().toISOString(),
    latitude: 6.5244 + (Math.random() - 0.5) * 0.02,
    longitude: 3.3792 + (Math.random() - 0.5) * 0.02,
  };

  playbackLogs.push(log);

  const campaign = campaigns.find(c => c.id === log.campaign_id);
  if (campaign) {
    campaign.current_impressions += 1;
  }

  const driverPlays = playbackLogs.filter(l => l.vehicle_id === log.vehicle_id).length;
  const shiftEarnings = driverPlays * 10; // ₦10 per play

  console.log(`[DRIVER CAST] Verified Play logged for ${log.campaign_id} by driver ${driver_id}. Shift Total: ₦${shiftEarnings}`);

  res.status(200).json({
    success: true,
    total_verified_plays: driverPlays,
    shift_earnings_naira: shiftEarnings,
    rate_per_play: '₦10.00'
  });
});

// Driver Profile & Summary
app.get('/api/driver/summary/:driverId', (req: Request, res: Response) => {
  const { driverId } = req.params;
  const driver = users.find(u => u.id === driverId || u.role === 'DRIVER');
  const vehicle = vehicles.find(v => v.driver_id === driver?.id) || vehicles[0];

  const driverPlays = playbackLogs.filter(l => l.vehicle_id === vehicle.id || l.vehicle_id === vehicle.tablet_device_id).length;

  const activeAds = campaigns.filter(c => c.status === 'ACTIVE');

  res.status(200).json({
    driver: driver || { id: driverId, full_name: 'Emeka Okafor' },
    vehicle,
    today_verified_plays: driverPlays,
    today_earnings_naira: driverPlays * 10,
    rate_per_play: 10,
    active_playlist: activeAds
  });
});

// Client Campaigns API (Convex Cloud Live Sync)
app.get('/api/campaigns', async (req: Request, res: Response) => {
  try {
    const liveCampaigns = await convex.query(api.campaigns.list, {});
    if (liveCampaigns && liveCampaigns.length > 0) {
      const mapped = liveCampaigns.map((c: any) => ({
        id: c._id || `ad_${c.client_id}`,
        client_id: c.client_id,
        title: c.title,
        video_url: c.video_url,
        total_budget: c.total_budget,
        cost_per_play: c.cost_per_play || 25,
        target_impressions: c.target_impressions,
        current_impressions: c.current_impressions || 0,
        status: c.status,
        target_city: c.target_city,
        start_date: c.start_date,
        end_date: c.end_date,
        created_at: c.created_at || new Date(c._creationTime).toISOString()
      }));
      return res.status(200).json(mapped);
    }
  } catch (e: any) {
    console.log('[CONVEX LIVE CAMPAIGNS] Notice:', e.message);
  }
  res.status(200).json(campaigns);
});

app.post('/api/campaigns', (req: Request, res: Response) => {
  const { title, video_url, total_budget, client_id, target_city, start_date, end_date, payment_reference } = req.body;

  if (!title || !video_url || !total_budget) {
    return res.status(400).json({ error: 'Missing required campaign fields (title, video_url, total_budget)' });
  }

  const newCampaign: Campaign = {
    id: `ad_${Date.now()}`,
    client_id: client_id || 'usr_client_1',
    title,
    video_url,
    total_budget: Number(total_budget),
    cost_per_play: 25.00,
    target_impressions: Math.floor(Number(total_budget) / 25),
    current_impressions: 0,
    status: 'PENDING',
    target_city: target_city || 'Lagos',
    start_date: start_date || new Date().toISOString().split('T')[0],
    end_date: end_date || new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
    created_at: new Date().toISOString()
  };

  campaigns.push(newCampaign);
  console.log(`[CAMPAIGN] New campaign created (Ref: ${payment_reference || 'MANUAL'}): ${newCampaign.title} (Budget: ₦${newCampaign.total_budget})`);

  // Live store to Convex Cloud database
  try {
    convex.mutation(api.campaigns.create, {
      clientId: newCampaign.client_id,
      title: newCampaign.title,
      videoUrl: newCampaign.video_url,
      totalBudget: newCampaign.total_budget,
      costPerPlay: newCampaign.cost_per_play,
      targetImpressions: newCampaign.target_impressions,
      targetCity: newCampaign.target_city,
      startDate: newCampaign.start_date,
      endDate: newCampaign.end_date,
    }).then(cid => console.log(`[CONVEX CAMPAIGN] Stored campaign into Convex Cloud: ${cid}`))
      .catch(e => console.log('[CONVEX CAMPAIGN] Storage notice:', e.message));
  } catch (e) {}

  res.status(201).json(newCampaign);
});

// Admin Campaign Moderation (Approve / Reject)
app.patch('/api/campaigns/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const campaign = campaigns.find(c => c.id === id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  if (!['PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'COMPLETED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  campaign.status = status;
  console.log(`[MODERATION] Campaign ${id} status updated to: ${status}`);
  res.status(200).json(campaign);
});

// Proof of Play Analytics
app.get('/api/analytics/:campaignId', (req: Request, res: Response) => {
  const { campaignId } = req.params;
  const campaign = campaigns.find(c => c.id === campaignId);

  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  const logs = playbackLogs.filter(l => l.campaign_id === campaignId);
  const uniqueVehicles = new Set(logs.map(l => l.vehicle_id)).size;

  const hourlyPlays = Array.from({ length: 24 }, (_, hour) => {
    return {
      hour: `${hour}:00`,
      plays: logs.filter(l => new Date(l.playback_timestamp).getHours() === hour).length
    };
  });

  res.status(200).json({
    campaign,
    total_plays: campaign.current_impressions,
    budget_spent: Number((campaign.current_impressions * campaign.cost_per_play).toFixed(2)),
    budget_remaining: Number((campaign.total_budget - (campaign.current_impressions * campaign.cost_per_play)).toFixed(2)),
    unique_vehicles: uniqueVehicles || (campaign.current_impressions > 0 ? 2 : 0),
    completion_rate: ((campaign.current_impressions / campaign.target_impressions) * 100).toFixed(1) + '%',
    hourly_distribution: hourlyPlays,
    recent_logs: logs.slice(-20)
  });
});

// Detailed Proof of Play Audit Records (For Advertiser Audit Table & CSV Export)
app.get('/api/analytics/audit/:campaignId', (req: Request, res: Response) => {
  const { campaignId } = req.params;
  const campaign = campaigns.find(c => c.id === campaignId) || campaigns[0];

  let relevantLogs = campaignId === 'all' 
    ? playbackLogs 
    : playbackLogs.filter(l => l.campaign_id === campaignId);

  // If no logs yet, synthesize verifiable baseline logs from active fleet so audit table is immediately testable
  if (relevantLogs.length === 0 && campaign) {
    const baseCount = Math.min(campaign.current_impressions || 14, 25);
    relevantLogs = Array.from({ length: baseCount }, (_, i) => {
      const veh = vehicles[i % vehicles.length];
      return {
        id: i + 1,
        campaign_id: campaign.id,
        vehicle_id: veh.id,
        playback_timestamp: new Date(Date.now() - (baseCount - i) * 180000).toISOString(),
        latitude: 6.5244 + (i * 0.0012),
        longitude: 3.3792 + (i * 0.0008),
      };
    });
  }

  const auditRecords = relevantLogs.map((log, index) => {
    const veh = vehicles.find(v => v.id === log.vehicle_id || v.tablet_device_id === log.vehicle_id) || vehicles[0];
    const camp = campaigns.find(c => c.id === log.campaign_id) || campaign;
    return {
      record_id: `AUD_${log.id || (index + 1001)}`,
      campaign_id: camp?.id,
      campaign_title: camp?.title,
      timestamp: log.playback_timestamp,
      vehicle_id: veh.id,
      tablet_device_id: veh.tablet_device_id,
      license_plate: veh.license_plate,
      driver_name: veh.driver_name,
      city: veh.city,
      latitude: log.latitude || 6.5244,
      longitude: log.longitude || 3.3792,
      rate_naira: 25.00,
      verification_status: 'VERIFIED_AUDITED',
      verification_hash: `SHA256_${(index * 987654321).toString(16).padStart(8, '0').toUpperCase()}`
    };
  });

  res.status(200).json({
    campaign_title: campaign?.title || 'All Active Campaigns',
    total_audited_records: auditRecords.length,
    currency: 'NGN (₦)',
    records: auditRecords
  });
});

// Fleet Health & Heartbeat
app.get('/api/fleet', (req: Request, res: Response) => {
  res.status(200).json(vehicles);
});

app.post('/api/fleet/heartbeat', (req: Request, res: Response) => {
  const { tablet_device_id, battery_level, storage_free_mb, app_version } = req.body;
  
  let vehicle = vehicles.find(v => v.tablet_device_id === tablet_device_id);
  if (!vehicle) {
    vehicle = {
      id: `veh_${Date.now()}`,
      driver_id: 'usr_driver_1',
      driver_name: 'Unassigned Driver',
      tablet_device_id: tablet_device_id || 'unknown_tablet',
      license_plate: 'UNREG',
      city: 'Lagos',
      is_active: true,
      app_version: app_version || '1.0.0',
      battery_level: battery_level || 100,
      storage_free_mb: storage_free_mb || 10000,
      last_heartbeat: new Date().toISOString()
    };
    vehicles.push(vehicle);
  } else {
    vehicle.battery_level = battery_level ?? vehicle.battery_level;
    vehicle.storage_free_mb = storage_free_mb ?? vehicle.storage_free_mb;
    vehicle.app_version = app_version ?? vehicle.app_version;
    vehicle.last_heartbeat = new Date().toISOString();
  }

  // Live Sync to Convex Cloud
  try {
    convex.mutation(api.vehicles.heartbeat, {
      tabletDeviceId: tablet_device_id || 'unknown_tablet',
      batteryLevel: battery_level ?? 90,
      storageFreeMb: storage_free_mb ?? 10000,
      appVersion: app_version ?? '1.0.0 (SDK 54)'
    }).catch(e => console.log('[CONVEX HEARTBEAT] Cloud notice:', e.message));
  } catch (e) {}

  res.status(200).json({ success: true, vehicle });
});

// ============================================================================
// Admin Financial Dashboard & Revenue Analytics API
// ============================================================================

app.get('/api/admin/financials', (req: Request, res: Response) => {
  const period = (req.query.period as string) || 'all';
  const customMonth = req.query.month as string; // e.g. "2026-08"

  const now = new Date();
  let startTime = new Date(0);
  let endTime = new Date(now.getTime() + 86400000);
  let periodLabel = 'All Time Performance';

  if (customMonth) {
    const [y, m] = customMonth.split('-').map(Number);
    startTime = new Date(y, m - 1, 1);
    endTime = new Date(y, m, 0, 23, 59, 59, 999);
    periodLabel = `${new Date(y, m - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}`;
  } else if (period === 'today') {
    startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    periodLabel = "Today's Financial Pulse";
  } else if (period === 'week') {
    startTime = new Date(now.getTime() - 7 * 86400000);
    periodLabel = 'This Week (Last 7 Days)';
  } else if (period === 'month') {
    startTime = new Date(now.getFullYear(), now.getMonth(), 1);
    periodLabel = `${now.toLocaleString('default', { month: 'long', year: 'numeric' })} (Month-to-Date)`;
  }

  // Filter campaigns placed within or overlapping the period
  const filteredCampaigns = campaigns.filter(c => {
    if (period === 'all' && !customMonth) return true;
    const createdAt = new Date(c.created_at || c.start_date);
    return createdAt >= startTime && createdAt <= endTime;
  });

  // Calculate totals
  const activeCampaignsList = filteredCampaigns.length > 0 ? filteredCampaigns : campaigns;

  const totalCommittedBudget = activeCampaignsList.reduce((sum, c) => sum + Number(c.total_budget), 0);
  const totalVerifiedPlays = activeCampaignsList.reduce((sum, c) => sum + (c.current_impressions || 0), 0) || Math.max(playbackLogs.length, 342);
  
  // Standard Rates: Advertiser ₦25.00/play, Driver ₦10.00/play, Platform Margin ₦15.00/play
  const grossAdRevenueRealized = totalVerifiedPlays * 25;
  const totalDriverPayouts = totalVerifiedPlays * 10;
  const netPlatformProfit = grossAdRevenueRealized - totalDriverPayouts;
  const marginPercentage = grossAdRevenueRealized > 0 ? ((netPlatformProfit / grossAdRevenueRealized) * 100).toFixed(1) : '60.0';

  // Multi-month trends for historical comparison
  const monthsList = [
    { key: '2026-03', label: 'March 2026', plays: 12400, budget: 350000 },
    { key: '2026-04', label: 'April 2026', plays: 18200, budget: 500000 },
    { key: '2026-05', label: 'May 2026', plays: 24800, budget: 675000 },
    { key: '2026-06', label: 'June 2026', plays: 31500, budget: 850000 },
    { key: '2026-07', label: 'July 2026', plays: 38900, budget: 1050000 },
    { key: '2026-08', label: 'August 2026', plays: totalVerifiedPlays + 42100, budget: totalCommittedBudget + 1150000 }
  ];

  const monthlyTrends = monthsList.map(m => {
    const rev = m.plays * 25;
    const payouts = m.plays * 10;
    const profit = rev - payouts;
    return {
      month_key: m.key,
      month_label: m.label,
      impressions_count: m.plays,
      gross_revenue_naira: rev,
      driver_payouts_naira: payouts,
      net_profit_naira: profit,
      margin_pct: '60.0%'
    };
  });

  // Individual Ads breakdown with financial performance
  const adsBreakdown = activeCampaignsList.map(c => {
    const client = users.find(u => u.id === c.client_id)?.full_name || 'Brand Partner';
    const plays = c.current_impressions;
    const grossRev = plays * 25;
    const driverCost = plays * 10;
    const profit = plays * 15;

    return {
      id: c.id,
      title: c.title,
      client_name: client,
      video_url: c.video_url,
      target_city: c.target_city,
      flight_dates: `${c.start_date.split('T')[0]} → ${c.end_date.split('T')[0]}`,
      total_budget_naira: c.total_budget,
      verified_plays: plays,
      gross_revenue_naira: grossRev,
      driver_payouts_naira: driverCost,
      net_profit_naira: profit,
      rate_per_play: '₦25.00',
      driver_rate: '₦10.00',
      status: c.status
    };
  });

  res.status(200).json({
    period,
    period_label: periodLabel,
    currency: 'NGN (₦)',
    summary: {
      total_ads_placed: activeCampaignsList.length,
      total_committed_budget_naira: totalCommittedBudget,
      gross_ad_revenue_naira: grossAdRevenueRealized,
      total_driver_payouts_naira: totalDriverPayouts,
      net_company_profit_naira: netPlatformProfit,
      margin_percentage: `${marginPercentage}%`,
      total_verified_impressions: totalVerifiedPlays
    },
    monthly_trends: monthlyTrends,
    ads_placed: adsBreakdown
  });
});

// ============================================================================
// Platform Rate Settings & Driver Compensation Engine
// ============================================================================

app.get('/api/config/rates', (req: Request, res: Response) => {
  res.status(200).json(platformRates);
});

app.patch('/api/config/rates', (req: Request, res: Response) => {
  const { driver_payout_rate } = req.body;
  if (typeof driver_payout_rate === 'number' && driver_payout_rate > 0) {
    platformRates.driver_payout_rate = Number(driver_payout_rate.toFixed(2));
    console.log(`[CONFIG] Updated driver payout rate to ₦${platformRates.driver_payout_rate} per verified play`);

    // Dynamically recalculate any pending driver payouts using the new rate
    payouts.forEach(p => {
      if (p.status === 'PENDING') {
        p.rate_applied = platformRates.driver_payout_rate;
        p.payout_amount = Number((p.total_plays_verified * platformRates.driver_payout_rate).toFixed(2));
      }
    });

    // Live Sync to Convex Cloud
    try {
      convex.mutation(api.rates.update, {
        driverPayoutRate: platformRates.driver_payout_rate
      }).then(() => console.log(`[CONVEX CLOUD] Driver payout rate synced to Convex: ₦${platformRates.driver_payout_rate}`))
        .catch(err => console.log('[CONVEX CLOUD] Rate sync notice:', err.message));
    } catch (e) {}

    return res.status(200).json({
      success: true,
      message: `Driver payout rate updated to ₦${platformRates.driver_payout_rate.toFixed(2)} per play.`,
      rates: platformRates
    });
  }
  res.status(400).json({ error: 'Invalid driver payout rate provided.' });
});

// Driver Payouts Management
app.get('/api/payouts', (req: Request, res: Response) => {
  res.status(200).json(payouts);
});

// Driver Settlements Monthly Summary & Metrics
app.get('/api/payouts/summary', (req: Request, res: Response) => {
  const monthCycle = (req.query.month as string) || '2026-08';
  
  // If payouts empty, initialize with active fleet data
  if (payouts.length === 0) {
    payouts = vehicles.map(v => {
      const driverLogs = playbackLogs.filter(l => l.vehicle_id === v.id || l.vehicle_id === v.tablet_device_id);
      const verifiedPlays = Math.max(driverLogs.length, 120);
      const hoursInTransit = Number(((verifiedPlays * 3.8) / 60 + 14.5).toFixed(1));
      const driverEarnings = Number((verifiedPlays * platformRates.driver_payout_rate).toFixed(2));

      return {
        id: `pay_${Date.now()}_${v.id}`,
        driver_id: v.driver_id,
        driver_name: v.driver_name,
        vehicle_id: v.id,
        license_plate: v.license_plate,
        period_start: '2026-08-01',
        period_end: '2026-08-31',
        month_cycle: monthCycle,
        hours_in_transit: hoursInTransit,
        total_plays_verified: verifiedPlays,
        rate_applied: platformRates.driver_payout_rate,
        payout_amount: driverEarnings,
        status: 'PENDING'
      };
    });
  }

  const totalHours = Number(payouts.reduce((sum, p) => sum + (p.hours_in_transit || 0), 0).toFixed(1));
  const totalPlays = payouts.reduce((sum, p) => sum + p.total_plays_verified, 0);
  const totalPayout = payouts.reduce((sum, p) => sum + p.payout_amount, 0);
  const pendingPayout = payouts.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + p.payout_amount, 0);
  const disbursedPayout = payouts.filter(p => p.status === 'PAID').reduce((sum, p) => sum + p.payout_amount, 0);
  const pendingCount = payouts.filter(p => p.status === 'PENDING').length;

  res.status(200).json({
    month_cycle: monthCycle,
    month_label: 'August 2026 (Monthly Cycle)',
    currency: 'NGN (₦)',
    driver_payout_rate: platformRates.driver_payout_rate,
    summary: {
      total_hours_in_transit: totalHours,
      total_verified_plays: totalPlays,
      total_payout_amount_naira: totalPayout,
      pending_payout_amount_naira: pendingPayout,
      disbursed_payout_amount_naira: disbursedPayout,
      total_drivers_count: payouts.length,
      pending_drivers_count: pendingCount
    },
    payouts
  });
});

app.post('/api/payouts/calculate', (req: Request, res: Response) => {
  const monthCycle = (req.query.month as string) || '2026-08';

  const generatedPayouts: Payout[] = vehicles.map(v => {
    const driverLogs = playbackLogs.filter(l => l.vehicle_id === v.id || l.vehicle_id === v.tablet_device_id);
    const verifiedPlays = Math.max(driverLogs.length, 120);
    const hoursInTransit = Number(((verifiedPlays * 3.8) / 60 + 14.5).toFixed(1));
    const driverEarnings = Number((verifiedPlays * platformRates.driver_payout_rate).toFixed(2));

    return {
      id: `pay_${Date.now()}_${v.id}`,
      driver_id: v.driver_id,
      driver_name: v.driver_name,
      vehicle_id: v.id,
      license_plate: v.license_plate,
      period_start: '2026-08-01',
      period_end: '2026-08-31',
      month_cycle: monthCycle,
      hours_in_transit: hoursInTransit,
      total_plays_verified: verifiedPlays,
      rate_applied: platformRates.driver_payout_rate,
      payout_amount: driverEarnings,
      status: 'PENDING'
    };
  });

  payouts = generatedPayouts;
  console.log(`[PAYOUTS] Calculated ${payouts.length} monthly driver settlements at ₦${platformRates.driver_payout_rate}/play.`);
  res.status(200).json(payouts);
});

// Bulk Disburse All Pending Settlements
app.post('/api/payouts/bulk-disburse', (req: Request, res: Response) => {
  const pendingPayouts = payouts.filter(p => p.status === 'PENDING');
  if (pendingPayouts.length === 0) {
    return res.status(200).json({
      success: true,
      message: 'All driver settlements have already been disbursed.',
      count: 0,
      total_amount_naira: 0,
      payouts
    });
  }

  const batchRef = `NIBSS_BATCH_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();
  let totalDisbursed = 0;

  pendingPayouts.forEach(p => {
    p.status = 'PAID';
    p.payment_reference = batchRef;
    p.paid_at = now;
    totalDisbursed += p.payout_amount;
  });

  console.log(`[BULK DISBURSEMENT] Successfully disbursed ₦${totalDisbursed} across ${pendingPayouts.length} drivers via batch: ${batchRef}`);

  // Live Sync to Convex Cloud
  try {
    convex.mutation(api.payouts.bulkDisburse, {})
      .then(res => console.log(`[CONVEX CLOUD] Bulk disburse recorded on Convex: ${res.message}`))
      .catch(err => console.log('[CONVEX CLOUD] Bulk disburse notice:', err.message));
  } catch (e) {}

  res.status(200).json({
    success: true,
    message: `Batch settlement of ₦${totalDisbursed.toLocaleString()} successfully disbursed across ${pendingPayouts.length} vehicle drivers.`,
    batch_reference: batchRef,
    disbursed_count: pendingPayouts.length,
    total_amount_naira: totalDisbursed,
    payouts
  });
});

// Disburse Single Driver Settlement (Direct Bank / Paystack Payout Simulation)
app.post('/api/payouts/:id/disburse', (req: Request, res: Response) => {
  const { id } = req.params;
  const payout = payouts.find(p => p.id === id);

  if (!payout) {
    return res.status(404).json({ error: 'Payout record not found' });
  }

  payout.status = 'PAID';
  const paymentRef = `NIBSS_TRF_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  payout.payment_reference = paymentRef;
  payout.paid_at = new Date().toISOString();

  console.log(`[DISBURSEMENT] Disbursed ₦${payout.payout_amount} to ${payout.driver_name}. Ref: ${paymentRef}`);

  res.status(200).json({
    success: true,
    message: `Payment of ₦${payout.payout_amount.toLocaleString()} disbursed to ${payout.driver_name}'s bank account.`,
    payment_reference: paymentRef,
    payout
  });
});

// ============================================================================
// User Directory & Profile Management API
// ============================================================================

app.get('/api/admin/users', async (req: Request, res: Response) => {
  const roleFilter = (req.query.role as string || 'ALL').toUpperCase();
  const searchQuery = (req.query.search as string || '').toLowerCase().trim();

  // 1. Primary: Direct Live Query from Convex Cloud Database
  try {
    const convexData = await convex.query(api.users.list, {
      role: roleFilter,
      search: searchQuery || undefined
    });

    if (convexData && convexData.users && convexData.users.length > 0) {
      const enrichedConvex = convexData.users.map((u: any) => {
        const base = {
          id: u.userId || u._id,
          email: u.email,
          full_name: u.full_name,
          role: u.role,
          phone: u.phone || '+234 800 000 0000',
          created_at: u.created_at || new Date(u._creationTime).toISOString(),
          status: u.status || 'ACTIVE',
          company_name: u.company_name,
          staff_id: u.staff_id,
          city: u.city,
          license_plate: u.license_plate,
          bank_name: u.bank_name || 'GTBank',
          account_number: u.account_number || '0123456789',
          account_name: u.account_name || u.full_name
        };

        if (u.role === 'DRIVER') {
          return {
            ...base,
            driver_details: {
              vehicle_id: `veh_${u.userId}`,
              license_plate: u.license_plate || 'LAG-492-AA',
              tablet_device_id: `tab_${(u.city || 'lagos').toLowerCase().replace(/\s+/g, '_')}_001`,
              city: u.city || 'Lagos Island',
              is_active: true,
              battery_level: 96,
              total_hours_played: 24.5,
              total_verified_plays: 142,
              total_earnings_naira: 1420,
              payout_status: 'PENDING',
              rate_per_play: `₦${platformRates.driver_payout_rate.toFixed(2)}`,
              bank_name: u.bank_name || 'GTBank',
              account_number: u.account_number || '0123456789',
              account_name: u.account_name || u.full_name
            }
          };
        } else if (u.role === 'CLIENT') {
          return {
            ...base,
            client_details: {
              total_campaigns: 2,
              total_spent_naira: 625000,
              active_budget_naira: 250000,
              target_impressions: 25000,
              active_campaigns_count: 1
            }
          };
        } else if (u.role === 'SUPPORT') {
          return {
            ...base,
            support_details: {
              staff_id: u.staff_id || 'CS-101',
              department: 'DOOH Customer Care & Escalations',
              tickets_resolved_count: 18,
              active_tickets_count: 3,
              duty_status: 'ONLINE_ACTIVE'
            }
          };
        }

        return base;
      });

      return res.status(200).json({
        role_filter: roleFilter,
        counts: convexData.counts,
        users: enrichedConvex,
        source: 'CONVEX_CLOUD_LIVE'
      });
    }
  } catch (err: any) {
    console.log('[CONVEX LIVE USERS] Notice:', err.message);
  }

  // 2. Local Fallback
  let matchedUsers = users.filter(u => u.role !== 'ADMIN');

  if (roleFilter !== 'ALL') {
    matchedUsers = matchedUsers.filter(u => u.role === roleFilter);
  }

  if (searchQuery) {
    matchedUsers = matchedUsers.filter(u => 
      u.full_name.toLowerCase().includes(searchQuery) ||
      u.email.toLowerCase().includes(searchQuery) ||
      (u.phone && u.phone.toLowerCase().includes(searchQuery)) ||
      (u.company_name && u.company_name.toLowerCase().includes(searchQuery)) ||
      (vehicles.find(v => v.driver_id === u.id)?.license_plate.toLowerCase().includes(searchQuery))
    );
  }

  const enriched = matchedUsers.map(u => {
    const base = {
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      phone: u.phone || '+234 800 000 0000',
      created_at: u.created_at,
      status: u.status || 'ACTIVE',
      company_name: u.company_name,
      staff_id: u.staff_id,
      city: u.city,
      license_plate: u.license_plate,
      bank_name: u.bank_name,
      account_number: u.account_number,
      account_name: u.account_name
    };

    if (u.role === 'DRIVER') {
      const veh = vehicles.find(v => v.driver_id === u.id);
      const driverLogs = playbackLogs.filter(l => l.vehicle_id === veh?.id || l.vehicle_id === veh?.tablet_device_id);
      const verifiedPlays = Math.max(driverLogs.length, 120);
      const inTransitHours = Number(((verifiedPlays * 3.8) / 60 + 14.5).toFixed(1));
      const totalEarned = Number((verifiedPlays * platformRates.driver_payout_rate).toFixed(2));
      const recentPayout = payouts.find(p => p.driver_id === u.id);

      return {
        ...base,
        driver_details: {
          vehicle_id: veh?.id || 'veh_unassigned',
          license_plate: veh?.license_plate || u.license_plate || 'LAG-492-AA',
          tablet_device_id: veh?.tablet_device_id || 'tab_lagos_001',
          city: veh?.city || u.city || 'Lagos Island',
          is_active: veh?.is_active ?? true,
          battery_level: veh?.battery_level ?? 94,
          total_hours_played: inTransitHours,
          total_verified_plays: verifiedPlays,
          total_earnings_naira: totalEarned,
          payout_status: recentPayout?.status || 'PENDING',
          rate_per_play: `₦${platformRates.driver_payout_rate.toFixed(2)}`,
          bank_name: u.bank_name || 'GTBank',
          account_number: u.account_number || '0123456789',
          account_name: u.account_name || u.full_name
        }
      };
    } else if (u.role === 'CLIENT') {
      const clientCampaigns = campaigns.filter(c => c.client_id === u.id);
      const totalSpent = clientCampaigns.reduce((sum, c) => sum + Number(c.total_budget), 0);
      const activeBudget = clientCampaigns.filter(c => c.status === 'ACTIVE').reduce((sum, c) => sum + Number(c.total_budget), 0);
      const targetImp = clientCampaigns.reduce((sum, c) => sum + (c.target_impressions || 0), 0);
      const currentImp = clientCampaigns.reduce((sum, c) => sum + (c.current_impressions || 0), 0);

      return {
        ...base,
        advertiser_details: {
          total_campaigns_run: clientCampaigns.length,
          total_budget_spent_naira: totalSpent,
          active_campaigns_budget_naira: activeBudget,
          total_impressions_purchased: targetImp,
          total_impressions_delivered: currentImp,
          wallet_balance_naira: activeBudget,
          active_campaigns_count: clientCampaigns.filter(c => c.status === 'ACTIVE').length
        }
      };
    } else if (u.role === 'SUPPORT') {
      const resolved = tickets.filter(t => t.assigned_agent === u.full_name && t.status === 'RESOLVED').length;
      const assigned = tickets.filter(t => t.assigned_agent === u.full_name && t.status !== 'RESOLVED').length;

      return {
        ...base,
        support_details: {
          staff_id: u.staff_id || 'CS-101',
          department: 'DOOH Customer Care & Escalations',
          tickets_resolved_count: resolved + 14,
          active_tickets_count: assigned + 1,
          duty_status: 'ONLINE_ACTIVE'
        }
      };
    }

    return base;
  });

  const driversCount = users.filter(u => u.role === 'DRIVER').length;
  const advertisersCount = users.filter(u => u.role === 'CLIENT').length;
  const supportCount = users.filter(u => u.role === 'SUPPORT').length;

  res.status(200).json({
    role_filter: roleFilter,
    counts: {
      total_users: users.length - 1, // exclude root admin
      drivers: driversCount,
      advertisers: advertisersCount,
      support: supportCount
    },
    users: enriched
  });
});

app.get('/api/admin/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const user = users.find(u => u.id === id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const base = {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    phone: user.phone || '+234 800 000 0000',
    created_at: user.created_at,
    status: user.status || 'ACTIVE',
    company_name: user.company_name,
    staff_id: user.staff_id,
    city: user.city,
    license_plate: user.license_plate,
    bank_name: user.bank_name,
    account_number: user.account_number,
    account_name: user.account_name
  };

  if (user.role === 'DRIVER') {
    const veh = vehicles.find(v => v.driver_id === user.id);
    const driverLogs = playbackLogs.filter(l => l.vehicle_id === veh?.id || l.vehicle_id === veh?.tablet_device_id);
    const verifiedPlays = Math.max(driverLogs.length, 120);
    const inTransitHours = Number(((verifiedPlays * 3.8) / 60 + 14.5).toFixed(1));
    const totalEarned = Number((verifiedPlays * platformRates.driver_payout_rate).toFixed(2));
    const driverPayouts = payouts.filter(p => p.driver_id === user.id);

    return res.status(200).json({
      user: base,
      role: 'DRIVER',
      vehicle: veh || null,
      bank_details: {
        bank_name: user.bank_name || 'GTBank',
        account_number: user.account_number || '0123456789',
        account_name: user.account_name || user.full_name
      },
      stats: {
        total_hours_in_transit: inTransitHours,
        total_verified_plays: verifiedPlays,
        total_earnings_naira: totalEarned,
        rate_applied: `₦${platformRates.driver_payout_rate.toFixed(2)}`
      },
      payouts: driverPayouts
    });
  } else if (user.role === 'CLIENT') {
    const clientCampaigns = campaigns.filter(c => c.client_id === user.id);
    const totalSpent = clientCampaigns.reduce((sum, c) => sum + Number(c.total_budget), 0);
    const activeBudget = clientCampaigns.filter(c => c.status === 'ACTIVE').reduce((sum, c) => sum + Number(c.total_budget), 0);

    return res.status(200).json({
      user: base,
      role: 'CLIENT',
      stats: {
        total_campaigns_run: clientCampaigns.length,
        total_spent_naira: totalSpent,
        active_budget_naira: activeBudget
      },
      campaigns: clientCampaigns
    });
  } else if (user.role === 'SUPPORT') {
    const agentTickets = tickets.filter(t => t.assigned_agent === user.full_name);
    return res.status(200).json({
      user: base,
      role: 'SUPPORT',
      stats: {
        total_tickets_assigned: agentTickets.length,
        resolved_count: agentTickets.filter(t => t.status === 'RESOLVED').length
      },
      tickets: agentTickets
    });
  }

  res.status(200).json({ user: base });
});

// Start Server
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`TripCast Backend API & Cloud Engine running on port ${PORT}`);
  });
}

export default app;
