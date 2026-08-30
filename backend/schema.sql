-- ==============================================================================
-- TripCast Production Database Schema (Cloud SQL / PostgreSQL)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users & Roles
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'CLIENT', 'DRIVER')),
    phone_number VARCHAR(50),
    bank_account_number VARCHAR(50),
    bank_code VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Client Ad Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    video_url TEXT NOT NULL,
    total_budget DECIMAL(12, 2) NOT NULL CHECK (total_budget >= 0),
    cost_per_play DECIMAL(12, 2) DEFAULT 25.00,
    target_impressions INTEGER DEFAULT 1000,
    current_impressions INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'COMPLETED')),
    target_city VARCHAR(100) DEFAULT 'All',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Vehicles & Tablet Hardware Fleet
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    tablet_device_id VARCHAR(255) UNIQUE NOT NULL,
    license_plate VARCHAR(50) NOT NULL,
    city VARCHAR(100) DEFAULT 'Lagos',
    is_active BOOLEAN DEFAULT TRUE,
    app_version VARCHAR(20),
    battery_level INTEGER,
    storage_free_mb INTEGER,
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Proof of Play Telemetry Logs (High Volume Ingestion)
CREATE TABLE IF NOT EXISTS playback_logs (
    id BIGSERIAL PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    playback_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    latitude DECIMAL(9, 6),
    longitude DECIMAL(9, 6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Driver Earnings & Settlement Payouts
CREATE TABLE IF NOT EXISTS driver_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_plays_verified INTEGER NOT NULL DEFAULT 0,
    payout_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'PAID', 'FAILED')),
    payment_reference VARCHAR(255),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- Optimized Indexes for Query Performance & Analytics
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_playback_campaign_time ON playback_logs(campaign_id, playback_timestamp);
CREATE INDEX IF NOT EXISTS idx_playback_vehicle_time ON playback_logs(vehicle_id, playback_timestamp);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_device ON vehicles(tablet_device_id);
CREATE INDEX IF NOT EXISTS idx_payouts_driver_status ON driver_payouts(driver_id, status);
